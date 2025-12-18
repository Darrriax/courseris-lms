"""
Script to update student countries - set Ukraine for students 5-15, random for others.
This script connects directly to the database using environment variables.
"""
import os
import random
from urllib.parse import urlparse
import psycopg2
from psycopg2 import sql

# Database connection parameters from environment
DB_URL = os.getenv("DATABASE_URL")
if not DB_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# Parse the database URL
result = urlparse(DB_URL)
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
        cur = conn.cursor()
        
        # Update students 5-15 to Ukraine
        update_ukraine = """
            UPDATE users 
            SET country = 'Ukraine'
            WHERE email LIKE 'student%' 
            AND email ~ '^student([5-9]|1[0-5])@';
        """
        cur.execute(update_ukraine)
        print(f"Updated {cur.rowcount} students to have Ukraine as country")
        
        # Update remaining students to random countries
        for i in range(1, 51):
            if i < 5 or i > 15:  # Skip students 5-15
                country = random.choice(COUNTRIES)
                update_other = """
                    UPDATE users 
                    SET country = %s
                    WHERE email = %s;
                """
                cur.execute(update_other, (country, f"student{i}@gmail.com"))
        
        # Commit the transaction
        conn.commit()
        
        # Verify the updates
        select_query = """
            SELECT email, country 
            FROM users 
            WHERE email LIKE 'student%%@gmail.com' 
            ORDER BY email;
        """
        cur.execute(select_query)
        
        print("\nUpdated student countries:")
        print("-" * 50)
        print(f"{'Email':<20} | {'Country':<15}")
        print("-" * 50)
        for row in cur.fetchall():
            print(f"{row[0]:<20} | {row[1] or 'None':<15}")
        
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
