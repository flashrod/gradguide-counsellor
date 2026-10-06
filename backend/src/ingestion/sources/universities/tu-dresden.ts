import { CuratedUniversitySource } from "../universityWebsite.js";

/** TU Dresden — Computer Science M.Sc. admissions (IELTS 7.0 / TOEFL 100, winter and summer starts). */
export const tuDresdenSource = new CuratedUniversitySource({
  id: "tu-dresden",
  universityName: "TU Dresden",
  universityCountry: "Germany",
  universityCity: "Dresden",
  universityWebsite: "https://tu-dresden.de",
  sourceName: "TU Dresden — Computer Science M.Sc. Admission",
  programPages: [
    {
      url: "https://tu-dresden.de/ing/informatik/studium/studienangebot/master-studiengaenge/m-sc-computer-science/admission",
      title: "Computer Science M.Sc.",
      programName: "Computer Science M.Sc.",
      degreeType: "MS",
      field: "Computer Science",
    },
  ],
});
