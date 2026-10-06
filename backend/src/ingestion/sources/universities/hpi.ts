import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Hasso Plattner Institute / University of Potsdam — Computer Science M.Sc.
 * No tuition, 4 semesters, C1 English, Winter/Summer starts. English scores
 * are stated as CEFR levels rather than IELTS/TOEFL, so those stay unknown.
 */
export const hpiSource = new CuratedUniversitySource({
  id: "hpi",
  universityName: "Hasso Plattner Institute, University of Potsdam",
  universityCountry: "Germany",
  universityCity: "Potsdam",
  universityWebsite: "https://hpi.de",
  sourceName: "HPI — Computer Science M.Sc.",
  programPages: [
    {
      url: "https://hpi.de/en/studies/computer-science-msc/",
      title: "Computer Science M.Sc.",
    },
    {
      url: "https://hpi.de/en/studies/it-systems-engineering-msc/",
      title: "IT Systems Engineering M.Sc.",
      programName: "IT Systems Engineering M.Sc.",
      degreeType: "MSc",
      field: "Software Engineering",
    },
  ],
});
