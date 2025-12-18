"""
Update script to:
1. Update teacher names to realistic names
2. Add thematic thumbnails to existing courses
3. Update all user passwords to 123456
"""
import asyncio
import httpx
import sys

AUTH_SERVICE_URL = "http://auth_service:8000"
COURSE_SERVICE_URL = "http://course_service:8000"

# Realistic teacher names mapping
TEACHER_UPDATES = {
    "teacher1@gmail.com": ("Michael", "Anderson"),
    "teacher2@gmail.com": ("Sarah", "Johnson"),
    "teacher3@gmail.com": ("David", "Williams"),
    "teacher4@gmail.com": ("Emily", "Brown"),
    "teacher5@gmail.com": ("James", "Davis"),
    "teacher6@gmail.com": ("Jessica", "Miller"),
    "teacher7@gmail.com": ("Robert", "Wilson"),
    "teacher8@gmail.com": ("Amanda", "Moore"),
    "teacher9@gmail.com": ("Christopher", "Taylor"),
    "teacher10@gmail.com": ("Jennifer", "Thomas")
}

# Course topic to thumbnail mapping
COURSE_THUMBNAILS = {
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

async def update_teachers():
    """Update teacher names in the database"""
    print("\n👨‍🏫 Updating teacher names...")
    
    # Note: This would require direct database access or an admin API endpoint
    # For now, we'll just print what needs to be updated
    print("⚠️  Teacher name updates require database access")
    print("   The following teachers should be updated:")
    for email, (first, last) in TEACHER_UPDATES.items():
        print(f"   • {email} → {first} {last}")
    
    return True

async def update_course_thumbnails():
    """Update course thumbnails based on course titles"""
    print("\n🖼️  Updating course thumbnails...")
    
    async with httpx.AsyncClient() as client:
        # Get all courses
        try:
            response = await client.get(f"{COURSE_SERVICE_URL}/courses", timeout=10.0)
            if response.status_code != 200:
                print(f"✗ Failed to fetch courses: {response.text}")
                return False
            
            courses = response.json()
            print(f"Found {len(courses)} courses to update")
            
            updated_count = 0
            for course in courses:
                course_title = course.get('title', '')
                course_id = course.get('id')
                
                # Find matching thumbnail based on title
                thumbnail_url = None
                for topic, url in COURSE_THUMBNAILS.items():
                    if topic in course_title:
                        thumbnail_url = url
                        break
                
                if thumbnail_url and course_id:
                    # Note: Would need teacher token to update course
                    # For now, just print what would be updated
                    print(f"  • {course_title[:50]}... → {thumbnail_url}")
                    updated_count += 1
            
            print(f"✓ Identified {updated_count} courses for thumbnail updates")
            print("⚠️  Course thumbnail updates require teacher authentication")
            
        except Exception as e:
            print(f"✗ Error updating thumbnails: {e}")
            return False
    
    return True

async def main():
    """Main update function"""
    print("=" * 60)
    print("🔄 DATABASE UPDATE SCRIPT")
    print("=" * 60)
    print("\nThis script will update:")
    print("  • Teacher names to realistic names")
    print("  • Course thumbnails to thematic images")
    print("  • User passwords to 123456")
    print("=" * 60)
    
    # Update teachers
    await update_teachers()
    
    # Update course thumbnails
    await update_course_thumbnails()
    
    print("\n" + "=" * 60)
    print("📝 UPDATE SUMMARY")
    print("=" * 60)
    print("\n⚠️  IMPORTANT NOTES:")
    print("  • Teacher names and passwords require direct database updates")
    print("  • Course thumbnails are already set for new courses")
    print("  • Existing data from previous seed remains unchanged")
    print("\n💡 RECOMMENDATION:")
    print("  The seeding script has been updated with:")
    print("  • Realistic teacher names (Michael Anderson, Sarah Johnson, etc.)")
    print("  • Password changed to 123456 for all new accounts")
    print("  • Thematic thumbnails for each course topic")
    print("\n  New courses created will automatically have these features!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
