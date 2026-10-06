import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

/**
 * PDF text extraction (Milestone 13, Phase 4).
 *
 * pdfjs-dist only — no native dependencies, no file execution. Text is
 * grouped into lines by y-coordinate and pages are preserved as separate
 * strings so section parsing keeps page boundaries. Image-only pages
 * yield empty strings; callers treat a textless document as a failure,
 * never as an empty profile.
 */

export interface PdfText {
  pages: string[];
  pageCount: number;
}

interface TextItem {
  str: string;
  y: number;
  x: number;
}

export async function extractPdfText(bytes: Uint8Array): Promise<PdfText> {
  const doc = await getDocument({ data: bytes, useSystemFonts: true }).promise;
  const pages: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items = (content.items as unknown as { str?: unknown; transform?: unknown }[])
      .filter((item): item is { str: string; transform: number[] } => typeof item.str === "string" && Array.isArray(item.transform))
      .map((item) => ({ str: item.str, y: item.transform[5] ?? 0, x: item.transform[4] ?? 0 }))
      .filter((item: TextItem) => item.str.trim().length > 0);
    // Rows share a y-coordinate; tolerate sub-pixel jitter by bucketing.
    const rows = new Map<number, TextItem[]>();
    for (const item of items) {
      const key = Math.round(item.y * 4) / 4;
      const row = rows.get(key) ?? [];
      row.push(item);
      rows.set(key, row);
    }
    const lines = [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, row]) => row.sort((a, b) => a.x - b.x).map((item) => item.str).join(" "));
    pages.push(lines.join("\n"));
  }
  const destroyable = doc as unknown as { destroy?: () => Promise<void> };
  if (typeof destroyable.destroy === "function") await destroyable.destroy();
  return { pages, pageCount: doc.numPages };
}

/** True when no page yielded usable text (e.g. scanned/image-only PDFs). */
export function hasExtractableText(pdf: PdfText): boolean {
  return pdf.pages.some((page) => page.trim().length > 0);
}
