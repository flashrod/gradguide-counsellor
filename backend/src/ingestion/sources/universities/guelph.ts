import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Guelph — MSc Computer Science.
 * 75% (B) average, thesis with mandatory faculty advisor. English minima
 * live on faculty pages and stay unknown here.
 */
export const guelphSource = new CuratedUniversitySource({
  id: "guelph",
  universityName: "University of Guelph",
  universityCountry: "Canada",
  universityCity: "Guelph",
  universityWebsite: "https://www.uoguelph.ca",
  sourceName: "Guelph — MSc Computer Science",
  programPages: [
    {
      url: "https://www.uoguelph.ca/programs/msc-computer-science",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.uoguelph.ca/programs/msc-data-science",
      title: "Data Science MSc",
      programName: "Data Science MSc",
      degreeType: "MSc",
      field: "Data Science",
    },
  ],
});
