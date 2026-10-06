import { CuratedUniversitySource } from "../universityWebsite.js";

/**
 * University of Sheffield — Computer Science MSc.
 * September start, 1-year; fee and English detail behind links, so those
 * stay unknown unless stated on the page.
 */
export const sheffieldSource = new CuratedUniversitySource({
  id: "sheffield",
  universityName: "University of Sheffield",
  universityCountry: "UK",
  universityCity: "Sheffield",
  universityWebsite: "https://www.sheffield.ac.uk",
  sourceName: "Sheffield — Computer Science MSc",
  programPages: [
    {
      url: "https://www.sheffield.ac.uk/postgraduate/taught/courses/2027/computer-science-msc",
      title: "Computer Science MSc",
    },
    {
      url: "https://www.sheffield.ac.uk/postgraduate/taught/courses/2027/artificial-intelligence-msc",
      title: "Artificial Intelligence MSc",
    },
    {
      url: "https://www.sheffield.ac.uk/postgraduate/taught/courses/2027/data-science-msc",
      title: "Data Science MSc",
    },
  ],
});
