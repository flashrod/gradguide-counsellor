import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Bonn — Computer Science MSc.
 * English-taught, 120 ECTS / 4 semesters, winter/summer starts, C1
 * English, ECTS module prerequisites. Grade specifics stay in notes.
 */
export const bonnSource = new CuratedUniversitySource({
  id: "bonn",
  universityName: "University of Bonn",
  universityCountry: "Germany",
  universityCity: "Bonn",
  universityWebsite: "https://www.uni-bonn.de",
  sourceName: "Bonn Informatics — Computer Science MSc",
  programPages: [
    {
      url: "https://www.informatik.uni-bonn.de/en/studies/master-programs/master-computer-science",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
