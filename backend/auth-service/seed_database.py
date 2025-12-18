"""
Database seeding script to populate the system with test data
- 50 students
- 10 teachers
- 1-5 courses per teacher with modules, lessons, quizzes, and articles
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
    "Digital Marketing": "Master online marketing strategies and tools.",
    "Business Analytics": "Analyze business data to drive strategic decisions.",
    "Project Management": "Lead projects successfully using proven methodologies.",
    "Python Programming": "Learn Python from basics to advanced concepts.",
    "JavaScript Fundamentals": "Master the core concepts of JavaScript programming.",
    "React Development": "Build modern web applications with React library.",
    "Node.js Backend": "Create scalable server-side applications with Node.js.",
    "Database Design": "Design efficient and scalable database systems.",
    "API Development": "Build RESTful and GraphQL APIs.",
    "Blockchain": "Understand blockchain technology and cryptocurrency.",
    "Game Development": "Create engaging games using modern engines.",
    "iOS Development": "Build native iOS applications with Swift.",
    "Android Development": "Develop Android apps with Kotlin.",
    "Flutter": "Create cross-platform apps with Flutter framework.",
    "Vue.js": "Build reactive web applications with Vue.js.",
    "Angular": "Develop enterprise applications with Angular.",
    "Docker & Kubernetes": "Containerize and orchestrate applications.",
    "AWS Cloud": "Master Amazon Web Services cloud platform.",
    "Azure": "Learn Microsoft Azure cloud services.",
    "Google Cloud": "Utilize Google Cloud Platform services.",
    "Ethical Hacking": "Learn penetration testing and security auditing.",
    "Network Security": "Secure network infrastructure and communications.",
    "Cryptography": "Understand encryption and security protocols."
}

LESSON_TYPES = ["video", "article", "quiz"]

ARTICLE_CONTENT = """
# Introduction

This comprehensive lesson will guide you through the fundamental concepts and practical applications. 
You'll learn step-by-step how to implement these techniques in real-world scenarios.

## Key Concepts

1. **Foundation**: Understanding the basic principles
2. **Implementation**: Practical coding examples
3. **Best Practices**: Industry-standard approaches
4. **Common Pitfalls**: What to avoid

## Detailed Explanation

The core concept revolves around creating efficient and maintainable solutions. By following 
established patterns and practices, you can ensure your work is scalable and robust.

### Example Code

```python
def example_function():
    # Implementation details
    return "Success"
```

## Summary

By the end of this lesson, you should have a solid understanding of the topic and be able to 
apply these concepts in your own projects.
"""

QUIZ_CONTENT = {
    "questions": [
        {
            "question": "What is the main purpose of this concept?",
            "options": [
                "To improve performance",
                "To enhance security",
                "To simplify code",
                "All of the above"
            ],
            "correct_answer": 3
        },
        {
            "question": "Which approach is considered best practice?",
            "options": [
                "Quick and dirty solutions",
                "Well-documented and tested code",
                "Copy-paste from Stack Overflow",
                "Avoiding comments"
            ],
            "correct_answer": 1
        },
        {
            "question": "What should you prioritize when coding?",
            "options": [
                "Speed over quality",
                "Readability and maintainability",
                "Complex algorithms",
                "Minimal documentation"
            ],
            "correct_answer": 1
        }
    ]
}


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
                    "gender": random.choice(["MALE", "FEMALE"])
                },
                timeout=10.0
            )
            if response.status_code == 200:
                print(f"✓ Created {role}: {email} ({first_name} {last_name})")
                return response.json()
            else:
                print(f"✗ Failed to create {email}: {response.text}")
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
                data={
                    "username": email,
                    "password": password
                },
                timeout=10.0
            )
            if response.status_code == 200:
                return response.json().get("access_token")
            return None
        except Exception as e:
            print(f"✗ Login error for {email}: {e}")
            return None


async def create_course(token: str, course_data: dict):
    """Create a course"""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{COURSE_SERVICE_URL}/courses",
                json=course_data,
                headers={"Authorization": f"Bearer {token}"},
                timeout=30.0
            )
            if response.status_code == 200:
                course = response.json()
                print(f"  ✓ Created course: {course_data['title']}")
                return course
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
    print(f"✓ Created {len(students)} students")
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
                    lesson_type = random.choice(LESSON_TYPES)
                    
                    lesson = {
                        "title": f"Lesson {lesson_idx + 1}: {random.choice(['Introduction', 'Deep Dive', 'Practical', 'Advanced', 'Review'])}",
                        "duration": f"{random.randint(5, 30)} min",
                        "type": lesson_type,
                        "content": QUIZ_CONTENT if lesson_type == "quiz" else ARTICLE_CONTENT
                    }
                    lessons.append(lesson)
                
                module = {
                    "title": f"Module {module_idx + 1}: {random.choice(['Fundamentals', 'Core Concepts', 'Advanced Topics', 'Practical Applications', 'Best Practices'])}",
                    "lessons": lessons
                }
                modules.append(module)
            
            # Determine price
            price = random.choice([0, 0, 9.99, 19.99, 29.99, 49.99, 99.99])
            
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
    
    print(f"\n✓ Created {len(teachers)} teachers with their courses")
    return teachers


async def main():
    """Main seeding function"""
    print("=" * 60)
    print("🌱 DATABASE SEEDING SCRIPT")
    print("=" * 60)
    print("\nThis will populate the database with:")
    print("  • 50 students (student1@gmail.com - student50@gmail.com)")
    print("  • 10 teachers (teacher1@gmail.com - teacher10@gmail.com)")
    print("  • 1-5 courses per teacher with modules, lessons, quizzes, and articles")
    print("\nPassword for all users: 123456")
    print("=" * 60)
    
    # Seed students
    students = await seed_students()
    
    # Seed teachers and courses
    teachers = await seed_teachers_and_courses()
    
    print("\n" + "=" * 60)
    print("✅ DATABASE SEEDING COMPLETED!")
    print("=" * 60)
    print(f"\nSummary:")
    print(f"  • Students created: {len(students)}")
    print(f"  • Teachers created: {len(teachers)}")
    print(f"\nYou can now login with any of these accounts:")
    print(f"  • student1@gmail.com / 123456")
    print(f"  • teacher1@gmail.com / 123456")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
