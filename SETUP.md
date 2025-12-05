# Courseris Microservices Setup Guide

## Step 1: Infrastructure Setup ✅

This step has been completed. The following infrastructure has been created:

### Files Created

1. **`docker-compose.yml`** - Orchestrates all services:
   - PostgreSQL database (port 5432)
   - Auth Service (port 8001)
   - Course Service (port 8002)
   - Learning Service (port 8003)
   - Frontend (port 3000)

2. **`backend/Dockerfile`** - Multi-stage Dockerfile for Python services

3. **`Dockerfile.frontend`** - Dockerfile for React frontend

4. **`env.template`** - Environment variables template

5. **Backend Folder Structure**:
   ```
   backend/
   ├── auth-service/
   ├── course-service/
   ├── learning-service/
   └── shared/
   ```

### Next Steps

To proceed with Step 2 (Auth Service Implementation):

1. Copy `env.template` to `.env`:
   ```bash
   cp env.template .env
   ```

2. Update the `.env` file with your production secrets (especially `JWT_SECRET`)

3. The services are ready for implementation in the next steps.

### Running the Services

Once all services are implemented, you can start everything with:

```bash
docker-compose up --build
```

Or run in detached mode:

```bash
docker-compose up -d --build
```

### Service URLs

- Frontend: http://localhost:3000
- Auth Service API: http://localhost:8001
- Course Service API: http://localhost:8002
- Learning Service API: http://localhost:8003
- PostgreSQL: localhost:5432

