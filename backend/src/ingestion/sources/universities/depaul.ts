import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * DePaul University, College of Computing and Digital Media.
 * Programme pages carry structure and deadlines; GPA/English minima live
 * on central admissions pages, so those stay honestly unknown here.
 */
export const depaulSource = new CuratedUniversitySource({
  id: "depaul",
  universityName: "DePaul University",
  universityCountry: "USA",
  universityCity: "Chicago",
  universityWebsite: "https://www.depaul.edu",
  sourceName: "DePaul CDM — Graduate Programs",
  programPages: [
    {
      url: "https://www.cdm.depaul.edu/academics/Pages/MS-in-Computer-Science.aspx",
      title: "Computer Science MS",
      programName: "Computer Science MS",
      degreeType: "MS",
      field: "Computer Science",
    },
    {
      url: "https://www.cdm.depaul.edu/academics/Pages/MS-in-Data-Science.aspx",
      title: "Data Science MS",
      programName: "Data Science MS",
      degreeType: "MS",
      field: "Data Science",
    },
    {
      url: "https://www.cdm.depaul.edu/academics/Pages/MS-in-Software-Engineering.aspx",
      title: "Software Engineering MS",
      programName: "Software Engineering MS",
      degreeType: "MS",
      field: "Software Engineering",
    },
    {
      url: "https://www.cdm.depaul.edu/academics/Pages/MS-in-Artificial-Intelligence.aspx",
      title: "Artificial Intelligence MS",
      programName: "Artificial Intelligence MS",
      degreeType: "MS",
      field: "Artificial Intelligence",
    },
    {
      url: "https://www.cdm.depaul.edu/academics/Pages/MS-in-Cybersecurity.aspx",
      title: "Cybersecurity MS",
      programName: "Cybersecurity MS",
      degreeType: "MS",
      field: "Cybersecurity",
    },
  ],
});
