import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * UIUC — Master of Computer Science, MCS (catalog).
 * GPA 3.20; English minima live on Graduate College pages, so they stay
 * unknown unless stated here.
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
    },
  ],
});
