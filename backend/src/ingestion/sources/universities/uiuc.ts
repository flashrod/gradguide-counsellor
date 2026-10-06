import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * UIUC — Master of Computer Science, MCS (catalog).
 * GPA 3.0 (last 60 hours); English minima live on Graduate College pages
 * (OEAI/campus assessment scores on this page are not IELTS/TOEFL).
 */
export const uiucSource = new CuratedUniversitySource({
  id: "uiuc",
  universityName: "University of Illinois Urbana-Champaign",
  universityCountry: "USA",
  universityCity: "Champaign",
  universityWebsite: "https://illinois.edu",
  sourceName: "UIUC Catalog — Computer Science MCS",
  programPages: [
    {
      url: "https://catalog.illinois.edu/graduate/engineering/computer-science-mcs/",
      title: "Computer Science MCS",
      programName: "Computer Science MCS",
      degreeType: "MCS",
      field: "Computer Science",
      // On-campus length is worded ("one year") with digit figures
      // reserved for online/off-campus maxima ("5 years") — extraction
      // would misattribute the maximum as the standard duration.
      suppressFields: ["duration"],
    },
  ],
});
