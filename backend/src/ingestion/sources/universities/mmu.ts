import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Manchester Metropolitan University — MSc Computer Science.
 * IELTS 6.5, international per-year tuition.
 */
export const mmuSource = new CuratedUniversitySource({
  id: "mmu",
  universityName: "Manchester Metropolitan University",
  universityCountry: "UK",
  universityCity: "Manchester",
  universityWebsite: "https://www.mmu.ac.uk",
  sourceName: "MMU — MSc Computer Science",
  programPages: [
    {
      url: "https://www.mmu.ac.uk/study/postgraduate/course/msc-computer-science",
      title: "Computer Science MSc",
      // Full-time and multi-year part-time durations share one page and
      // cannot be attributed — suppressed rather than misread.
      suppressFields: ["duration"],
    },
    {
      url: "https://www.mmu.ac.uk/study/postgraduate/course/msc-artificial-intelligence",
      title: "Artificial Intelligence MSc",
      programName: "Artificial Intelligence MSc",
      degreeType: "MSc",
      field: "Artificial Intelligence",
      suppressFields: ["duration"],
    },
  ],
});
