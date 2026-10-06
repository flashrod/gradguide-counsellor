import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Bristol — MSc Computer Science (Conversion).
 * For non-computing backgrounds; overseas fee published. English sits
 * behind a profile-level link, so it stays unknown.
 */
export const bristolSource = new CuratedUniversitySource({
  id: "bristol",
  universityName: "University of Bristol",
  universityCountry: "UK",
  universityCity: "Bristol",
  universityWebsite: "https://www.bristol.ac.uk",
  sourceName: "Bristol — MSc Computer Science (Conversion)",
  programPages: [
    {
      url: "https://www.bristol.ac.uk/study/postgraduate/taught/msc-computer-science-conversion/",
      title: "Computer Science MSc (Conversion)",
      programName: "Computer Science MSc (Conversion)",
      degreeType: "MSc",
      field: "Computer Science",
    },
    {
      url: "https://www.bristol.ac.uk/study/postgraduate/taught/msc-data-science",
      title: "Data Science MSc",
      programName: "Data Science MSc",
      degreeType: "MSc",
      field: "Data Science",
    },
    {
      url: "https://www.bristol.ac.uk/study/postgraduate/taught/msc-artificial-intelligence",
      title: "Artificial Intelligence MSc",
      programName: "Artificial Intelligence MSc",
      degreeType: "MSc",
      field: "Artificial Intelligence",
    },
  ],
});
