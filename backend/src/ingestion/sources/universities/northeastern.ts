import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Northeastern University, Khoury College — MS programmes (Boston).
 * Programme pages carry identity, structure, and Fall/Spring terms;
 * detailed requirements live on central admissions pages, so minima
 * stay honestly unknown (PARTIAL tier).
 */
export const northeasternSource = new CuratedUniversitySource({
  id: "northeastern",
  universityName: "Northeastern University",
  universityCountry: "USA",
  universityCity: "Boston",
  universityWebsite: "https://www.northeastern.edu",
  sourceName: "Khoury College — Graduate Programs",
  programPages: [
    {
      url: "https://www.khoury.northeastern.edu/programs/computer-science-ms/",
      title: "Computer Science MS",
    },
    {
      url: "https://www.khoury.northeastern.edu/programs/data-science-ms/",
      title: "Data Science MS",
    },
    {
      url: "https://www.khoury.northeastern.edu/programs/artificial-intelligence-ms/",
      title: "Artificial Intelligence MS",
    },
    {
      url: "https://www.khoury.northeastern.edu/programs/align-masters-of-science-in-data-science/",
      title: "Data Science MS (Align)",
      programName: "Data Science MS (Align)",
      degreeType: "MS",
      field: "Data Science",
    },
    {
      url: "https://www.khoury.northeastern.edu/programs/align-masters-of-science-in-computer-science/",
      title: "Computer Science MS (Align)",
      programName: "Computer Science MS (Align)",
      degreeType: "MS",
      field: "Computer Science",
    },
  ],
});
