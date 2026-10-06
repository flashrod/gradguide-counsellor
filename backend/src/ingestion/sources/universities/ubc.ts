import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of British Columbia (Vancouver) — highly competitive.
 * MSc Computer Science (research, thesis/essay options, ~24 months) plus
 * the professional Master of Data Science. Both pages verified live;
 * minima stay unknown unless explicitly stated on the page.
 */
export const ubcSource = new CuratedUniversitySource({
  id: "ubc",
  universityName: "University of British Columbia",
  universityCountry: "Canada",
  universityCity: "Vancouver",
  universityWebsite: "https://www.ubc.ca",
  sourceName: "UBC CS — Graduate Programs",
  programPages: [
    {
      url: "https://www.cs.ubc.ca/students/grad/graduate-programs/msc-program",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://masterdatascience.ubc.ca/",
      title: "Master of Data Science",
      programName: "Master of Data Science",
      degreeType: "MDS",
      field: "Data Science",
    },
  ],
});
