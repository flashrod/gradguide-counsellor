import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Missouri S&T — MS Computer Science (catalog).
 * GPA 3.0/4.0, TOEFL 89, 31-credit program.
 */
export const mstSource = new CuratedUniversitySource({
  id: "mst",
  universityName: "Missouri University of Science and Technology",
  universityCountry: "USA",
  universityCity: "Rolla",
  universityWebsite: "https://www.mst.edu",
  sourceName: "Missouri S&T Catalog — MS Computer Science",
  programPages: [
    {
      url: "https://catalog.mst.edu/graduate/graduatedegreeprograms/computerscience/",
      title: "Computer Science MS",
      programName: "Computer Science MS",
      degreeType: "MS",
      field: "Computer Science",
    },
  ],
});
