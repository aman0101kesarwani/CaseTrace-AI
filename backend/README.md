# CaseFlow AI — Python Backend

FastAPI backend foundation for the CaseFlow AI final-year project.

## Current milestone

- Health API
- PostgreSQL persistence
- Case CRUD API
- Document upload API
- PDF page-level text extraction
- Document/page provenance storage
- Docker Compose for PostgreSQL + Neo4j

## Run

1. Copy `.env.example` to `.env`.
2. Start infrastructure:

```bash
docker compose up -d
```

3. Create a Python virtual environment and install dependencies:

```bash
python -m venv .venv
# Windows
.venv\\Scripts\\activate
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
```

4. Start FastAPI:

```bash
uvicorn app.main:app --reload
```

API: http://localhost:8000
Swagger: http://localhost:8000/docs
