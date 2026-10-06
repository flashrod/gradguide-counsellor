import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Leeds — Advanced Computer Science MSc programmes.
 * IELTS 6.5, international total fees, September start. UK 2:1 degree
 * requirements have no numeric equivalent here, so GPA stays unknown.
 */
export const leedsSource = new CuratedUniversitySource({
  id: "leeds",
  universityName: "University of Leeds",
  universityCountry: "UK",
  universityCity: "Leeds",
  universityWebsite: "https://www.leeds.ac.uk",
  sourceName: "Leeds Course Search — Computer Science MSc",
  programPages: [
    {
      url: "https://courses.leeds.ac.uk/f753/advanced-computer-science-msc",
      title: "Advanced Computer Science MSc",
      programName: "Advanced Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://courses.leeds.ac.uk/g313/advanced-computer-science-cloud-computing-msc",
      title: "Advanced Computer Science (Cloud Computing) MSc",
      programName: "Advanced Computer Science (Cloud Computing) MSc",
      degreeType: "MSc",
      field: "Computer Science",
    },
  ],
});
