import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * TU Berlin — Computer Science (Informatik) M.Sc.
 * Open admission, English-taught, winter/summer starts, 4 semesters,
 * ECTS subject prerequisites. English at B2; specifics stay in notes.
 */
export const tuBerlinSource = new CuratedUniversitySource({
  id: "tu-berlin",
  universityName: "TU Berlin",
  universityCountry: "Germany",
  universityCity: "Berlin",
  universityWebsite: "https://www.tu.berlin",
  sourceName: "TU Berlin — Computer Science M.Sc.",
  programPages: [
    {
      url: "https://www.tu.berlin/en/studying/study-programs/all-programs-offered/study-course/computer-science-informatik-m-sc",
      title: "Computer Science M.Sc.",
      programName: "Computer Science M.Sc.",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.tu.berlin/en/studying/study-programs/all-programs-offered/study-course/computer-engineering-m-sc",
      title: "Computer Engineering M.Sc.",
      programName: "Computer Engineering M.Sc.",
      degreeType: "MSc",
      field: "Computer Engineering",
    },
  ],
});
