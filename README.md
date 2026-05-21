# Student Result Management System (SRMS)

A full-stack student result management system. The front-end is plain HTML/CSS/vanilla
JavaScript; the back-end is **Spring Boot (Java 17) + SQLite** exposing a REST API. The
back-end also serves the front-end, so the whole thing deploys as **one application**.

> Previously this was a browser-only app that stored everything in `localStorage`.
> It now persists data in a real server-side database shared by all users.

## Features

- **Two roles:** Admin (full control) and Student (view own report).
- **Admin dashboard** with class-wide analytics: subject-wise average chart, pass/fail
  doughnut, top-5 performers.
- **Student CRUD** — add, edit, delete; search by name or roll number.
- **Subjects & Exams** — custom max marks, manageable exam terms.
- **Marks entry** — fast grid-style entry, one click to save.
- **Auto-calculated** percentages, A+/A/B/C/D/E/F grades, Pass/Fail (35% per subject).
- **PDF report cards** generated client-side via jsPDF.
- **Server-persisted data** in SQLite — shared across devices and users.

## Tech stack

| Layer     | Technology                                              |
|-----------|---------------------------------------------------------|
| Front-end | HTML, CSS, vanilla JS; Chart.js + jsPDF via CDN         |
| Back-end  | Spring Boot 3.3, Spring Web, Spring Data JPA            |
| Database  | SQLite (file-based) via `sqlite-jdbc` + Hibernate       |
| Build     | Maven (`pom.xml`), packaged as an executable fat JAR    |
| Deploy    | Docker (`Dockerfile`) / Render blueprint (`render.yaml`)|

## Run locally

You need **JDK 17+** and **Maven** (or use the Dockerfile — see DEPLOYMENT.md).

```bash
# build
mvn clean package

# run (creates ./srms.db on first start and seeds demo data)
java -jar target/srms.jar

# then open
open http://localhost:8080
```

To change the port: `PORT=9000 java -jar target/srms.jar`.

## Demo credentials

| Role    | Username / Roll   | Password     |
|---------|-------------------|--------------|
| Admin   | `admin`           | `admin123`   |
| Student | `S1001` … `S1006` | `student123` |

Use **"Reset demo data"** in the admin top bar (calls `POST /api/admin/reset`) to restore
the seeded students, subjects and marks at any time.

## REST API

All endpoints are under `/api`. JSON in/out.

| Method | Path                                                | Purpose                          |
|--------|-----------------------------------------------------|----------------------------------|
| POST   | `/api/auth/login`                                   | `{role, username, password}` → session |
| GET    | `/api/students` · `/api/students/{id}`              | list / fetch one                 |
| POST   | `/api/students`                                     | create                           |
| PUT    | `/api/students/{id}`                                | update                           |
| DELETE | `/api/students/{id}`                                | delete (cascades to marks)       |
| GET/POST/PUT/DELETE | `/api/subjects` (+`/{id}`)             | subject CRUD                     |
| GET/POST/DELETE | `/api/exams` (+`/{id}`)                    | exam CRUD                        |
| GET    | `/api/marks?studentId=...`                          | list marks (optionally scoped)   |
| POST   | `/api/marks`                                        | upsert by (student, subject, exam) |
| DELETE | `/api/marks?studentId=&subjectId=&examId=`          | delete one mark                  |
| POST   | `/api/admin/reset`                                  | wipe + re-seed demo data         |
| PUT    | `/api/admin/password`                               | change admin password            |

## How the front-end talks to the API

`js/data.js` keeps an in-memory cache. On each page it calls `await SRMS.init()` to load
data from the server, then read methods serve from the cache (so the render code stays
synchronous) and write methods update the cache and persist to the server in the
background. Failed writes raise a `srms:error` window event that the pages toast.

## Project structure

```
.
├── pom.xml                       # Maven build
├── Dockerfile                    # container build (used by Render/Railway)
├── render.yaml                   # Render blueprint
├── DEPLOYMENT.md                 # step-by-step deploy guide
└── src/main/
    ├── java/com/srms/
    │   ├── SrmsApplication.java   # entry point
    │   ├── config/                # CORS + startup data seeder
    │   ├── model/                 # JPA entities (Student, Subject, Exam, Mark, AdminUser)
    │   ├── repo/                  # Spring Data repositories
    │   ├── service/               # SeedService (demo seed / reset)
    │   ├── util/                  # id generator
    │   └── web/                   # REST controllers
    └── resources/
        ├── application.properties # datasource + JPA config
        └── static/                # the front-end (index/admin/student.html, css, js)
```

## Grading

- Percentage = marks / max × 100 (per subject and overall).
- Scale: **A+** ≥ 90, **A** ≥ 80, **B** ≥ 70, **C** ≥ 60, **D** ≥ 50, **E** ≥ 35, **F** < 35.
- A student **fails** the exam if any single subject is below 35%.

## Deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for Render, Railway, Docker, and VPS instructions,
including the important note about SQLite persistence on free tiers.

## Security note

Auth is intentionally simple for now: credentials are checked in plain text and the
"session" is stored client-side. Before any real-world use, add password hashing
(e.g. BCrypt) and server-side sessions/JWT, and protect the write endpoints.

## License

For educational use. Free to copy, adapt, and extend.
