# Student Result Management System (SRMS)

A complete, browser-based student result management system built with HTML, CSS, and vanilla JavaScript. No backend, no build step — open `index.html` and it just works. All data is persisted to your browser's `localStorage`.

## Features

- **Two roles:** Admin (full control) and Student (view own report).
- **Admin dashboard** with class-wide analytics:
  - Subject-wise average chart
  - Pass / Fail distribution doughnut
  - Top 5 performers ranking
- **Student CRUD** — add, edit, delete records; search by name or roll number.
- **Subjects & Exams** — define subjects with custom max marks, manage exam terms.
- **Marks Entry** — fast grid-style entry; one click to save.
- **Auto-calculated** percentages, A+/A/B/C/D/E/F grades and Pass/Fail status (35% threshold per subject).
- **PDF report cards** generated client-side via jsPDF — school header, info table, grades table, signature line.
- **Student portal** — students see only their own marks, charts, and can download their own PDF.

## Quick start

1. Open the project folder.
2. Double-click `index.html` (or right-click → open with browser).
3. Sign in with one of the demo accounts below.

> Because the app uses CDN scripts (Chart.js, jsPDF), keep an internet connection on the first load. After that the browser caches them.

## Demo credentials

| Role    | Username / Roll | Password      |
|---------|-----------------|---------------|
| Admin   | `admin`         | `admin123`    |
| Student | `S1001`         | `student123`  |
| Student | `S1002` … `S1006` | `student123` |

Use the **"Reset demo data"** link in the admin top bar to restore the seeded students, subjects and marks at any time.

## Project structure

```
.
├── index.html        # Login page (admin / student tabs)
├── admin.html        # Admin dashboard (tabs: Dashboard, Students, Subjects, Exams, Marks, Reports)
├── student.html      # Student portal (own marks + PDF)
├── css/
│   └── style.css     # All styling
└── js/
    ├── data.js       # Data layer — localStorage CRUD, seed data, grade logic
    ├── auth.js       # Login form behavior
    ├── admin.js      # Admin dashboard + charts + PDF
    └── student.js    # Student dashboard + PDF
```

## How grading works

- Percentage = (marks obtained / max marks) × 100, computed per subject and overall.
- Grade scale:
  - **A+** ≥ 90, **A** ≥ 80, **B** ≥ 70, **C** ≥ 60, **D** ≥ 50, **E** ≥ 35, **F** < 35
- A student **fails** the exam if any single subject scores below 35%.

## Data model

| Store          | Fields                                                                |
|----------------|-----------------------------------------------------------------------|
| `srms.students`| `id, rollNo, name, class, section, dob, email, password`              |
| `srms.subjects`| `id, code, name, maxMarks`                                            |
| `srms.exams`   | `id, name, year`                                                      |
| `srms.marks`   | `id, studentId, subjectId, examId, marks`                             |
| `srms.admin`   | `username, password`                                                  |

## Tech notes

- **Persistence:** browser `localStorage`. Each browser/device keeps its own data.
- **Charts:** [Chart.js 4](https://www.chartjs.org/) via CDN.
- **PDF:** [jsPDF](https://github.com/parallax/jsPDF) + `jspdf-autotable` via CDN.
- **No build step**, no dependencies installed locally — pure static files.

## Resetting / clearing data

- Admin → top bar → **Reset demo data** restores everything to the seeded defaults.
- To wipe completely, open DevTools → Application → Local Storage → delete all `srms.*` keys, then refresh.

## License

For educational use. Free to copy, adapt, and extend.
