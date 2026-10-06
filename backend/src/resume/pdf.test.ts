import { describe, expect, it } from "vitest";

import { extractPdfText, hasExtractableText } from "./pdf.js";

/**
 * Hand-built minimal PDFs (no fixtures on disk, no network). The builder
 * computes a valid xref table so pdfjs parses deterministically.
 */

function buildPdf(pageTexts: string[][]): Uint8Array {
  const objects: string[] = [];
  // Catalog
  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  // Pages node placeholder (object 2, filled after page objects are known)
  objects.push("__PAGES__");
  const pageNums: number[] = [];
  const contentNums: number[] = [];
  for (const lines of pageTexts) {
    pageNums.push(objects.length + 1);
    contentNums.push(objects.length + 2);
    objects.push("__PAGE__");
    const text = lines
      .map((line, i) => `BT /F1 12 Tf 72 ${720 - i * 20} Td (${escapePdf(line)}) Tj ET`)
      .join("\n");
    objects.push(`<< /Length ${text.length} >>\nstream\n${text}\nendstream`);
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const fontNum = objects.length;
  // Fill Pages + page objects
  const kids = pageNums.map((n) => `${n} 0 R`).join(" ");
  objects[1] = `<< /Type /Pages /Kids [${kids}] /Count ${pageNums.length} >>`;
  pageNums.forEach((pageNum, i) => {
    objects[pageNum - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentNums[i]} 0 R ` +
      `/Resources << /Font << /F1 ${fontNum} 0 R >> >> >>`;
  });
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

function escapePdf(line: string): string {
  return line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

describe("extractPdfText", () => {
  it("extracts text with line order from a single page", async () => {
    const bytes = buildPdf([["Dylan Mascarenhas", "EDUCATION", "CGPA: 8.62/10"]]);
    const pdf = await extractPdfText(bytes);
    expect(pdf.pageCount).toBe(1);
    expect(pdf.pages[0]).toContain("Dylan Mascarenhas");
    expect(pdf.pages[0]).toContain("CGPA: 8.62/10");
    expect(hasExtractableText(pdf)).toBe(true);
  });

  it("preserves page boundaries across pages", async () => {
    const bytes = buildPdf([["Page one header"], ["Page two header"]]);
    const pdf = await extractPdfText(bytes);
    expect(pdf.pageCount).toBe(2);
    expect(pdf.pages).toHaveLength(2);
    expect(pdf.pages[0]).toContain("Page one header");
    expect(pdf.pages[1]).toContain("Page two header");
    expect(pdf.pages[0]).not.toContain("Page two header");
  });

  it("reports no extractable text for an empty document", async () => {
    const bytes = buildPdf([[]]);
    const pdf = await extractPdfText(bytes);
    expect(hasExtractableText(pdf)).toBe(false);
  });

  it("rejects non-PDF bytes", async () => {
    await expect(extractPdfText(new TextEncoder().encode("not a pdf"))).rejects.toThrow();
  });
});
