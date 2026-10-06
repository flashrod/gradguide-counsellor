import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Illinois Chicago — MS Computer Science (academic catalog).
 * GPA 3.50/4.00 (final 60 hours), TOEFL 80 / IELTS 6.5 with section minima.
 */
export const uicSource = new CuratedUniversitySource({
  id: "uic",
  universityName: "University of Illinois Chicago",
  universityCountry: "USA",
  universityCity: "Chicago",
  universityWebsite: "https://www.uic.edu",
  sourceName: "UIC Academic Catalog — MS Computer Science",
  programPages: [
    {
      url: "https://catalog.uic.edu/gcat/colleges-schools/engineering/cs/ms/",
      title: "Computer Science MS",
      programName: "Computer Science MS",
      degreeType: "MS",
      field: "Computer Science",
    },
  ],
});
