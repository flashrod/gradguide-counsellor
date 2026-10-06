import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Greenwich — Computer Science MSc (+ placement variant).
 * International fees, September/January starts. English minima sit behind
 * country pages, so they stay unknown.
 */
export const greenwichSource = new CuratedUniversitySource({
  id: "greenwich",
  universityName: "University of Greenwich",
  universityCountry: "UK",
  universityCity: "London",
  universityWebsite: "https://www.gre.ac.uk",
  sourceName: "Greenwich — Computer Science MSc",
  programPages: [
    {
      url: "https://www.gre.ac.uk/postgraduate-courses/engsci/computer-science-msc",
      title: "Computer Science MSc",
    },
    {
      url: "https://www.gre.ac.uk/postgraduate-courses/engsci/computer-science-with-placement-year-msc",
      title: "Computer Science with Placement Year MSc",
      programName: "Computer Science with Placement Year MSc",
      degreeType: "MSc",
      field: "Computer Science",
      // The 2-year sandwich fee cannot be attributed annual-vs-total from
      // the cohort table — suppressed rather than understated.
      suppressFields: ["tuition"],
    },
  ],
});
