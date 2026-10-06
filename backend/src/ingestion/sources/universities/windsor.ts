import { CuratedUniversitySource } from "../universityWebsite.js";

/** University of Windsor — Computer Science M.Sc. (TOEFL 92 / IELTS 6.5, Fall/Winter/Summer deadlines). */
export const windsorSource = new CuratedUniversitySource({
  id: "windsor",
  universityName: "University of Windsor",
  universityCountry: "Canada",
  universityCity: "Windsor",
  universityWebsite: "https://www.uwindsor.ca",
  sourceName: "Windsor Graduate Studies — Computer Science M.Sc.",
  programPages: [
    {
      url: "https://www.uwindsor.ca/graduate-studies/494/computer-science",
      title: "Computer Science M.Sc.",
      programName: "Computer Science M.Sc.",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
