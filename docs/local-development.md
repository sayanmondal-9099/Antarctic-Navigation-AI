# Local Development & Startup Guide

This document outlines how to rapidly spin up the application for the Hackathon Demonstration locally.

## Prerequisites
- Node.js (v18+)
- Python 3.13+
- `uv` package manager (optional, but recommended for speed)

## Startup Commands

### 1. Start the Backend
Open a terminal and run the following commands:
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
*(If using `uv`, you can just run `uv run uvicorn app.main:app --reload --port 8000`)*

The backend will start at `http://localhost:8000`. You can verify its health at `http://localhost:8000/api/health`.

### 2. Start the Frontend
Open a new terminal tab/window:
```bash
cd frontend
npm install
npm run dev
```

The frontend will start at `http://localhost:5173`. 

### Running in Strict Offline Mode
If you are entirely disconnected from the internet, the backend will gracefully fallback to cached `.json` datasets.
To strictly enforce this (e.g. if the network is just slow/flaky), you can ensure `DEMO_MODE=true` in your `.env` configuration.
