import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University at Buffalo — Computer Science MS (admissions FAQ).
 * The page explicitly disclaims a strict GPA minimum, so GPA stays
 * unknown (suppressed) rather than becoming a misleading hard cutoff.
 * TOEFL 79 / IELTS 6.5 minima are stated and extracted.
 */
export const buffaloSource = new CuratedUniversitySource({
  id: "buffalo",
  universityName: "University at Buffalo",
  universityCountry: "USA",
  universityCity: "Buffalo",
  universityWebsite: "https://www.buffalo.edu",
  sourceName: "Buffalo CSE — Graduate Admissions FAQ",
  programPages: [
    {
      url: "https://engineering.buffalo.edu/computer-science-engineering/graduate/admissions/faq.html",
      title: "Computer Science MS",
      programName: "Computer Science MS",
      degreeType: "MS",
      field: "Computer Science",
      suppressFields: ["gpa"],
    },
  ],
});
