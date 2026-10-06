import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Simon Fraser University — MSc Computing Science (4.33-scale GPA,
 * TOEFL 90 / IELTS 6.5 university minima). The 4.33 scale is honored as
 * explicitly stated, never converted.
 */
export const sfuSource = new CuratedUniversitySource({
  id: "sfu",
  universityName: "Simon Fraser University",
  universityCountry: "Canada",
  universityCity: "Burnaby",
  universityWebsite: "https://www.sfu.ca",
  sourceName: "SFU Computing Science — Graduate Admissions",
  programPages: [
    {
      url: "https://www.sfu.ca/fas/study/future-graduates/apply/computing-science.html",
      title: "Computing Science MSc",
      programName: "Computing Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
      // States no program length ("4-12 months faster" is an acceleration
      // note, not a duration). English minima live at university level.
      suppressFields: ["duration"],
    },
    {
      url: "https://www.sfu.ca/computing/current-students/graduate-students/academic-programs/big-data.html",
      title: "Computing Science MSc (Big Data)",
      programName: "Computing Science MSc (Big Data)",
      degreeType: "MSc",
      field: "Data Science",
    },
  ],
});
