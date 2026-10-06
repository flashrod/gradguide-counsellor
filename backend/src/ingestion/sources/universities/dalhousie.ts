import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Dalhousie University — Computer Science MCS (admissions handbook page).
 * GPA 3.0 in technical courses; September/January/May deadlines.
 * Programme-specific English minima live on faculty pages and stay unknown.
 */
export const dalhousieSource = new CuratedUniversitySource({
  id: "dalhousie",
  universityName: "Dalhousie University",
  universityCountry: "Canada",
  universityCity: "Halifax",
  universityWebsite: "https://www.dal.ca",
  sourceName: "Dalhousie CS — How to Apply (MCS)",
  programPages: [
    {
      url: "https://www.dal.ca/faculty/computerscience/graduate-programs/grad-handbook/how-to-apply.html",
      title: "Computer Science MCS",
      programName: "Computer Science MCS",
      degreeType: "MCS",
      field: "Computer Science",
      // Handbook page states no program length; the only "month" figure
      // is an application-response deadline, not a duration.
      suppressFields: ["duration"],
    },
    {
      url: "https://www.dal.ca/faculty/computerscience/graduate-programs.html",
      title: "Applied Computer Science MACS",
      programName: "Applied Computer Science MACS",
      degreeType: "MACS",
      field: "Computer Science",
    },
  ],
});
