import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * KIT — Computer Science M.Sc. (International).
 * Winter/summer starts, 4 semesters, ECTS subject prerequisites,
 * English instruction. Subject-credit requirements are preserved in
 * notes, never converted to cutoffs.
 */
export const kitSource = new CuratedUniversitySource({
  id: "kit",
  universityName: "Karlsruhe Institute of Technology",
  universityCountry: "Germany",
  universityCity: "Karlsruhe",
  universityWebsite: "https://www.kit.edu",
  sourceName: "KIT Informatics — Computer Science M.Sc.",
  programPages: [
    {
      url: "https://www.informatik.kit.edu/english/mastercomputerscience.php",
      title: "Computer Science M.Sc.",
      programName: "Computer Science M.Sc.",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
