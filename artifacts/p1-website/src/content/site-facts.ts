export type LocalOffice = {
  slug: string;
  town: string;
  street: string;
  state: string;
  zip: string;
  phone: string;
  hours: string;
  coverage: string;
  lat?: number;
  lng?: number;
};

// Populate the blank values only with owner-verified facts. Components omit
// dependent copy until a complete value is available.
export const siteFacts = {
  legalName: "P1 Land & Property Management",
  gbpName: "P1 Land & Property Management",
  phone: "(704) 221-8928",
  yearsLabel: "close to 30 years",
  hq: { street: "", city: "", state: "", zip: "", lat: null as number | null, lng: null as number | null },
  LICENSE_LIST: "",
  INSURANCE_SUMMARY: "",
  COI_TURNAROUND: "",
  GOOGLE_RATING: "",
  GOOGLE_REVIEW_COUNT: "",
  EQUIPMENT_SUMMARY: "",
  OWNER_NAME: "",
  OWNER_BIO: "",
  offices: [] as LocalOffice[],
} as const;

export const footerBlurb = "P1 Land & Property Management clears, grades, drains, seeds and maintains commercial, industrial and farm property of an acre or more across Upstate South Carolina and the Charlotte region. Licensed and insured in North and South Carolina.";
