"""
Script to update student countries - set Ukraine for students 5-15, random for others.
This script uses the same pattern as seed_database.py.
"""
import asyncio
import httpx
import random

# Configuration
AUTH_SERVICE_URL = "http://localhost:8001"

# Countries for users
COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany",
    "France", "Spain", "Italy", "Netherlands", "Sweden", "Norway",
    "Denmark", "Poland", "Japan", "South Korea", "India",
    "Brazil", "Mexico", "Argentina", "Singapore", "New Zealand"
]

async def update_student_countries():
    """Update student countries - set Ukraine for students 5-15, random for others"""
    async with httpx.AsyncClient() as client:
        # Get all students
        try:
            # Get auth token (using admin credentials)
            login_data = {
                "username": "admin@example.com",
                "password": "admin123"
            }
            login_response = await client.post(
                f"{AUTH_SERVICE_URL}/api/v1/auth/login",
                json=login_data
            )
            login_response.raise_for_status()
            token = login_response.json()["access_token"]
            
            headers = {"Authorization": f"Bearer {token}"}
            
            # Get all students
            users_response = await client.get(
                f"{AUTH_SERVICE_URL}/api/v1/users?role=student",
                headers=headers
            )
            users_response.raise_for_status()
            students = users_response.json()
            
            # Sort students by email to ensure consistent ordering
            students_sorted = sorted(students, key=lambda x: x["email"])
            
            print(f"Found {len(students_sorted)} students")
            
            # Update each student's country
            for i, student in enumerate(students_sorted, 1):
                if 5 <= i <= 15:
                    country = "Ukraine"
                else:
                    country = random.choice(COUNTRIES)
                
                update_data = {
                    "country": country
                }
                
                try:
                    update_response = await client.patch(
                        f"{AUTH_SERVICE_URL}/api/v1/users/{student['id']}",
                        json=update_data,
                        headers=headers
                    )
                    update_response.raise_for_status()
                    print(f"Updated {student['email']} to country: {country}")
                except Exception as e:
                    print(f"Error updating {student['email']}: {str(e)}")
            
            # Verify the updates
            print("\nVerifying updates...")
            updated_response = await client.get(
                f"{AUTH_SERVICE_URL}/api/v1/users?role=student",
                headers=headers
            )
            updated_students = updated_response.json()
            
            print("\nUpdated student countries:")
            print("-" * 50)
            print(f"{'Email':<25} | {'Country':<15}")
            print("-" * 50)
            for student in sorted(updated_students, key=lambda x: x["email"]):
                print(f"{student['email']:<25} | {student.get('country', 'None'):<15}")
                
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(update_student_countries())
