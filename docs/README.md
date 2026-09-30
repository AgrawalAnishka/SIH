# GovLaunch — Government–Startup Innovation Procurement Platform

> **Smart India Hackathon 2026**
> PS ID: SIH2026-26136
> Theme: Governance / E-Governance / Innovation & Entrepreneurship
> Team: NSUT

---

## Problem Statement

Government departments face operational challenges that startups can solve, but conventional procurement is designed for established vendors — not early-stage innovators. Departments struggle to formulate outcome-based challenges, discover startups, evaluate innovative technologies, and structure milestone-based contracts. Startups face turnover requirements, long sales cycles, and limited visibility into government demand.

**GovLaunch bridges this gap.**

---

## Proposed Solution

A centralised innovation-procurement platform providing a transparent, competitive pathway:

**Challenge Identification → Startup Discovery → Evaluation → Pilot → Validation → Procurement → Scale-Up**

---

## Key Features

### Government Department
- Post outcome-based challenges with eligibility rules, budget ceiling, and timeline
- Manage applications through a structured pipeline (submitted → screening → eligible → under evaluation → shortlisted → contracted)
- Generate auto-drafted pilot contracts (PDF) with IP, data, and cybersecurity clauses
- Run AI-powered duplicate/novelty checks on submissions (Supervision layer)
- Discover and adopt successful pilots from other departments (Scale-Up Catalog)
- Finalize evaluation rounds to update startup ratings

### Startup
- Discover open government challenges filtered by sector
- Apply with solution brief, proposed timeline, and budget quote
- Track application status with eligibility results and evaluation scores
- Earn a merit-based rating (starts at 1000) updated after each evaluation round
- Unlock achievement badges (first application, prototype builder, contract winner)
- Submit prototype demos for Round 2 evaluation

### Evaluator
- Score applications across two rounds (Round 1: Application, Round 2: Prototype)
- 5 evaluation dimensions: Problem-Solution Fit, Innovation, Feasibility, Impact & Sustainability, Presentation (0–10 each, max 50)
- **Sahayak AI Engine** — AI-powered priority queue, submission summaries, flags, category classification, and "Improve Response" rewrite tool
- Declare conflict of interest per application

### Admin
- View full audit trail (every actor action timestamped)
- Reset and re-seed demo data

---

## Sahayak AI Engine (Evaluator AI Assistant)

Sahayak is the built-in AI engine for evaluators, powered by the Gemini API (with a deterministic MockProvider for offline/demo use).

- **Per-submission analysis**: summary, key points, main issue, category, severity, priority score (0–100), flags
- **Priority queue**: AI-ranked list of submissions per challenge with filters (priority, severity, category, flag)
- **PS-level insights**: clustering of similar submissions, overall summary, stats (priority/severity/category distribution)
- **Improve Response**: 5 rewrite modes (Professional, Concise, Formal, Simple, Structured) with fact-drift validation
- **Evaluator overrides**: override any AI classification; original AI value preserved in audit log
- **Zero API key required**: works fully in MockProvider (demo mode)

---

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, inline styles, motion/react, lucide-react |
| Backend | Django 5, Django REST Framework, SQLite |
| Auth | Session-based + Google OAuth (GIS) |
| AI Chatbot (KIRA) | Gemini API (gemini-3.8-flash), rule-based fallback |
| AI Engine (Sahayak) | Gemini API, MockProvider, TF-IDF clustering |
| PDF Generation | WeasyPrint + Jinja2 |
| Multilingual | i18next (8 languages: EN, HI, MR, BN, TA, TE, KN, ML) |

---

## Demo Accounts

| Role | Username | Password |
|---|---|---|
| Department | `health.dept` | `demo1234` |
| Department | `defence.dept` | `demo1234` |
| Department | `niti.dept` | `demo1234` |
| Startup | `meditriage-ai` | `demo1234` |
| Startup | `agrosense-labs` | `demo1234` |
| Evaluator | `evaluator1` | `demo1234` |
| Evaluator | `evaluator2` | `demo1234` |
| Admin | `admin` | `demo1234` |

---

## Setup & Run

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo_data
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
Copy `backend/.env.example` to `backend/.env` and fill in:
```
GOOGLE_OAUTH_CLIENT_ID=...
GEMINI_API_KEY=...         # For KIRA chatbot + Sahayak AI
LLM_PROVIDER=gemini        # or mock for offline demo
```

---

## Project Structure

```
SIH/
├── backend/
│   ├── core/              # Main app: models, views, URLs, eligibility, badges
│   ├── kira/              # KIRA AI chatbot
│   ├── ai_assist/         # Sahayak evaluator AI engine
│   └── govlaunch/         # Django settings, URLs
├── frontend/
│   ├── src/
│   │   ├── pages/         # All page components
│   │   ├── components/    # Shared UI components
│   │   ├── features/
│   │   │   ├── kira/      # KIRA chatbot widget
│   │   │   └── ai-assist/ # Sahayak AI frontend
│   │   └── lib/api.js     # Central API client
└── docs/
    └── README.md          # This file
```

---

## End-to-End Workflow

```
Department posts Challenge
        ↓
Startup discovers & applies
        ↓
Eligibility screening (automated)
        ↓
AI analysis by Sahayak (priority, flags, summary)
        ↓
Evaluator reviews priority queue & scores submissions
        ↓
Department shortlists & starts Prototype phase
        ↓
Startup submits prototype demo
        ↓
Round 2 evaluation
        ↓
Contract auto-generated (PDF)
        ↓
Successful pilot added to Scale-Up Catalog
        ↓
Other departments adopt the solution
```

---

*GovLaunch — Turning Government Challenges into Scalable Startup Innovations.*
*Smart India Hackathon 2026 | NSUT*
