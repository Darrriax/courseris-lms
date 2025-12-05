#!/bin/bash

# Start script for Courseris Microservices Application

echo "🚀 Starting Courseris Application..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.template .env
    echo "⚠️  Please update .env with your production secrets before deploying!"
fi

# Start services
echo "🐳 Starting Docker containers..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 5

# Check service health
echo "🏥 Checking service health..."
docker-compose ps

echo ""
echo "✅ Services started!"
echo ""
echo "📍 Service URLs:"
echo "   Frontend:        http://localhost:3000"
echo "   Auth Service:    http://localhost:8001"
echo "   Course Service:  http://localhost:8002"
echo "   Learning Service: http://localhost:8003"
echo ""
echo "📚 API Documentation:"
echo "   Auth Service:    http://localhost:8001/docs"
echo "   Course Service:  http://localhost:8002/docs"
echo "   Learning Service: http://localhost:8003/docs"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"

