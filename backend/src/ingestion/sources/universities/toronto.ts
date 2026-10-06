import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Toronto — MSc Computer Science.
 * B+ (3.3/4.0) standing, Fall entry only, funding package. English minima
 * live on university pages and stay unknown here.
 */
export const torontoSource = new CuratedUniversitySource({
  id: "toronto",
  universityName: "University of Toronto",
  universityCountry: "Canada",
  universityCity: "Toronto",
  universityWebsite: "https://www.utoronto.ca",
  sourceName: "U of T Computer Science — MSc",
  programPages: [
    {
      url: "https://web.cs.toronto.edu/graduate/msc",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://mscac.utoronto.ca/apply/",
      title: "Applied Computing MScAC",
      programName: "Applied Computing MScAC",
      degreeType: "MScAC",
      field: "Computer Science",
      // States a B+ letter standing only (no numeric GPA); the generic
      // parser otherwise misreads a nearby digit as a GPA cutoff.
      suppressFields: ["gpa"],
    },
  ],
});
