import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Drexel University — MS Computer Science (via CCI graduate admissions).
 * GPA 3.0, TOEFL 90 / IELTS 6.5. The admissions page serves all CCI
 * masters programmes, so identity is curated rather than parsed.
 */
export const drexelSource = new CuratedUniversitySource({
  id: "drexel",
  universityName: "Drexel University",
  universityCountry: "USA",
  universityCity: "Philadelphia",
  universityWebsite: "https://drexel.edu",
  sourceName: "Drexel CCI — Graduate Admissions",
  programPages: [
    {
      url: "https://drexel.edu/cci/admissions/masters-certificate/",
      title: "Computer Science MS",
      programName: "Computer Science MS",
      degreeType: "MS",
      field: "Computer Science",
    },
    {
      url: "https://drexel.edu/cci/academics/masters-programs/ms-in-artificial-intelligence-machine-learning/",
      title: "Artificial Intelligence & Machine Learning MS",
      programName: "Artificial Intelligence & Machine Learning MS",
      degreeType: "MS",
      field: "Artificial Intelligence",
    },
    {
      url: "https://drexel.edu/cci/academics/masters-programs/ms-in-data-science/",
      title: "Data Science MS",
      programName: "Data Science MS",
      degreeType: "MS",
      field: "Data Science",
    },
    {
      url: "https://drexel.edu/cci/academics/masters-programs/ms-in-software-engineering/",
      title: "Software Engineering MS",
      programName: "Software Engineering MS",
      degreeType: "MS",
      field: "Software Engineering",
    },
  ],
});
