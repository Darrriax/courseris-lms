# Courseris - Онлайн-платформа для навчання

Courseris - це комплексна онлайн-платформа для навчання, створена з використанням React для фронтенду та Python мікросервісів для бекенду. Платформа дозволяє викладачам створювати та керувати курсами, студентам записуватися та навчатися, а адміністраторам - контролювати всю систему.
**Звіт** по розробці платформи можете переглянути [тут](./CourserisReport.docx)

![Фото](./images/2.png)
![Фото](./images/6.png)
![Фото](./images/3.png)
![Фото](./images/4.png)

<img src="./images/1.gif" alt="Фото" width="100%">

![Фото](./images/5.png)

## 🚀 Швидкий початок

### Необхідні умови

- Node.js (v18 або вище)
- Python (v3.9 або вище)
- Docker та Docker Compose
- Git

### Встановлення

1. **Встановити залежності фронтенду**
   ```bash
   npm install
   ```

2. **Встановити залежності бекенду**
   ```bash
   cd backend
   pip install -r shared/requirements.txt
   ```

3. **Налаштувати змінні середовища**
   ```bash
   cp .env.template .env
   ```

## 🏃‍♂️ Запуск додатку

### Варіант 1: **Скрипт запуску - Quick start (Рекомендовано)**:
   ```bash
   ./start.sh
   ```

### Варіант 2: Використання Docker

1. **Запустити всі сервіси за допомогою Docker Compose**
   ```bash
   docker-compose up -d
   ```

2. **Доступ до додатку**
   - Фронтенд: http://localhost:3001
   - API Gateway: http://localhost:8000
   - Auth Service: http://localhost:8001
   - Course Service: http://localhost:8002
   - Learning Service: http://localhost:8003
   - Payment Service: http://localhost:8004

### Варіант 3: Ручне налаштування

1. **Запустити бекенд сервіси**
   ```bash
   # Термінал 1 - Auth Service
   cd backend/auth-service
   python main.py

   # Термінал 2 - Course Service
   cd backend/course-service
   python main.py

   # Термінал 3 - Learning Service
   cd backend/learning-service
   python main.py
   ```

2. **Запустити фронтенд**
   ```bash
   # Термінал 4 - Frontend
   npm run dev
   ```

## 📁 Структура проєкту

```
courseris/
├── api/                    # API конфігурації
├── backend/                # Python мікросервіси
│   ├── auth-service/       # Сервіс автентифікації
│   ├── course-service/     # Сервіс управління курсами
│   ├── learning-service/   # Сервіс прогресу навчання
│   └── shared/            # Спільні моделі та утиліти
├── components/            # React компоненти
├── pages/                 # React компоненти сторінок
│   ├── admin/            # Сторінки адміністративної панелі
│   └── ...
├── utils/                # Утилітарні функції
├── constants/            # Константи додатку
├── context/              # React контексти
├── App.tsx              # Головний компонент додатку
├── index.html           # HTML шаблон
├── package.json         # Залежності фронтенду
├── docker-compose.yml   # Конфігурація Docker
└── .env                # Змінні середовища
```

## 🔧 Конфігурація

### Змінні середовища

Створіть файл `.env` в кореневій директорії:

```env
# Конфігурація фронтенду
VITE_API_BASE_URL=http://localhost:8000
VITE_COURSE_SERVICE_URL=http://localhost:8002
VITE_AUTH_SERVICE_URL=http://localhost:8001

# Конфігурація бекенду
DATABASE_URL=postgresql://user:password@localhost:5432/courseris
JWT_SECRET_KEY=**Запитайте в мене**
REDIS_URL=redis://localhost:6379
```

### Налаштування бази даних

1. **Встановити PostgreSQL**
   ```bash
   # macOS
   brew install postgresql
   
   # Ubuntu/Debian
   sudo apt-get install postgresql postgresql-contrib
   ```

2. **Створити базу даних**
   ```sql
   CREATE DATABASE courseris;
   CREATE USER courseris_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE courseris TO courseris_user;
   ```

3. **Запустити міграції**
   ```bash
   cd backend/shared
   python database.py
   ```

## 🎯 Функціонал

### Для викладачів
- Створення та управління курсами
- Завантаження матеріалів курсів та мініатюр
- Відстеження прогресу студентів
- Управління статусом курсу (чернетка, опубліковано тощо)

### Для студентів
- Перегляд та запис на курси
- Відстеження прогресу навчання
- Перегляд матеріалів курсу
- Отримання сертифікатів

### Для адміністраторів
- Управління всіма курсами та користувачами
- Перевірка та затвердження курсів
- Моніторинг активності платформи
- Управління користувачами

## 🛠️ Розробка

### Розробка фронтенду

Фронтенд побудований з використанням:
- React 18 з TypeScript
- Vite для бандлінгу
- Tailwind CSS для стилізації
- React Router для навігації
- Axios для API викликів

### Розробка бекенду

Бекенд складається з Python мікросервісів:
- FastAPI для REST API
- SQLAlchemy для бази даних ORM
- JWT для автентифікації
- PostgreSQL для зберігання даних


## 🐳 Docker сервіси

Додаток включає наступні Docker сервіси:
- Frontend (React/Vite)
- Auth Service (Python/FastAPI)
- Course Service (Python/FastAPI)
- Learning Service (Python/FastAPI)
- Payment Service (Python/FastAPI)
- PostgreSQL Database
- Redis Cache

## 📚 API документація

Документація API доступна за адресами:
- Auth Service: http://localhost:8001/docs
- Course Service: http://localhost:8002/docs
- Learning Service: http://localhost:8003/docs
- Payment Service: http://localhost:8004/docs
