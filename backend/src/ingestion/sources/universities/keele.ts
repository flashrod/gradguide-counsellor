import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Keele University — Computer Science MSc.
 * International per-year tuition, September/January starts. English minima
 * sit behind a country dropdown, so they stay unknown.
 */
export const keeleSource = new CuratedUniversitySource({
  id: "keele",
  universityName: "Keele University",
  universityCountry: "UK",
  universityCity: "Keele",
  universityWebsite: "https://www.keele.ac.uk",
  sourceName: "Keele — Computer Science MSc",
  programPages: [
    {
      url: "https://www.keele.ac.uk/study/postgraduatestudy/postgraduatecourses/computerscience/",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
