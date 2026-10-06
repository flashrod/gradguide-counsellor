import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Nebraska Omaha — Computer Science MS.
 * Graduate catalog page with GPA, English minima, and deadline terms.
 */
export const unoSource = new CuratedUniversitySource({
  id: "uno",
  universityName: "University of Nebraska Omaha",
  universityCountry: "USA",
  universityCity: "Omaha",
  universityWebsite: "https://www.unomaha.edu",
  sourceName: "UNO Graduate Catalog — Computer Science MS",
  programPages: [
    {
      url: "https://catalog.unomaha.edu/graduate/degree-programs-certificates-minors/computer-science/computer-science-ms/",
      title: "Computer Science MS",
    },
  ],
});
