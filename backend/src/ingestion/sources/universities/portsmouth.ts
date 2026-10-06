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
  ],
});
