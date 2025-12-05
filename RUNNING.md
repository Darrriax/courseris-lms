# Running the Application

## Prerequisites

1. **Docker Desktop** must be installed and running
2. **Node.js** (v20+) and **Python** (3.11+) are available for local development

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Start Docker Desktop** if it's not already running

2. **Fix Docker Credential Helper Issue** (if you encounter credential errors):
   ```bash
   # Temporarily remove credential helper (safe for public images)
   cp ~/.docker/config.json ~/.docker/config.json.backup
   echo '{"auths": {}, "currentContext": "desktop-linux"}' > ~/.docker/config.json
   ```

3. **Start all services**:
   ```bash
   ./start.sh
   ```
   
   Or manually:
   ```bash
   docker-compose up --build -d
   ```

4. **Check service status**:
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Auth Service API: http://localhost:8001/docs
   - Course Service API: http://localhost:8002/docs
   - Learning Service API: http://localhost:8003/docs

### Option 2: Local Development (Without Docker)

#### Backend Services

1. **Set up Python virtual environment**:
   ```bash
   cd backend/auth-service
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   pip install -r ../shared/requirements.txt
   ```

2. **Set environment variables**:
   ```bash
   export DATABASE_URL="postgresql+asyncpg://courseris:courseris123@localhost:5432/courseris"
   export JWT_SECRET="your-secret-key-change-in-production"
   ```

3. **Start PostgreSQL** (if not using Docker):
   ```bash
   # Using Docker for DB only
   docker run -d --name courseris-db \
     -e POSTGRES_USER=courseris \
     -e POSTGRES_PASSWORD=courseris123 \
     -e POSTGRES_DB=courseris \
     -p 5432:5432 \
     postgres:15-alpine
   ```

4. **Run services** (in separate terminals):
   ```bash
   # Auth Service
   cd backend/auth-service
   uvicorn main:app --host 0.0.0.0 --port 8001 --reload
   
   # Course Service
   cd backend/course-service
   uvicorn main:app --host 0.0.0.0 --port 8002 --reload
   
   # Learning Service
   cd backend/learning-service
   uvicorn main:app --host 0.0.0.0 --port 8003 --reload
   ```

#### Frontend

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set environment variables** (create `.env.local`):
   ```bash
   VITE_AUTH_SERVICE_URL=http://localhost:8001
   VITE_COURSE_SERVICE_URL=http://localhost:8002
   VITE_LEARNING_SERVICE_URL=http://localhost:8003
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

## Troubleshooting

### Docker Credential Helper Error

If you see `docker-credential-desktop: executable file not found`:

1. **Option A**: Start Docker Desktop and wait for it to fully initialize
2. **Option B**: Temporarily disable credential helper:
   ```bash
   cp ~/.docker/config.json ~/.docker/config.json.backup
   echo '{"auths": {}, "currentContext": "desktop-linux"}' > ~/.docker/config.json
   ```
3. **Option C**: Reinstall Docker Desktop

### Port Already in Use

If ports are already in use:
```bash
# Check what's using the port
lsof -i :3000
lsof -i :8001
lsof -i :8002
lsof -i :8003
lsof -i :5432

# Stop conflicting services or change ports in docker-compose.yml
```

### Database Connection Issues

1. Ensure PostgreSQL container is healthy:
   ```bash
   docker-compose ps db
   docker-compose logs db
   ```

2. Check database is accessible:
   ```bash
   docker-compose exec db psql -U courseris -d courseris -c "SELECT 1;"
   ```

### Service Startup Issues

1. **View logs**:
   ```bash
   docker-compose logs -f [service_name]
   ```

2. **Rebuild services**:
   ```bash
   docker-compose build --no-cache [service_name]
   docker-compose up -d [service_name]
   ```

3. **Reset everything**:
   ```bash
   docker-compose down -v
   docker-compose up --build -d
   ```

## Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clears database)
docker-compose down -v
```

## Next Steps

Once the application is running:

1. **Register a user** via the frontend or API
2. **Login** to get a JWT token
3. **Create courses** (as a teacher)
4. **Browse catalog** and enroll in courses (as a student)
5. **Track progress** and view dashboard stats

