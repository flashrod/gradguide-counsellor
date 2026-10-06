import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of York — Advanced Computer Science MSc.
 * September start, 1-year, international fees, IELTS 6.5. The 2:1 degree
 * requirement has no numeric equivalent here, so GPA stays unknown.
 */
export const yorkSource = new CuratedUniversitySource({
  id: "york",
  universityName: "University of York",
  universityCountry: "UK",
  universityCity: "York",
  universityWebsite: "https://www.york.ac.uk",
  sourceName: "York — Advanced Computer Science MSc",
  programPages: [
    {
      url: "https://www.york.ac.uk/study/postgraduate-taught/courses/msc-advanced-computer-science/",
      title: "Advanced Computer Science MSc",
    },
    {
      url: "https://www.york.ac.uk/study/postgraduate-taught/courses/msc-data-science/",
      title: "Data Science MSc",
      programName: "Data Science MSc",
      degreeType: "MSc",
      field: "Data Science",
    },
  ],
});
