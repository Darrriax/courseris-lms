<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Courseris - Online Learning Platform

Courseris is a comprehensive online learning platform built with React frontend and Python microservices backend. This platform allows teachers to create and manage courses, students to enroll and learn, and administrators to oversee the entire system.

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Python (v3.9 or higher)
- Docker and Docker Compose
- Git

### Installation

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd courseris
   ```

2. **Install frontend dependencies**
   ```bash
   npm install
   ```

3. **Install backend dependencies**
   ```bash
   cd backend
   pip install -r shared/requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.template .env
   # Edit .env file with your configuration
   ```

## 🏃‍♂️ Running the Application

### Option 1: Using Docker (Recommended)

1. **Start all services with Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Access the application**
   - Frontend: http://localhost:3001
   - API Gateway: http://localhost:8000
   - Auth Service: http://localhost:8001
   - Course Service: http://localhost:8002
   - Learning Service: http://localhost:8003

### Option 2: Manual Setup

1. **Start backend services**
   ```bash
   # Terminal 1 - Auth Service
   cd backend/auth-service
   python main.py

   # Terminal 2 - Course Service
   cd backend/course-service
   python main.py

   # Terminal 3 - Learning Service
   cd backend/learning-service
   python main.py
   ```

2. **Start frontend**
   ```bash
   # Terminal 4 - Frontend
   npm run dev
   ```

## 📁 Project Structure

```
courseris/
├── api/                    # API configurations
├── backend/                # Python microservices
│   ├── auth-service/       # Authentication service
│   ├── course-service/     # Course management service
│   ├── learning-service/   # Learning progress service
│   └── shared/            # Shared models and utilities
├── components/            # React components
├── pages/                 # React page components
│   ├── admin/            # Admin panel pages
│   └── ...
├── utils/                # Utility functions
├── constants/            # Application constants
├── context/              # React contexts
├── App.tsx              # Main application component
├── index.html           # HTML template
├── package.json         # Frontend dependencies
├── docker-compose.yml   # Docker configuration
└── .env                # Environment variables
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in root directory:

```env
# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000
VITE_COURSE_SERVICE_URL=http://localhost:8002
VITE_AUTH_SERVICE_URL=http://localhost:8001

# Backend Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/courseris
JWT_SECRET_KEY=your-secret-key
REDIS_URL=redis://localhost:6379
```

### Database Setup

1. **Install PostgreSQL**
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Create database**
   ```sql
   CREATE DATABASE courseris;
   CREATE USER courseris_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE courseris TO courseris_user;
   ```

3. **Run migrations**
   ```bash
   cd backend/shared
   python database.py
   ```

## 🎯 Features

### For Teachers
- Create and manage courses
- Upload course materials and thumbnails
- Track student progress
- Manage course status (draft, published, etc.)

### For Students
- Browse and enroll in courses
- Track learning progress
- View course content
- Receive certificates

### For Administrators
- Manage all courses and users
- Review and approve courses
- Monitor platform activity
- User management

## 🛠️ Development

### Frontend Development

The frontend is built with:
- React 18 with TypeScript
- Vite for bundling
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls

### Backend Development

The backend consists of Python microservices:
- FastAPI for REST APIs
- SQLAlchemy for database ORM
- JWT for authentication
- PostgreSQL for data storage

### Common Development Commands

```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Backend
python -m pytest    # Run tests
python -m flake8    # Code linting
```

## 🐳 Docker Services

The application includes the following Docker services:
- Frontend (React/Vite)
- Auth Service (Python/FastAPI)
- Course Service (Python/FastAPI)
- Learning Service (Python/FastAPI)
- PostgreSQL Database
- Redis Cache

## 🔍 Troubleshooting

### Common Issues

1. **Port conflicts**: If ports are in use, the application will automatically try alternative ports
2. **Database connection**: Ensure PostgreSQL is running and credentials are correct
3. **CORS issues**: Check that API URLs in `.env` match your setup

### Logs

- Frontend logs: Check browser console
- Backend logs: Check terminal output or Docker logs
- Database logs: Check PostgreSQL logs

## 📚 API Documentation

API documentation is available at:
- Auth Service: http://localhost:8001/docs
- Course Service: http://localhost:8002/docs
- Learning Service: http://localhost:8003/docs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review existing issues for solutions
