# NexCRM — Mini CRM System

A full-stack Mini CRM built with React.js, Node.js, Express, MongoDB, and Claude AI.

## Features

- **Dashboard** — pipeline stats, stage breakdown, hot leads, recent activity
- **Contacts** — searchable table with stage filters, add/edit/delete
- **Pipeline** — Kanban board with one-click stage transitions
- **AI Insights** — per-contact analysis (summary, next action, win probability, email draft)
- **AI Chat** — conversational sales assistant with full pipeline context
- **Activity Log** — timeline of all CRM interactions

---

## Tech Stack

| Layer     | Technology                         |
|-----------|------------------------------------|
| Frontend  | React.js (Vite), IBM Plex Mono     |
| Backend   | Node.js, Express.js                |
| Database  | MongoDB (Mongoose ODM)             |
| AI        | Anthropic Claude API (claude-sonnet-4-20250514) |

---

## Quick Start

### 1. Clone & install dependencies

```bash
# Backend
npm install express mongoose cors @anthropic-ai/sdk dotenv

# Frontend (create a new Vite React project if needed)
npm create vite@latest frontend -- --template react
cd frontend
npm install
```

### 2. Configure environment variables

Create a `.env` file in the backend root:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nexcrm
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

Get your API key at: https://console.anthropic.com

### 3. Start MongoDB

Make sure MongoDB is running locally:
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Or use MongoDB Atlas (update MONGODB_URI in .env)
```

### 4. Run the backend

```bash
node server.js
# ✓ MongoDB connected
# 🚀 NexCRM API running on http://localhost:5000
```

### 5. Run the frontend

Copy `App.jsx` into your Vite React project's `src/` folder, then:

```bash
cd frontend
npm run dev
# → http://localhost:5173
```

> **Note:** The included `App.jsx` makes Anthropic API calls directly from the browser for demo purposes. In production, route all AI calls through the backend (`/api/ai/insight` and `/api/ai/chat`) to keep your API key secure.

---

## API Reference

### Contacts
| Method | Endpoint                            | Description                  |
|--------|-------------------------------------|------------------------------|
| GET    | `/api/contacts`                     | List all (supports `?stage=`, `?search=`) |
| GET    | `/api/contacts/:id`                 | Get single contact           |
| POST   | `/api/contacts`                     | Create contact               |
| PATCH  | `/api/contacts/:id`                 | Update contact               |
| DELETE | `/api/contacts/:id`                 | Delete contact               |
| POST   | `/api/contacts/:id/interactions`    | Log an interaction           |

### Dashboard & Activity
| Method | Endpoint          | Description                  |
|--------|-------------------|------------------------------|
| GET    | `/api/dashboard`  | Aggregated pipeline stats    |
| GET    | `/api/activities` | Recent activity log          |

### AI
| Method | Endpoint           | Description                           |
|--------|--------------------|---------------------------------------|
| POST   | `/api/ai/insight`  | Get AI analysis for a contact         |
| POST   | `/api/ai/chat`     | Chat with sales AI assistant          |
| GET    | `/api/health`      | Server + DB + AI status               |

---

## Project Structure

```
nexcrm/
├── server.js          # Express backend + MongoDB models
├── App.jsx            # React frontend (all-in-one)
├── .env               # Environment variables (gitignore this!)
├── package.json
└── README.md
```

---

## AI Integration

The AI features use `claude-sonnet-4-20250514` via the Anthropic API:

- **Contact Insight** — sends contact data (stage, value, notes, interaction history) and returns: situation summary, urgency level, next action, win probability (0–100), risks, and a draft follow-up email
- **Sales Chat** — full pipeline context injected as system prompt; supports multi-turn conversation

---

## MongoDB Schema

### Contact
```
name, company, email, phone
stage: new | contacted | proposal | won | lost
value: Number
notes: String
interactions: [{ type, content, date }]
assignedTo, tags, lastContact
```

### Activity
```
contact: ref(Contact)
type, action, detail
timestamps
```
