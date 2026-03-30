# University Database — CS3100 Project 2

A MongoDB document database for a university system managing departments, professors, courses, students, and enrollments.

---

## Collections

| Collection | Description |
|------------|-------------|
| `departments` | Academic divisions (root collection) |
| `professors` | Faculty members with embedded sections taught |
| `courses` | Course catalog with embedded sections (professor + classroom per section) |
| `students` | Students with embedded enrollment records and grades |
| `classrooms` | Room reference collection |

---

## Prerequisites

- [MongoDB](https://www.mongodb.com/try/download/community) running locally on port `27017`
- [Node.js](https://nodejs.org/) v18+
- `mongoimport` CLI (included with MongoDB)

---

## Initialize the Database

### Option A — mongoimport (recommended)

```bash
mongoimport --db unidb --collection departments --file data/departments.json --jsonArray
mongoimport --db unidb --collection classrooms  --file data/classrooms.json  --jsonArray
mongoimport --db unidb --collection professors  --file data/professors.json  --jsonArray
mongoimport --db unidb --collection courses     --file data/courses.json     --jsonArray
mongoimport --db unidb --collection students    --file data/students.json    --jsonArray
```

### Option B — MongoDB Compass

1. Connect to `mongodb://localhost:27017`
2. Create database `unidb`
3. For each collection: **Add Data → Import JSON file** → select file from `data/`

---

## Running the Queries

```bash
npm install mongodb
node queries/queries.js
```

---

## Query Summary

| # | Query | Technique |
|---|-------|-----------|
| 1 | Student & enrollment count by department | Aggregation (`$group`, `$sum`, `$avg`, `$sort`) |
| 2 | CS students with A grade OR 3+ Fall sections | Complex search (`$or`, `$and`, `$in`, `$expr`) |
| 3 | Sections taught per professor per semester | Aggregation (`$unwind`, `$group`, `$push`) |
| 4 | Update a student's grade by course + section | Update based on query parameter (`$set` with positional `$`) |
| 5 | Student GPA leaderboard | Aggregation (`$map`, `$switch`, `$avg`) |

---

## MongoDB Logical Model — Design Decisions

| What | Strategy | Why |
|------|----------|-----|
| Sections | Embedded inside `courses` | Always queried with their course |
| Enrollments + grades | Embedded inside `students` | Always retrieved with the student |
| Sections taught | Embedded inside `professors` | Quick lookup of a prof's schedule |
| Department | Reference stub in professors/students | Independently queried and updated |
| Classrooms | Separate collection + stub in sections | Shared across many sections |

---

Youtube video url: https://youtu.be/cHvmvEFlgQE

LucidChart url: https://lucid.app/lucidchart/12faef58-cdd6-4d80-9eb6-40c797c9a4fd/edit?viewport_loc=-64%2C3600%2C2953%2C1593%2C0_0&invitationId=inv_5e4c24b4-1eea-4122-a456-d3d8c10894ed

## Project Structure

```
uni_db/
├── README.md
├── docs/
│   └── requirements.pdf              # Task 1: Reused from Project 1
├── collections/
│   └── collection_definitions.js     # Task 3: Annotated JSON examples
├── data/
│   ├── departments.json              # Task 4: Seed data
│   ├── classrooms.json
│   ├── professors.json
│   ├── courses.json
│   └── students.json
└── queries/
    └── queries.js                    # Task 5: All 5 queries
```
