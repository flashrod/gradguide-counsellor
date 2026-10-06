import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Waterloo — highly competitive (MMath Computer Science,
 * graduate calendar). Thesis-based; minima stay unknown unless the
 * calendar states them explicitly.
 */
export const waterlooSource = new CuratedUniversitySource({
  id: "waterloo",
  universityName: "University of Waterloo",
  universityCountry: "Canada",
  universityCity: "Waterloo",
  universityWebsite: "https://uwaterloo.ca",
  sourceName: "Waterloo — MMath Computer Science",
  programPages: [
    {
      url: "https://uwaterloo.ca/graduate-studies-academic-calendar/mathematics/faculty-computing-and-financial-management/computer-science/master-mathematics-mmath-computer-science",
      title: "Computer Science MMath",
      programName: "Computer Science MMath",
      degreeType: "MMath",
      field: "Computer Science",
    },
  ],
});
