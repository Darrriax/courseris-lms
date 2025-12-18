"""
Script to update student countries - set Ukraine for students 5-15, random for others.
This script correctly parses student numbers from email addresses.
"""
import os
import random
import psycopg2
from psycopg2.extras import DictCursor
import re

# Database connection parameters from environment
db_params = {
    'dbname': os.getenv('POSTGRES_DB', 'courseris'),
    'user': os.getenv('POSTGRES_USER', 'courseris'),
    'password': os.getenv('POSTGRES_PASSWORD', 'courseris123'),
    'host': os.getenv('POSTGRES_HOST', 'localhost'),
    'port': os.getenv('POSTGRES_PORT', '5432')
}

# List of countries for random selection
COUNTRIES = [
    "United States", "United Kingdom", "Canada", "Australia", "Germany",
    "France", "Japan", "South Korea", "Brazil", "India",
    "Italy", "Spain", "Mexico", "Netherlands", "Sweden",
    "Norway", "Finland", "Denmark", "Switzerland", "Austria"
]

def extract_student_number(email):
    """Extract student number from email address"""
    match = re.match(r'student(\d+)@gmail\.com', email)
    if match:
        return int(match.group(1))
    return None

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
        for student in students:
            student_num = extract_student_number(student['email'])
            
            if student_num and 5 <= student_num <= 15:
                country = "Ukraine"
            else:
                country = random.choice(COUNTRIES)
            
            try:
                cur.execute("""
                    UPDATE users 
                    SET country = %s
                    WHERE id = %s;
                """, (country, student['id']))
                print(f"Updated {student['email']} (student {student_num}) to country: {country}")
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
            student_num = extract_student_number(student['email'])
            marker = " (Ukraine)" if student_num and 5 <= student_num <= 15 else ""
            print(f"{student['email']:<25} | {student['country'] or 'None':<15}{marker}")
        
        # Count Ukraine assignments
        ukraine_count = sum(1 for s in updated_students 
                          if extract_student_number(s['email']) and 5 <= extract_student_number(s['email']) <= 15)
        print(f"\nSummary: {ukraine_count} students set to Ukraine (students 5-15)")
        
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
