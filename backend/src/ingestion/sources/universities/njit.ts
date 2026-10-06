import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * New Jersey Institute of Technology — MS Computer Science.
 * Computing background prerequisites; English via TOEFL/IELTS/Duolingo
 * with minima on the graduate admissions pages.
 */
export const njitSource = new CuratedUniversitySource({
  id: "njit",
  universityName: "New Jersey Institute of Technology",
  universityCountry: "USA",
  universityCity: "Newark",
  universityWebsite: "https://www.njit.edu",
  sourceName: "NJIT Computer Science — MS Computer Science",
  programPages: [
    {
      url: "https://cs.njit.edu/ms-computer-science",
      title: "Computer Science MS",
      // The only GPA figure on this page concerns good standing, not
      // admission — suppressed rather than misread as a cutoff.
      // Tuition table mixes online / Jersey City / Newark resident /
      // non-resident AY rates; single-figure extraction cannot attribute
      // the international on-campus cost, so tuition stays unknown.
      suppressFields: ["gpa", "tuition"],
    },
    {
      url: "https://cs.njit.edu/ms-cybersecurity",
      title: "Cybersecurity MS",
      programName: "Cybersecurity MS",
      degreeType: "MS",
      field: "Cybersecurity",
      suppressFields: ["gpa", "tuition"],
    },
    {
      url: "https://cs.njit.edu/ms-software-engineering",
      title: "Software Engineering MS",
      programName: "Software Engineering MS",
      degreeType: "MS",
      field: "Software Engineering",
      suppressFields: ["gpa", "tuition"],
    },
  ],
});
