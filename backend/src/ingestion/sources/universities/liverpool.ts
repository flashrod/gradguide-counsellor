import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Liverpool — Computer Science MSc.
 * IELTS 6.5, TOEFL 88, international per-year tuition, 12-month course,
 * September start.
 */
export const liverpoolSource = new CuratedUniversitySource({
  id: "liverpool",
  universityName: "University of Liverpool",
  universityCountry: "UK",
  universityCity: "Liverpool",
  universityWebsite: "https://www.liverpool.ac.uk",
  sourceName: "Liverpool — Computer Science MSc",
  programPages: [
    {
      url: "https://www.liverpool.ac.uk/courses/computer-science-msc",
      title: "Computer Science MSc",
    },
  ],
});
