import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Glasgow — Computing Science MSc.
 * Structured programme page: fees, IELTS, September start.
 */
export const glasgowSource = new CuratedUniversitySource({
  id: "glasgow",
  universityName: "University of Glasgow",
  universityCountry: "UK",
  universityCity: "Glasgow",
  universityWebsite: "https://www.gla.ac.uk",
  sourceName: "Glasgow — Computing Science MSc",
  programPages: [
    {
      url: "https://www.gla.ac.uk/postgraduate/taught/computingscience/",
      title: "Computing Science MSc",
      programName: "Computing Science MSc",
      degreeType: "MSc",
      field: "Computing Science",
    },
    {
      url: "https://www.gla.ac.uk/postgraduate/taught/datascience/",
      title: "Data Science MSc",
      programName: "Data Science MSc",
      degreeType: "MSc",
      field: "Data Science",
    },
  ],
});
