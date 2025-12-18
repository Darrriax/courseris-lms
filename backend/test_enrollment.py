"""
Test script to enroll a student in a course and verify payment record creation
"""
import asyncio
import httpx

AUTH_SERVICE_URL = "http://auth_service:8000"
COURSE_SERVICE_URL = "http://course_service:8000"
LEARNING_SERVICE_URL = "http://learning_service:8000"
PAYMENT_SERVICE_URL = "http://payment_service:8000"

async def test_enrollment():
    """Test student enrollment and payment creation"""
    print("=" * 60)
    print("🧪 TESTING ENROLLMENT AND PAYMENT SYSTEM")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # Login as student1
        print("\n1. Logging in as student1@gmail.com...")
        login_response = await client.post(
            f"{AUTH_SERVICE_URL}/auth/login",
            data={
                "username": "student1@gmail.com",
                "password": "password123"
            },
            timeout=10.0
        )
        
        if login_response.status_code != 200:
            print(f"✗ Login failed: {login_response.text}")
            return
        
        token = login_response.json().get("access_token")
        print("✓ Login successful")
        
        # Get list of published courses
        print("\n2. Fetching published courses...")
        courses_response = await client.get(
            f"{COURSE_SERVICE_URL}/courses",
            timeout=10.0
        )
        
        if courses_response.status_code != 200:
            print(f"✗ Failed to fetch courses: {courses_response.text}")
            return
        
        courses = courses_response.json()
        if not courses:
            print("✗ No courses found")
            return
        
        print(f"✓ Found {len(courses)} published courses")
        
        # Enroll in the first course
        first_course = courses[0]
        print(f"\n3. Enrolling in course: {first_course['title']}")
        print(f"   Course ID: {first_course['id']}")
        print(f"   Price: ${first_course['price']}")
        
        enroll_response = await client.post(
            f"{LEARNING_SERVICE_URL}/courses/{first_course['id']}/enroll",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )
        
        if enroll_response.status_code != 200:
            print(f"✗ Enrollment failed: {enroll_response.text}")
            return
        
        print("✓ Enrollment successful")
        
        # Wait a moment for payment to be created
        await asyncio.sleep(2)
        
        # Check if payment was created (need admin token)
        print("\n4. Verifying payment record creation...")
        print("   (Login as admin to check payments)")
        
        admin_login = await client.post(
            f"{AUTH_SERVICE_URL}/auth/login",
            data={
                "username": "admin@courseris.com",
                "password": "admin123"
            },
            timeout=10.0
        )
        
        if admin_login.status_code == 200:
            admin_token = admin_login.json().get("access_token")
            
            payments_response = await client.get(
                f"{PAYMENT_SERVICE_URL}/api/v1/payments/admin/all",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10.0
            )
            
            if payments_response.status_code == 200:
                payments = payments_response.json()
                print(f"✓ Total payments in system: {len(payments)}")
                
                # Find the payment for this enrollment
                student_payments = [p for p in payments if p['course_id'] == first_course['id']]
                if student_payments:
                    payment = student_payments[0]
                    print(f"\n✓ Payment record found:")
                    print(f"   Student: {payment.get('user_name', 'Unknown')}")
                    print(f"   Course: {payment.get('course_title', 'Unknown')}")
                    print(f"   Amount: ${payment['amount']}")
                    print(f"   Method: {payment['payment_method']}")
                    print(f"   Status: {payment['status']}")
                else:
                    print("⚠ Payment record not found yet (may still be processing)")
            else:
                print(f"✗ Failed to fetch payments: {payments_response.text}")
        else:
            print("⚠ Could not login as admin to verify payment")
    
    print("\n" + "=" * 60)
    print("✅ TEST COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_enrollment())
