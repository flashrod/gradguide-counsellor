import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * UT Arlington — MS Computer Science (catalog).
 * GPA 3.0/3.2, TOEFL 83 / IELTS 6.5 with section preferences.
 */
export const utaSource = new CuratedUniversitySource({
  id: "uta",
  universityName: "The University of Texas at Arlington",
  universityCountry: "USA",
  universityCity: "Arlington",
  universityWebsite: "https://www.uta.edu",
  sourceName: "UTA Catalog — MS Computer Science",
  programPages: [
    {
      url: "https://catalog.uta.edu/engineering/computer/graduate/computer-science-thesis-ms/",
      title: "Computer Science MS",
      // Catalog states no program length; the only "year" figure is the
      // 4-year bachelor's prerequisite, not the MS duration.
      suppressFields: ["duration"],
    },
    // NOTE: data-science-ms/ was evaluated and SKIPPED — the page yields
    // identity only, with all requirements behind linked sub-pages.
  ],
});
