import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Southampton — Computer Science MSc.
 * Structured course page: IELTS 6.5 (6.0 components), international
 * tuition per year, 1-year duration, September start.
 */
export const southamptonSource = new CuratedUniversitySource({
  id: "southampton",
  universityName: "University of Southampton",
  universityCountry: "UK",
  universityCity: "Southampton",
  universityWebsite: "https://www.southampton.ac.uk",
  sourceName: "Southampton — Computer Science MSc",
  programPages: [
    {
      url: "https://www.southampton.ac.uk/courses/computer-science-masters-msc",
      title: "Computer Science MSc",
    },
    {
      url: "https://www.southampton.ac.uk/courses/artificial-intelligence-masters-msc",
      title: "Artificial Intelligence MSc",
    },
    {
      url: "https://www.southampton.ac.uk/courses/data-science-masters-msc",
      title: "Data Science MSc",
    },
  ],
});
