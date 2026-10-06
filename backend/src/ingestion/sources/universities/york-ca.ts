import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * York University (Toronto) — accessible public option.
 * Graduate program in Computer Science (MSc stream).
 */
export const yorkCaSource = new CuratedUniversitySource({
  id: "york-ca",
  universityName: "York University",
  universityCountry: "Canada",
  universityCity: "Toronto",
  universityWebsite: "https://www.yorku.ca",
  sourceName: "York — Graduate Computer Science",
  programPages: [
    {
      url: "https://www.yorku.ca/gradstudies/computer-science/",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
