import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * UT Dallas — MS Computer Science (fact sheet).
 * GPA 3.0, TOEFL 80, Fall/Spring/Summer deadlines. IELTS is not stated on
 * this page and stays unknown.
 */
export const utdSource = new CuratedUniversitySource({
  id: "utd",
  universityName: "The University of Texas at Dallas",
  universityCountry: "USA",
  universityCity: "Richardson",
  universityWebsite: "https://www.utdallas.edu",
  sourceName: "UT Dallas — MS Computer Science Fact Sheet",
  programPages: [
    {
      url: "https://academics.utdallas.edu/fact-sheets/ecs/ms-computer-science/",
      title: "Computer Science MS",
    },
    // NOTE: the graduate catalog Software Engineering page was evaluated
    // and SKIPPED — its duration (20 months, executive track) and GPA
    // (3.5, prior-master's/PhD context) bleed across tracks and would
    // misrepresent the standard MS. See milestone notes.
  ],
});
