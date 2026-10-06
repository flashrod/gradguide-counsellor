import { CuratedUniversitySource } from "../universityWebsite.js";

/** McGill University — M.Sc. Computer Science (GPA 3.2/4, TOEFL 100 / IELTS 6.5, Fall admission). */
export const mcgillSource = new CuratedUniversitySource({
  id: "mcgill",
  universityName: "McGill University",
  universityCountry: "Canada",
  universityCity: "Montreal",
  universityWebsite: "https://www.mcgill.ca",
  sourceName: "McGill CS — M.Sc. Admission Requirements",
  programPages: [
    {
      url: "https://www.cs.mcgill.ca/graduate/future/mscadmission/",
      title: "Computer Science M.Sc.",
      programName: "Computer Science M.Sc.",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.cs.mcgill.ca/graduate/future/phdadmission/",
      title: "Computer Science PhD",
      programName: "Computer Science PhD",
      degreeType: "PhD",
      field: "Computer Science",
    },
  ],
});
