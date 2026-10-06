import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Stuttgart — strong public university, English-taught.
 * M.Sc. Computer Science (winter/summer starts, 4 semesters, C1 English)
 * plus M.Sc. Computational Linguistics. Grade/ECTS specifics stay in
 * notes — never converted.
 */
export const stuttgartSource = new CuratedUniversitySource({
  id: "stuttgart",
  universityName: "University of Stuttgart",
  universityCountry: "Germany",
  universityCity: "Stuttgart",
  universityWebsite: "https://www.uni-stuttgart.de",
  sourceName: "Stuttgart — M.Sc. Computer Science",
  programPages: [
    {
      url: "https://www.uni-stuttgart.de/en/study/study-programs/computer-science-m.sc-00002./",
      title: "Computer Science M.Sc.",
      programName: "Computer Science M.Sc.",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.uni-stuttgart.de/en/study/study-programs/computational-linguistics-m.sc-00001./",
      title: "Computational Linguistics M.Sc.",
      programName: "Computational Linguistics M.Sc.",
      degreeType: "MSc",
      field: "Computational Linguistics",
    },
  ],
});
