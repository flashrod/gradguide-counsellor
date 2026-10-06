import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Manitoba — Computer Science MSc (2-year thesis).
 * Fall/Winter entry with supervisor requirement. English minima live on
 * faculty pages and stay unknown here.
 */
export const manitobaSource = new CuratedUniversitySource({
  id: "manitoba",
  universityName: "University of Manitoba",
  universityCountry: "Canada",
  universityCity: "Winnipeg",
  universityWebsite: "https://umanitoba.ca",
  sourceName: "Manitoba — Computer Science MSc",
  programPages: [
    {
      url: "https://umanitoba.ca/graduate-studies/admissions/programs-of-study/computer-science-msc",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
