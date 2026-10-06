import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * UMass Lowell — MS Computer Science (admissions FAQ).
 * TOEFL 70 minimum stated; no hard GPA cutoff published here, so GPA
 * stays unknown rather than inferred.
 */
export const umlSource = new CuratedUniversitySource({
  id: "uml",
  universityName: "University of Massachusetts Lowell",
  universityCountry: "USA",
  universityCity: "Lowell",
  universityWebsite: "https://www.uml.edu",
  sourceName: "UMass Lowell CS — Graduate Admissions FAQ",
  programPages: [
    {
      url: "https://www.uml.edu/sciences/computer-science/programs/masters/admissions/grad-faq.aspx",
      title: "Computer Science MS",
      programName: "Computer Science MS",
      degreeType: "MS",
      field: "Computer Science",
    },
  ],
});
