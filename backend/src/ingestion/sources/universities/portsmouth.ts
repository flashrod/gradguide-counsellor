import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Portsmouth — MSc Computer Science.
 * IELTS 6.0 (5.5 components), international tuition, September/January
 * starts with 1-year and 18-month routes.
 */
export const portsmouthSource = new CuratedUniversitySource({
  id: "portsmouth",
  universityName: "University of Portsmouth",
  universityCountry: "UK",
  universityCity: "Portsmouth",
  universityWebsite: "https://www.port.ac.uk",
  sourceName: "Portsmouth — MSc Computer Science",
  programPages: [
    {
      url: "https://www.port.ac.uk/study/courses/postgraduate-taught/msc-computer-science",
      title: "MSc Computer Science",
    },
    {
      url: "https://www.port.ac.uk/study/courses/postgraduate-taught/msc-artificial-intelligence-and-machine-learning",
      title: "Artificial Intelligence and Machine Learning MSc",
      programName: "Artificial Intelligence and Machine Learning MSc",
      degreeType: "MSc",
      field: "Artificial Intelligence",
      // No fee figures published (only textbook/ancillary costs) — the
      // generic picker would otherwise misread "£60" textbook costs.
      suppressFields: ["tuition"],
    },
    {
      url: "https://www.port.ac.uk/study/courses/postgraduate-taught/msc-data-analytics",
      title: "Data Analytics MSc",
      programName: "Data Analytics MSc",
      degreeType: "MSc",
      field: "Data Science",
      suppressFields: ["tuition"],
    },
  ],
});
