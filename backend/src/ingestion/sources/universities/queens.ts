import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Queen's University — MSc Computer Science.
 * High upper-second standing with CS concentration (no numeric GPA on
 * page, so GPA stays unknown). Rich background prerequisites.
 */
export const queensSource = new CuratedUniversitySource({
  id: "queens",
  universityName: "Queen's University",
  universityCountry: "Canada",
  universityCity: "Kingston",
  universityWebsite: "https://www.queensu.ca",
  sourceName: "Queen's Computing — MSc",
  programPages: [
    {
      url: "https://www.cs.queensu.ca/graduate/msc/",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.cs.queensu.ca/graduate/phd/",
      title: "Computer Science PhD",
      programName: "Computer Science PhD",
      degreeType: "PhD",
      field: "Computer Science",
    },
  ],
});
