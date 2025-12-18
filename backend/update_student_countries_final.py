"""
Script to update student countries - set Ukraine for students 5-15, random for others.
This script connects directly to the database using environment variables.
"""
import os
import random
import psycopg2
from psycopg2.extras import DictCursor
from urllib.parse import urlparse

# Database connection parameters from environment
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# Parse the database URL
result = urlparse(DATABASE_URL)
db_params = {
    'dbname': result.path[1:],  # Remove leading '/'
    'user': result.username,
    'password': result.password,
    'host': result.hostname,
    'port': result.port or 5432
}

# List of countries for random selection
COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany",
    "France", "Japan", "South Korea", "Brazil", "India",
    "Italy", "Spain", "Mexico", "Netherlands", "Sweden",
    "Norway", "Finland", "Denmark", "Switzerland", "Austria"
]

def update_student_countries():
    conn = None
    try:
        # Connect to the database
        conn = psycopg2.connect(**db_params)
        cur = conn.cursor(cursor_factory=DictCursor)
        
        # Get all students
        cur.execute("""
            SELECT id, email 
            FROM users 
            WHERE email LIKE 'student%@gmail.com' 
            ORDER BY email;
        """)
        students = cur.fetchall()
        
        if not students:
            print("No students found in the database.")
            return
            
        print(f"Found {len(students)} students")
        
        # Update each student's country
        for i, student in enumerate(students, 1):
            if 5 <= i <= 15:
                country = "Ukraine"
            else:
                country = random.choice(COUNTRIES)
            
            try:
                cur.execute("""
                    UPDATE users 
                    SET country = %s
                    WHERE id = %s;
                """, (country, student['id']))
                print(f"Updated {student['email']} to country: {country}")
            except Exception as e:
                print(f"Error updating {student['email']}: {str(e)}")
        
        # Commit the transaction
        conn.commit()
        
        # Verify the updates
        print("\nVerifying updates...")
        cur.execute("""
            SELECT email, country 
            FROM users 
            WHERE email LIKE 'student%@gmail.com' 
            ORDER BY email;
        """)
        updated_students = cur.fetchall()
        
        print("\nUpdated student countries:")
        print("-" * 50)
        print(f"{'Email':<25} | {'Country':<15}")
        print("-" * 50)
        for student in updated_students:
            print(f"{student['email']:<25} | {student['country'] or 'None':<15}")
        
    except Exception as e:
        print(f"Error updating student countries: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    update_student_countries()
