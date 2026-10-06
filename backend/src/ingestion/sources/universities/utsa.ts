import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * The University of Texas at San Antonio — Computer Science MS.
 * Program page carries a structured requirements table (GPA 3.0/4.0,
 * TOEFL 79 / IELTS 6.5) plus deadline terms.
 */
export const utsaSource = new CuratedUniversitySource({
  id: "utsa",
  universityName: "The University of Texas at San Antonio",
  universityCountry: "USA",
  universityCity: "San Antonio",
  universityWebsite: "https://www.utsa.edu",
  sourceName: "UTSA Future Roadrunner — Computer Science MS",
  programPages: [
    {
      url: "https://future.utsa.edu/programs/master/computer-science/",
      title: "Computer Science MS",
    },
  ],
});
