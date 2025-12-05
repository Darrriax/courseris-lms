# Courseris Backend Services

This directory contains the microservices backend architecture:

- `auth-service/` - Authentication and authorization service
- `course-service/` - Course management service
- `learning-service/` - Learning progress and analytics service
- `shared/` - Shared models and utilities

## Development

Each service can be run independently or via Docker Compose from the root directory:

```bash
docker-compose up
```

## Service Ports

- Auth Service: `8001`
- Course Service: `8002`
- Learning Service: `8003`
- Frontend: `3000`
- PostgreSQL: `5432`

