import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Exeter — computing MSc programmes (shared template).
 * International per-year tuition, September/January starts. English
 * minima reference IELTS profiles on a linked page, so scores stay
 * unknown unless stated numerically here.
 */
export const exeterSource = new CuratedUniversitySource({
  id: "exeter",
  universityName: "University of Exeter",
  universityCountry: "UK",
  universityCity: "Exeter",
  universityWebsite: "https://www.exeter.ac.uk",
  sourceName: "Exeter — Computing MSc Programmes",
  programPages: [
    {
      url: "https://www.exeter.ac.uk/masters-degrees/msc-computer-science/",
      title: "Computer Science MSc",
    },
    {
      url: "https://www.exeter.ac.uk/masters-degrees/msc-advanced-computer-science/",
      title: "Advanced Computer Science MSc",
    },
    {
      url: "https://www.exeter.ac.uk/masters-degrees/msc-advanced-computer-science-with-business/",
      title: "Advanced Computer Science with Business MSc",
      programName: "Advanced Computer Science with Business MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
