# AI Supported Online Exam & Performance Platform

## 1. System Overview

This platform is an AI-supported online exam and performance tracking system designed primarily for:

* YKS (TYT / AYT)
* LGS

Future expansions:

* LGS preparation for 6th and 7th grade
* YKS preparation for 10th and 11th grade

The system allows students to participate in weekly exams, track their performance, receive AI-based analysis, and compete with other students.

---

# 2. User Roles

## 2.1 Student

Students can:

* Register themselves
* Register their parents
* Take exams
* Track performance
* Compare results
* Challenge other students
* View university predictions
* Receive AI learning recommendations

## 2.2 Parent

Parents can:

* Track student performance
* Receive notifications
* View exam results
* Monitor progress

## 2.3 Admin

Admins can:

* Upload exams
* Manage exam schedules
* Manage groups
* Manage students
* View analytics
* Manage AI question generation
* Send notifications

---

# 3. Student Registration

Students create:

* Student Account
* Parent Account

Student fields:

* Name
* Surname
* School
* City
* District
* Grade
* Phone
* Email
* Target University
* Target Department

---

# 4. Groups

Groups include:

* LGS
* YKS

Future:

* Grade 6
* Grade 7
* Grade 10
* Grade 11

Each group has its own:

* Exam calendar
* Exams
* Analytics

---

# 5. Exam System

Weekly exams are conducted.

Admin defines:

* Exam name
* Exam type (TYT / AYT / LGS)
* Group
* Start time
* End time

The exam automatically:

* Opens at start time
* Closes at end time

Students can only see questions after the exam starts.

---

# 6. Exam Interface

Questions appear in **booklet format** similar to:

* ÖSYM
* MEB

Viewing options:

### Mode 1

Two-page booklet view

### Mode 2

Single page

### Mode 3

Question-by-question

Students can:

* Zoom in
* Zoom out
* Flip pages

Tablet users can write on screen.

---

# 7. Answer Submission

Students have two options:

## Digital Coding

Answers are marked directly on screen.

## Optical Form

Students download an **A4 answer sheet**, fill it manually and upload photo/PDF.

The system reads the answers automatically.

---

# 8. Notifications

System sends notifications:

* 1 day before exam
* A few hours before exam

Notification channels:

* Email
* Push notification
* SMS (optional)

---

# 9. Exam Analysis

After the exam students see:

* Correct answers
* Wrong answers
* Net score
* National ranking
* Percentile

Two result formats:

1. Standard K12 report
2. ÖSYM / MEB style report

---

# 10. AI Question Generation

Exam questions are generated using AI.

Features:

* Multiple choice
* Curriculum based
* Outcome based (kazanım)

Wrong options must be meaningful to detect misconception.

---

# 11. Learning Analytics

The system analyzes:

* Weak subjects
* Weak topics
* Learning gaps

Students receive feedback such as:

"You need improvement in Newton's Laws."

---

# 12. Exam Calendar

Each group has its own calendar.

Example:

YKS student sees only:

* TYT
* AYT exams

LGS student sees only LGS exams.

Admins can add events from panel.

---

# 13. Social Competition

Students can:

* Add friends
* Compare scores
* Challenge each other

Invitation methods:

* Email
* Social media link

Friend requests require approval.

---

# 14. Duel System

Students can challenge each other to:

* Mini tests
* Topic quizzes

This increases motivation.

---

# 15. Smart Recommendation System

Based on exam results, the system recommends:

* Private tutors
* Courses
* Study materials

Example:

If physics performance is low:

Show physics teacher advertisements.

---

# 16. University Prediction System

Students can set target universities.

Based on:

* Previous year rankings
* Percentiles
* Scores

System predicts:

Possible universities and departments.

---

# 17. AI Study Roadmap

After analysis AI generates:

* Study plan
* Weekly goals
* Topic priorities

---

# 18. Admin Panel

Admin panel includes:

* User management
* Exam management
* Question management
* AI generation control
* Analytics
* Notifications

---

# 19. Technology Stack

Frontend

Next.js
TailwindCSS
Three.js (for modern UI)

Backend

Node.js
PostgreSQL
Redis

AI

OpenAI / Claude

Infrastructure

AWS
Cloudflare
Docker

---

# 20. Core Features

AI exam generator
AI analytics
Optical form reader
Exam booklet interface
Social competition
University prediction
Personalized learning roadmap
