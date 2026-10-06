import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * TU Munich — M.Sc. Informatics (CIT).
 * Aptitude assessment, English instruction, winter/summer starts,
 * 120 ECTS / 4 semesters. Grade and language specifics stay in notes —
 * never converted.
 */
export const tumSource = new CuratedUniversitySource({
  id: "tum",
  universityName: "Technical University of Munich",
  universityCountry: "Germany",
  universityCity: "Munich",
  universityWebsite: "https://www.tum.de",
  sourceName: "TUM CIT — Master Informatics",
  programPages: [
    {
      url: "https://www.cit.tum.de/en/cit/studies/degree-programs/master-informatics/",
      title: "Informatics M.Sc.",
      programName: "Informatics M.Sc.",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.cit.tum.de/en/cit/studies/degree-programs/master-data-engineering-and-analytics/",
      title: "Data Engineering and Analytics M.Sc.",
      programName: "Data Engineering and Analytics M.Sc.",
      degreeType: "MSc",
      field: "Data Science",
    },
    {
      url: "https://www.cit.tum.de/en/cit/studies/degree-programs/master-robotics-cognition-intelligence/",
      title: "Robotics, Cognition, Intelligence M.Sc.",
      programName: "Robotics, Cognition, Intelligence M.Sc.",
      degreeType: "MSc",
      field: "Robotics",
    },
    {
      url: "https://www.cit.tum.de/en/cit/studies/degree-programs/master-biomedical-computing/",
      title: "Biomedical Computing M.Sc.",
      programName: "Biomedical Computing M.Sc.",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
