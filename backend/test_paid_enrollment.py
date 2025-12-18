"""
Test script to verify payment record creation for paid course enrollment
"""
import asyncio
import httpx

AUTH_SERVICE_URL = "http://auth_service:8000"
COURSE_SERVICE_URL = "http://course_service:8000"
LEARNING_SERVICE_URL = "http://learning_service:8000"
PAYMENT_SERVICE_URL = "http://payment_service:8000"

async def test_paid_enrollment():
    """Test student enrollment in a paid course and verify payment creation"""
    print("=" * 60)
    print("🧪 TESTING PAID COURSE ENROLLMENT & PAYMENT")
    print("=" * 60)
    
    async with httpx.AsyncClient() as client:
        # Login as student2
        print("\n1. Logging in as student2@gmail.com...")
        login_response = await client.post(
            f"{AUTH_SERVICE_URL}/auth/login",
            data={
                "username": "student2@gmail.com",
                "password": "password123"
            },
            timeout=10.0
        )
        
        if login_response.status_code != 200:
            print(f"✗ Login failed: {login_response.text}")
            return
        
        student_token = login_response.json().get("access_token")
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
        
        # Find a paid course
        paid_course = None
        for course in courses:
            price = course.get('price', 0)
            if isinstance(price, (int, float)) and price > 0:
                paid_course = course
                break
        
        if not paid_course:
            print("✗ No paid courses found")
            return
        
        print(f"✓ Found paid course: {paid_course['title']}")
        print(f"   Course ID: {paid_course['id']}")
        print(f"   Price: ${paid_course['price']}")
        
        # Enroll in the paid course
        print(f"\n3. Enrolling in paid course...")
        enroll_response = await client.post(
            f"{LEARNING_SERVICE_URL}/courses/{paid_course['id']}/enroll",
            headers={"Authorization": f"Bearer {student_token}"},
            timeout=10.0
        )
        
        if enroll_response.status_code != 200:
            print(f"✗ Enrollment failed: {enroll_response.text}")
            return
        
        print("✓ Enrollment successful")
        
        # Wait for payment to be created
        await asyncio.sleep(2)
        
        # Login as admin to check payments
        print("\n4. Verifying payment record...")
        admin_login = await client.post(
            f"{AUTH_SERVICE_URL}/auth/login",
            data={
                "username": "admin@courseris.com",
                "password": "admin123"
            },
            timeout=10.0
        )
        
        if admin_login.status_code != 200:
            print("⚠ Could not login as admin")
            return
        
        admin_token = admin_login.json().get("access_token")
        
        # Get all payments
        payments_response = await client.get(
            f"{PAYMENT_SERVICE_URL}/api/v1/payments/admin/all",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10.0
        )
        
        if payments_response.status_code != 200:
            print(f"✗ Failed to fetch payments: {payments_response.text}")
            return
        
        payments = payments_response.json()
        print(f"✓ Total payments in system: {len(payments)}")
        
        # Find the payment for this enrollment
        student_payment = None
        for payment in payments:
            if payment['course_id'] == paid_course['id'] and 'student2' in payment.get('user_name', '').lower():
                student_payment = payment
                break
        
        if student_payment:
            print(f"\n✅ PAYMENT RECORD FOUND:")
            print(f"   Student: {student_payment.get('user_name', 'Unknown')}")
            print(f"   Course: {student_payment.get('course_title', 'Unknown')}")
            print(f"   Amount: ${student_payment['amount']}")
            print(f"   Method: {student_payment['payment_method']}")
            print(f"   Status: {student_payment['status']}")
        else:
            print(f"\n❌ PAYMENT RECORD NOT FOUND")
            print(f"   Expected course_id: {paid_course['id']}")
            print(f"   This indicates the payment service is not receiving the request")
    
    print("\n" + "=" * 60)
    print("✅ TEST COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_paid_enrollment())
