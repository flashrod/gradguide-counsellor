import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * Keele University — Computer Science MSc.
 * International per-year tuition, September/January starts. English minima
 * sit behind a country dropdown, so they stay unknown.
 */
export const keeleSource = new CuratedUniversitySource({
  id: "keele",
  universityName: "Keele University",
  universityCountry: "UK",
  universityCity: "Keele",
  universityWebsite: "https://www.keele.ac.uk",
  sourceName: "Keele — Computer Science MSc",
  programPages: [
    {
      url: "https://www.keele.ac.uk/study/postgraduatestudy/postgraduatecourses/computerscience/",
      title: "Computer Science MSc",
      programName: "Computer Science MSc",
      degreeType: "MSc",
      field: "Computer Science",
      // Page lists per-country GPA equivalencies (e.g. Nepal 2.8) with no
      // universal numeric minimum (UK requirement is a 2:2) — a single
      // extracted figure would misrepresent applicants from elsewhere.
      suppressFields: ["gpa"],
    },
    {
      url: "https://www.keele.ac.uk/study/postgraduatestudy/postgraduatecourses/artificialintelligenceanddatascience",
      title: "Artificial Intelligence and Data Science MSc",
      programName: "Artificial Intelligence and Data Science MSc",
      degreeType: "MSc",
      field: "Artificial Intelligence",
      // Same per-country equivalency template as the CS page (Nepal 2.8
      // extracted here) — no universal numeric minimum exists.
      suppressFields: ["gpa"],
    },
    {
      url: "https://www.keele.ac.uk/study/postgraduatestudy/postgraduatecourses/cybersecurity",
      title: "Cyber Security MSc",
      programName: "Cyber Security MSc",
      degreeType: "MSc",
      field: "Cybersecurity",
      suppressFields: ["gpa"],
    },
  ],
});
