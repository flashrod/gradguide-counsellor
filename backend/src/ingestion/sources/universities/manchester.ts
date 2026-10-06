import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Manchester — MSc Advanced Computer Science.
 * IELTS 7.0 / TOEFL 100, international per-annum tuition.
 */
export const manchesterSource = new CuratedUniversitySource({
  id: "manchester",
  universityName: "University of Manchester",
  universityCountry: "UK",
  universityCity: "Manchester",
  universityWebsite: "https://www.manchester.ac.uk",
  sourceName: "Manchester — MSc Advanced Computer Science",
  programPages: [
    {
      url: "https://www.manchester.ac.uk/study/masters/courses/list/21573/msc-advanced-computer-science/",
      title: "Advanced Computer Science MSc",
    },
  ],
});
