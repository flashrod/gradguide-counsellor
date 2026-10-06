import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Western University — Computer Science graduate admissions.
 * GPA 3.0/4.0, IELTS 6.5. Duration suppressed: the only "year" figures
 * describe the 4-year undergraduate prerequisite, not the MSc length.
 */
export const westernSource = new CuratedUniversitySource({
  id: "western",
  universityName: "Western University",
  universityCountry: "Canada",
  universityCity: "London",
  universityWebsite: "https://www.uwo.ca",
  sourceName: "Western CS — Graduate Admissions",
  programPages: [
    {
      url: "https://www.csd.uwo.ca/graduate/future/admission.html",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
      // Admission page states no program length; the only "year" figures
      // describe the 4-year undergraduate prerequisite, not the MSc.
      suppressFields: ["duration"],
    },
  ],
});
