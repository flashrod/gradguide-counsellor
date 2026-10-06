import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * George Mason University — Computer Science MS (catalog).
 * GPA 3.00 (last 60 credits), 30-credit program.
 */
export const gmuSource = new CuratedUniversitySource({
  id: "gmu",
  universityName: "George Mason University",
  universityCountry: "USA",
  universityCity: "Fairfax",
  universityWebsite: "https://www.gmu.edu",
  sourceName: "Mason Catalog — Computer Science MS",
  programPages: [
    {
      url: "https://catalog.gmu.edu/colleges-schools/engineering-computing/school-computing/computer-science/computer-science-ms/",
      title: "Computer Science MS",
      programName: "Computer Science MS",
      degreeType: "MS",
      field: "Computer Science",
    },
  ],
});
