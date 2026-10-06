import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * First (and only, for Milestone 4) university adapter:
 * Rochester Institute of Technology — Computer Science MS.
 *
 * Page verified to contain on one URL: degree title, 30-credit structure,
 * GPA guidance (3.0), IELTS 6.5 / TOEFL 88 minima, Fall/Spring intakes,
 * and background/prerequisite text. Tuition figures are NOT published on
 * the program page, so tuition stays honestly unknown (PARTIAL tier).
 */
export const ritSource = new CuratedUniversitySource({
  id: "rit",
  universityName: "Rochester Institute of Technology",
  universityCountry: "USA",
  universityCity: "Rochester",
  universityWebsite: "https://www.rit.edu",
  sourceName: "RIT Graduate Study — Computer Science MS",
  programPages: [
    {
      url: "https://www.rit.edu/study/computer-science-ms",
      title: "Computer Science MS",
    },
    {
      url: "https://www.rit.edu/study/data-science-ms",
      title: "Data Science MS",
    },
    {
      url: "https://www.rit.edu/study/artificial-intelligence-ms",
      title: "Artificial Intelligence MS",
    },
    {
      url: "https://www.rit.edu/study/software-engineering-ms",
      title: "Software Engineering MS",
    },
    {
      url: "https://www.rit.edu/study/computing-security-ms",
      title: "Computing Security MS",
    },
  ],
});
