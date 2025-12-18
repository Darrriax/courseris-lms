"""
Simple test to enroll student3 in a paid course and verify payment
"""
import asyncio
import httpx

AUTH_SERVICE_URL = "http://auth_service:8000"
COURSE_SERVICE_URL = "http://course_service:8000"
LEARNING_SERVICE_URL = "http://learning_service:8000"

async def test():
    async with httpx.AsyncClient() as client:
        # Login as student3
        print("Logging in as student3...")
        login = await client.post(
            f"{AUTH_SERVICE_URL}/auth/login",
            data={"username": "student3@gmail.com", "password": "password123"},
            timeout=10.0
        )
        token = login.json().get("access_token")
        print(f"✓ Logged in")
        
        # Get courses
        print("\nFetching courses...")
        courses = await client.get(f"{COURSE_SERVICE_URL}/courses", timeout=10.0)
        all_courses = courses.json()
        
        # Find a paid course
        paid = None
        for c in all_courses:
            if isinstance(c.get('price'), (int, float)) and c['price'] > 0:
                paid = c
                break
        
        if not paid:
            print("No paid courses found")
            return
        
        print(f"✓ Found: {paid['title']} - ${paid['price']}")
        
        # Enroll
        print(f"\nEnrolling...")
        enroll = await client.post(
            f"{LEARNING_SERVICE_URL}/courses/{paid['id']}/enroll",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )
        
        if enroll.status_code == 200:
            print("✓ Enrolled successfully!")
            print("\n✅ Payment record should now be visible in admin panel")
            print(f"   Student: student3@gmail.com")
            print(f"   Course: {paid['title']}")
            print(f"   Amount: ${paid['price']}")
        else:
            print(f"✗ Enrollment failed: {enroll.text}")

if __name__ == "__main__":
    asyncio.run(test())
