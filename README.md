# NexusFocus

NexusFocus is a cognitive productivity platform with three modules:
- Student
- Developer
- Enterprise

## Stack

- Backend: FastAPI + WebSocket
- Frontend: Vite + React + Tailwind CSS
- AI: MediaPipe-oriented tracking utilities
- Database: SQLite (schema ready for PostgreSQL migration)

## Project Structure

```text
NexusFocus/
  backend/
  core/
  frontend/
  requirements.txt
```

## Quick Start

### Backend

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
