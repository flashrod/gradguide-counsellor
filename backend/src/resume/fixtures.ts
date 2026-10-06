/**
 * Deterministic resume fixtures (Milestone 13, Phase 20).
 *
 * Plain-text pages as pdfjs normalization would produce them — no live
 * PDFs, no network. PDF byte-level handling is covered separately with a
 * hand-built minimal PDF in pdf.test.ts.
 */

export const CS_STUDENT_PAGES = [
  `Dylan Mascarenhas
dylan.mascarenhas@example.com | +91 98765 43210
Bengaluru, India
EDUCATION
B.E. Computer Engineering, Visvesvaraya Technological University
2019 - 2023
CGPA: 8.62/10
Relevant Coursework: Data Structures, Machine Learning, Databases
EXPERIENCE
Software Development Intern @ Acme Labs
June 2022 - August 2022
Built internal dashboards with React and FastAPI. Shipped Postgres-backed reporting.
PROJECTS
Campus Navigator
Indoor navigation prototype using React and Python. Technologies: React, Python, PostgreSQL.
SKILLS
Languages: Python, JavaScript, SQL
Frameworks: React, FastAPI
Databases: PostgreSQL
CERTIFICATIONS
AWS Certified Cloud Practitioner by Amazon Web Services, 2023`,
];

export const GPA_37_PAGES = [
  `Jane Doe
jane.doe@example.com
EDUCATION
B.S. Computer Science, State University
2018 - 2022
GPA 3.7/4.0
SKILLS
Languages: Java, Python`,
];

export const GPA_NO_SCALE_PAGES = [
  `John Smith
john.smith@example.com
EDUCATION
B.Tech Information Technology, National Institute of Technology
2020 - 2024
CGPA: 8.1
SKILLS
Languages: C++, Python`,
];

export const MULTIPLE_GPA_PAGES = [
  `Priya Nair
priya.nair@example.com
EDUCATION
B.Tech Computer Science, Anna University
2019 - 2023
CGPA: 8.4/10
Semester 6 SGPA: 9.1/10
M.Tech Data Science, Anna University
2023 - 2025
CGPA: 9.0/10`,
];

export const NO_GPA_PAGES = [
  `Alex Rao
alex.rao@example.com
EDUCATION
B.Sc Mathematics, City College
2019 - 2022
SKILLS
Languages: R, Python`,
];

export const NO_EDUCATION_PAGES = [
  `Sam Lee
sam.lee@example.com | +1 555-010-2030
SKILLS
Languages: JavaScript, TypeScript
Frameworks: React, Node.js
PROJECTS
Portfolio Site
Personal site built with Next.js. Technologies: TypeScript, React.`,
];

export const PERCENTAGE_PAGES = [
  `Rohan Iyer
rohan.iyer@example.com
EDUCATION
B.E. Mechanical, Pune University
2018 - 2022
Aggregate: 85%
Class 12 CBSE: 92%
SKILLS
Languages: Python`,
];

export const CONFUSING_DATES_PAGES = [
  `Sara Khan
sara.khan@example.com
EDUCATION
B.Tech Computer Science, Delhi Technological University
August 2019 - June 2023
CGPA: 8.62/10
EXPERIENCE
Backend Intern @ Fintech Inc
May 2022 - July 2022
Application deadline for return offers: February 1, 2023.
SKILLS
Languages: Go, Python`,
];

export const MULTI_INSTITUTION_PAGES = [
  `Elena Petrova
elena.petrova@example.com
EDUCATION
B.Sc Computer Science, University of Toronto
2017 - 2021
GPA 3.5/4.0
Exchange Semester, KTH Royal Institute of Technology
January 2020 - June 2020
MSc Artificial Intelligence, University of Amsterdam
2021 - 2023
GPA 8.0/10`,
];

export const ENGLISH_AND_WORK_PAGES = [
  `David Chen
david.chen@example.com
EDUCATION
B.Eng Software Engineering, McGill University
2019 - 2023
GPA 3.6/4.0
IELTS: 7.5
3 years of professional experience as a teaching assistant.
EXPERIENCE
Teaching Assistant @ McGill University
September 2021 - April 2023
SKILLS
Languages: Java, Python`,
];

export const INTEREST_ONLY_PAGES = [
  `Noah Brown
noah.brown@example.com
EDUCATION
B.A. History, Liberal Arts College
2019 - 2023
Interested in AI and machine learning.
SKILLS
Languages: Python`,
];
