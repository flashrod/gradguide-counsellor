import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Loughborough University — Computer Science + Advanced Computer Science.
 * International per-annum tuition, 1-year full-time, September starts.
 * English minima sit on the international site, so they stay unknown.
 */
export const loughboroughSource = new CuratedUniversitySource({
  id: "loughborough",
  universityName: "Loughborough University",
  universityCountry: "UK",
  universityCity: "Loughborough",
  universityWebsite: "https://www.lboro.ac.uk",
  sourceName: "Loughborough — Computing MSc Programmes",
  programPages: [
    {
      url: "https://www.lboro.ac.uk/study/postgraduate/masters-degrees/computer-science/",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.lboro.ac.uk/study/postgraduate/masters-degrees/advanced-computer-science/",
      title: "Advanced Computer Science MSc",
      programName: "Advanced Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.lboro.ac.uk/study/postgraduate/masters-degrees/artificial-intelligence/",
      title: "Artificial Intelligence MSc",
      programName: "Artificial Intelligence MSc",
      degreeType: "MSc",
      field: "Artificial Intelligence",
    },
  ],
});
