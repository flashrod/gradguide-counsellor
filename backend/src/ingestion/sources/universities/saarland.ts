import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Saarland University — Mathematics and Computer Science M.Sc.
 * English-taught, 4 semesters, winter/summer starts. Explicit numbers
 * exist (IELTS 7.0 / TOEFL 95); grade specifics stay in notes.
 */
export const saarlandSource = new CuratedUniversitySource({
  id: "saarland",
  universityName: "Saarland University",
  universityCountry: "Germany",
  universityCity: "Saarbrücken",
  universityWebsite: "https://www.uni-saarland.de",
  sourceName: "Saarland — Mathematics and Computer Science M.Sc.",
  programPages: [
    {
      url: "https://www.uni-saarland.de/en/study/programmes/master/mathematics-computer-science.html",
      title: "Mathematics and Computer Science M.Sc.",
      programName: "Mathematics and Computer Science M.Sc.",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.uni-saarland.de/en/study/programmes/master/data-science.html",
      title: "Data Science M.Sc.",
      programName: "Data Science M.Sc.",
      degreeType: "MSc",
      field: "Data Science",
    },
  ],
});
