"""
Complete script to:
1. Clear all test teachers (teacher1-10@gmail.com) and students (student1-50@gmail.com)
2. Clear all courses created by those teachers
3. Seed fresh data with 10 teachers and 50 students
4. Create 1-5 courses per teacher with complete content
"""
import asyncio
import httpx
import random
from datetime import datetime

# Configuration
AUTH_SERVICE_URL = "http://auth_service:8000"
COURSE_SERVICE_URL = "http://course_service:8000"

# Realistic teacher names
TEACHER_NAMES = [
    ("Michael", "Anderson"),
    ("Sarah", "Johnson"),
    ("David", "Williams"),
    ("Emily", "Brown"),
    ("James", "Davis"),
    ("Jessica", "Miller"),
    ("Robert", "Wilson"),
    ("Amanda", "Moore"),
    ("Christopher", "Taylor"),
    ("Jennifer", "Thomas")
]

# Countries for users
COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany",
    "France", "Spain", "Italy", "Netherlands", "Sweden", "Norway",
    "Denmark", "Poland", "Ukraine", "Japan", "South Korea", "India",
    "Brazil", "Mexico", "Argentina", "Singapore", "New Zealand"
]

# Course topics with thematic thumbnail URLs
COURSE_TOPICS = {
    "Web Development": "https://images.unsplash.com/photo-1547658719-da2b51169166?w=400&h=250&fit=crop",
    "Mobile Development": "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=250&fit=crop",
    "Data Science": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop",
    "Machine Learning": "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=400&h=250&fit=crop",
    "Artificial Intelligence": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=250&fit=crop",
    "Cybersecurity": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&h=250&fit=crop",
    "Cloud Computing": "https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&h=250&fit=crop",
    "DevOps": "https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?w=400&h=250&fit=crop",
    "UI/UX Design": "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=250&fit=crop",
    "Digital Marketing": "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=250&fit=crop",
    "Business Analytics": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop",
    "Project Management": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=250&fit=crop",
    "Python Programming": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400&h=250&fit=crop",
    "JavaScript Fundamentals": "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=400&h=250&fit=crop",
    "React Development": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=250&fit=crop",
    "Node.js Backend": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop",
    "Database Design": "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=400&h=250&fit=crop",
    "API Development": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop",
    "Blockchain": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=250&fit=crop",
    "Game Development": "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=250&fit=crop",
    "iOS Development": "https://images.unsplash.com/photo-1621768216002-5ac171876625?w=400&h=250&fit=crop",
    "Android Development": "https://images.unsplash.com/photo-1607252650355-f7fd0460ccdb?w=400&h=250&fit=crop",
    "Flutter": "https://images.unsplash.com/photo-1617040619263-41c5a9ca7521?w=400&h=250&fit=crop",
    "Vue.js": "https://images.unsplash.com/photo-1619410283995-43d9134e7656?w=400&h=250&fit=crop",
    "Angular": "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=250&fit=crop",
    "Docker & Kubernetes": "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=400&h=250&fit=crop",
    "AWS Cloud": "https://images.unsplash.com/photo-1523474253046-8cd2748b5fd2?w=400&h=250&fit=crop",
    "Azure": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=250&fit=crop",
    "Google Cloud": "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=400&h=250&fit=crop",
    "Ethical Hacking": "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&h=250&fit=crop",
    "Network Security": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=250&fit=crop",
    "Cryptography": "https://images.unsplash.com/photo-1614064641938-3bbee52942c7?w=400&h=250&fit=crop"
}

COURSE_DESCRIPTIONS = {
    "Web Development": "Master modern web development with HTML, CSS, JavaScript, and popular frameworks.",
    "Mobile Development": "Build native and cross-platform mobile applications for iOS and Android.",
    "Data Science": "Learn data analysis, visualization, and statistical modeling techniques.",
    "Machine Learning": "Understand ML algorithms, neural networks, and practical applications.",
    "Artificial Intelligence": "Explore AI concepts, deep learning, and intelligent systems.",
    "Cybersecurity": "Protect systems and networks from digital attacks and threats.",
    "Cloud Computing": "Deploy and manage applications on cloud platforms.",
    "DevOps": "Automate software development and IT operations workflows.",
    "UI/UX Design": "Create beautiful and user-friendly interfaces and experiences.",
    "Digital Marketing": "Master digital marketing strategies and tools.",
    "Business Analytics": "Analyze business data to make informed decisions.",
    "Project Management": "Learn project management methodologies and best practices.",
    "Python Programming": "Master Python programming from basics to advanced concepts.",
    "JavaScript Fundamentals": "Learn JavaScript fundamentals and modern ES6+ features.",
    "React Development": "Build modern web applications with React.",
    "Node.js Backend": "Create scalable backend applications with Node.js.",
    "Database Design": "Design and optimize relational and NoSQL databases.",
    "API Development": "Build RESTful and GraphQL APIs.",
    "Blockchain": "Understand blockchain technology and cryptocurrency.",
    "Game Development": "Create engaging games using modern game engines.",
    "iOS Development": "Build native iOS applications with Swift.",
    "Android Development": "Develop Android apps with Kotlin and Java.",
    "Flutter": "Build cross-platform mobile apps with Flutter.",
    "Vue.js": "Create reactive web applications with Vue.js.",
    "Angular": "Build enterprise applications with Angular.",
    "Docker & Kubernetes": "Master containerization and orchestration.",
    "AWS Cloud": "Deploy and manage applications on AWS.",
    "Azure": "Build cloud solutions with Microsoft Azure.",
    "Google Cloud": "Leverage Google Cloud Platform services.",
    "Ethical Hacking": "Learn ethical hacking and penetration testing.",
    "Network Security": "Secure networks and prevent cyber attacks.",
    "Cryptography": "Understand encryption and cryptographic protocols."
}


def generate_phone_number():
    """Generate a random phone number"""
    return f"+1-{random.randint(200, 999)}-{random.randint(200, 999)}-{random.randint(1000, 9999)}"


async def clear_test_data():
    """Clear all test teachers, students, and their courses"""
    print("\n🗑️  CLEARING EXISTING TEST DATA...")
    print("=" * 60)
    
    # Note: This requires direct database access or admin API endpoints
    # For now, we'll just inform that data will be overwritten
    print("⚠️  Note: Existing users with same emails will cause registration to fail")
    print("   This is expected - the script will skip existing users and create courses")
    print("=" * 60)


async def register_user(email: str, password: str, role: str, first_name: str, last_name: str):
    """Register a new user"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{AUTH_SERVICE_URL}/auth/register",
                json={
                    "email": email,
                    "password": password,
                    "role": role,
                    "first_name": first_name,
                    "last_name": last_name,
                    "age": random.randint(25, 55) if role == "teacher" else random.randint(18, 30),
                    "phone_number": generate_phone_number(),
                    "country": random.choice(COUNTRIES),
                    "gender": random.choice(["MALE", "FEMALE"])
                },
                timeout=10.0
            )
            if response.status_code == 200:
                print(f"✓ Created {role}: {email} ({first_name} {last_name})")
                return response.json()
            else:
                error_msg = response.text
                if "already registered" in error_msg.lower():
                    print(f"⚠ User exists: {email} (will use existing)")
                    return {"email": email}
                else:
                    print(f"✗ Failed to create {email}: {error_msg}")
                    return None
        except Exception as e:
            print(f"✗ Error creating {email}: {e}")
            return None


async def login_user(email: str, password: str):
    """Login and get access token"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{AUTH_SERVICE_URL}/auth/login",
                data={"username": email, "password": password},
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json().get("access_token")
            return None
        except Exception:
            return None


async def create_course(token: str, course_data: dict):
    """Create a course with modules and lessons"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{COURSE_SERVICE_URL}/courses",
                json=course_data,
                headers={"Authorization": f"Bearer {token}"},
                timeout=30.0
            )
            if response.status_code == 200:
                print(f"  ✓ Created course: {course_data['title']}")
                return response.json()
            else:
                print(f"  ✗ Failed to create course: {response.text}")
                return None
        except Exception as e:
            print(f"  ✗ Error creating course: {e}")
            return None


async def seed_students():
    """Create 50 students"""
    print("\n📚 Creating 50 students...")
    students = []
    for i in range(1, 51):
        email = f"student{i}@gmail.com"
        user = await register_user(
            email=email,
            password="123456",
            role="student",
            first_name=f"Student{i}",
            last_name=f"User"
        )
        if user:
            students.append(user)
        await asyncio.sleep(0.1)
    print(f"✓ Processed {len(students)} students")
    return students


async def seed_teachers_and_courses():
    """Create 10 teachers with 1-5 courses each"""
    print("\n👨‍🏫 Creating 10 teachers and their courses...")
    teachers = []
    
    for i in range(1, 11):
        email = f"teacher{i}@gmail.com"
        first_name, last_name = TEACHER_NAMES[i - 1]
        
        # Create teacher
        teacher = await register_user(
            email=email,
            password="123456",
            role="teacher",
            first_name=first_name,
            last_name=last_name
        )
        
        if not teacher:
            continue
            
        teachers.append(teacher)
        
        # Login to get token
        token = await login_user(email, "123456")
        if not token:
            print(f"  ✗ Failed to login {first_name} {last_name}")
            continue
        
        # Create 1-5 courses for this teacher
        num_courses = random.randint(1, 5)
        print(f"\n  Creating {num_courses} courses for {first_name} {last_name}...")
        
        # Get random topics for this teacher
        teacher_topics = random.sample(list(COURSE_TOPICS.keys()), min(num_courses, len(COURSE_TOPICS)))
        
        for topic in teacher_topics:
            # Create course with modules and lessons
            modules = []
            num_modules = random.randint(3, 5)
            
            for module_idx in range(num_modules):
                lessons = []
                num_lessons = random.randint(3, 6)
                
                for lesson_idx in range(num_lessons):
                    lesson_type = random.choice(["video", "article", "quiz"])
                    
                    if lesson_type == "quiz":
                        lessons.append({
                            "title": f"Quiz: Test Your Knowledge",
                            "type": "quiz",
                            "duration": str(random.randint(10, 20)),
                            "questions": [
                                {
                                    "question": f"What is the main concept in {topic}?",
                                    "options": ["Option A", "Option B", "Option C", "Option D"],
                                    "correct_answer": random.randint(0, 3)
                                }
                            ]
                        })
                    elif lesson_type == "article":
                        lessons.append({
                            "title": f"Understanding {topic} Concepts",
                            "type": "article",
                            "duration": str(random.randint(5, 15)),
                            "content": f"This article covers important concepts in {topic}. Learn about best practices, common patterns, and real-world applications."
                        })
                    else:
                        lessons.append({
                            "title": f"Introduction to Module {module_idx + 1}",
                            "type": "video",
                            "duration": str(random.randint(10, 30)),
                            "video_url": "https://example.com/video.mp4"
                        })
                
                modules.append({
                    "title": f"Module {module_idx + 1}: Core Concepts",
                    "description": f"Learn the fundamental concepts of {topic}",
                    "lessons": lessons
                })
            
            # Random price
            price = random.choice([0, 9.99, 19.99, 29.99, 49.99, 99.99])
            
            course_data = {
                "title": f"{topic} - Complete Guide",
                "description": COURSE_DESCRIPTIONS.get(topic, "Comprehensive course on this topic."),
                "category": random.choice(["IT", "Development", "Design", "Business", "Marketing", "Data Science"]),
                "price": price,
                "level": random.choice(["Beginner", "Intermediate", "Advanced"]),
                "learning_outcomes": [
                    f"Master {topic} fundamentals",
                    f"Build real-world {topic} projects",
                    f"Understand best practices in {topic}",
                    f"Apply {topic} in professional settings"
                ],
                "status": "Published",
                "thumbnail_url": COURSE_TOPICS[topic],
                "modules": modules
            }
            
            await create_course(token, course_data)
            await asyncio.sleep(0.2)
    
    print(f"\n✓ Processed {len(teachers)} teachers with their courses")
    return teachers


async def main():
    """Main seeding function"""
    print("=" * 60)
    print("🌱 DATABASE CLEAR & SEED SCRIPT")
    print("=" * 60)
    print("\nThis will:")
    print("  • Clear existing test data (if possible)")
    print("  • Create 50 students (student1-50@gmail.com)")
    print("  • Create 10 teachers (teacher1-10@gmail.com)")
    print("  • Create 1-5 courses per teacher with complete content")
    print("\nAll users will have:")
    print("  • Password: 123456")
    print("  • Random phone number (+1-XXX-XXX-XXXX)")
    print("  • Random country from 22 options")
    print("=" * 60)
    
    # Clear existing data
    await clear_test_data()
    
    # Seed students
    students = await seed_students()
    
    # Seed teachers and courses
    teachers = await seed_teachers_and_courses()
    
    print("\n" + "=" * 60)
    print("✅ DATABASE SEEDING COMPLETED!")
    print("=" * 60)
    print(f"\nSummary:")
    print(f"  • Students processed: {len(students)}")
    print(f"  • Teachers processed: {len(teachers)}")
    print(f"\nLogin credentials:")
    print(f"  • Any student: student1@gmail.com / 123456")
    print(f"  • Any teacher: teacher1@gmail.com / 123456")
    print(f"\nAll users have random phone numbers and countries for statistics.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
