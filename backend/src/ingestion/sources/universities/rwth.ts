import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * RWTH Aachen — M.Sc. Computer Science.
 * Mixed-language programme (German C1 required alongside English B2).
 * Language specifics stay in notes/evidence — German certificates are
 * never converted to IELTS.
 */
export const rwthSource = new CuratedUniversitySource({
  id: "rwth",
  universityName: "RWTH Aachen University",
  universityCountry: "Germany",
  universityCity: "Aachen",
  universityWebsite: "https://www.rwth-aachen.de",
  sourceName: "RWTH — M.Sc. Computer Science",
  programPages: [
    {
      url: "https://sc.informatik.rwth-aachen.de/en/studium/master/informatik/start-ins-studium/",
      title: "Computer Science M.Sc.",
      programName: "Computer Science M.Sc.",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
