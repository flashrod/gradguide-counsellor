import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Florida State University — Computer Science graduate admissions.
 * Department admissions page covering the MS programmes (GPA, English
 * minima). Tuition is not published here and stays unknown.
 */
export const fsuSource = new CuratedUniversitySource({
  id: "fsu",
  universityName: "Florida State University",
  universityCountry: "USA",
  universityCity: "Tallahassee",
  universityWebsite: "https://www.fsu.edu",
  sourceName: "FSU Computer Science — Graduate Admission Requirements",
  programPages: [
    {
      url: "https://www.cs.fsu.edu/admissions/graduate-admissions/graduate-admission-requirements/",
      title: "Computer Science MS",
      programName: "Computer Science MS",
      degreeType: "MS",
      field: "Computer Science",
    },
  ],
});
