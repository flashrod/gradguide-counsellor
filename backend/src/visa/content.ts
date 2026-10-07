/**
 * Curated visa-readiness steps per destination country. Static general
 * guidance for counselling conversations — never legal advice, never
 * deadlines (those belong to counsellor-entered deadline reminders).
 * Content changes ship with the code; per-student progress lives in
 * the visa_checklist table.
 */

export interface VisaStep {
  key: string;
  title: string;
  detail: string;
}

export interface VisaCountry {
  country: string;
  note: string;
  steps: VisaStep[];
}

export const VISA_GUIDE: VisaCountry[] = [
  {
    country: "UK",
    note: "Student route: CAS from a licensed sponsor, then online application.",
    steps: [
      {
        key: "cas",
        title: "Receive the CAS",
        detail: "Confirmation of Acceptance for Studies issued by the university after conditions are met.",
      },
      {
        key: "funds",
        title: "Show maintenance funds",
        detail: "28-day bank balance covering outstanding fees plus living costs.",
      },
      {
        key: "tb",
        title: "TB certificate (if required)",
        detail: "Required for residents of listed countries including India.",
      },
      {
        key: "apply",
        title: "Apply online + IHS",
        detail: "Visa application with Immigration Health Surcharge payment.",
      },
      {
        key: "biometrics",
        title: "Biometrics appointment",
        detail: "VFS/TLS centre visit for fingerprints and photo.",
      },
    ],
  },
  {
    country: "USA",
    note: "F-1 route: I-20 from the university, SEVIS fee, then the consulate interview.",
    steps: [
      {
        key: "i20",
        title: "Receive the I-20",
        detail: "Issued by the university after admission and financial proof.",
      },
      {
        key: "sevis",
        title: "Pay the SEVIS fee",
        detail: "I-901 fee receipt required before the interview.",
      },
      {
        key: "ds160",
        title: "Complete DS-160",
        detail: "Online non-immigrant visa application with confirmation page.",
      },
      {
        key: "funds",
        title: "Prepare funds proof",
        detail: "Bank statements / loan sanction covering first-year costs.",
      },
      {
        key: "interview",
        title: "Consulate interview",
        detail: "In-person interview with passport, I-20, SEVIS receipt, DS-160.",
      },
    ],
  },
  {
    country: "Canada",
    note: "Study permit route: LOA, provincial attestation, then IRCC application.",
    steps: [
      {
        key: "loa",
        title: "Receive the LOA",
        detail: "Letter of Acceptance from a designated learning institution.",
      },
      {
        key: "pal",
        title: "Provincial attestation letter",
        detail: "PAL/TAL from the province, where required for the program level.",
      },
      {
        key: "gic",
        title: "Show funds (GIC route)",
        detail: "Guaranteed Investment Certificate plus first-year fee proof.",
      },
      {
        key: "apply",
        title: "Apply to IRCC",
        detail: "Online study permit application with biometrics.",
      },
      {
        key: "medical",
        title: "Medical exam (if required)",
        detail: "Panel physician exam for stays over six months in many cases.",
      },
    ],
  },
  {
    country: "Germany",
    note: "Student route: admission, blocked account, then the embassy.",
    steps: [
      {
        key: "admission",
        title: "Admission letter",
        detail: "Zulassungsbescheid or enrollment confirmation from the university.",
      },
      {
        key: "blocked",
        title: "Open a blocked account",
        detail: "Sperrkonto funded to the current annual requirement.",
      },
      {
        key: "insurance",
        title: "Health insurance",
        detail: "Incoming cover for the visa, statutory cover after enrollment.",
      },
      {
        key: "apply",
        title: "Embassy application",
        detail: "National visa appointment with admission, funds, and insurance proof.",
      },
      {
        key: "residence",
        title: "Residence permit after arrival",
        detail: "Convert to an Aufenthaltserlaubnis at the local Ausländerbehörde.",
      },
    ],
  },
];

export function countriesFor(preferredCountries: string[]): string[] {
  const known = new Set(VISA_GUIDE.map((g) => g.country));
  const matched = preferredCountries.filter((c) => known.has(c));
  return matched.length > 0 ? matched : VISA_GUIDE.map((g) => g.country);
}
