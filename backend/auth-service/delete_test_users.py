"""
Script to delete test users and their associated data directly from the database
This will delete:
- All users with emails student1-50@gmail.com and teacher1-10@gmail.com
- All courses created by those teachers
- All enrollments for those students
- All payments for those students
"""
import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://courseris:courseris123@db:5432/courseris")

async def delete_test_data():
    """Delete all test users and their associated data"""
    print("=" * 60)
    print("🗑️  DELETING TEST DATA FROM DATABASE")
    print("=" * 60)
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Get teacher IDs
            print("\n1. Finding test teachers...")
            result = await session.execute(
                text("SELECT id FROM users WHERE email LIKE 'teacher%@gmail.com'")
            )
            teacher_ids = [row[0] for row in result.fetchall()]
            print(f"   Found {len(teacher_ids)} teachers")
            
            # Get student IDs
            print("\n2. Finding test students...")
            result = await session.execute(
                text("SELECT id FROM users WHERE email LIKE 'student%@gmail.com'")
            )
            student_ids = [row[0] for row in result.fetchall()]
            print(f"   Found {len(student_ids)} students")
            
            if teacher_ids:
                # Delete courses created by test teachers
                print("\n3. Deleting courses created by test teachers...")
                for teacher_id in teacher_ids:
                    # Get course IDs
                    result = await session.execute(
                        text("SELECT id FROM courses WHERE teacher_id = :teacher_id"),
                        {"teacher_id": teacher_id}
                    )
                    course_ids = [row[0] for row in result.fetchall()]
                    
                    if course_ids:
                        for course_id in course_ids:
                            # Delete lessons for each course
                            await session.execute(
                                text("DELETE FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = :course_id)"),
                                {"course_id": course_id}
                            )
                            
                            # Delete modules
                            await session.execute(
                                text("DELETE FROM modules WHERE course_id = :course_id"),
                                {"course_id": course_id}
                            )
                            
                            # Delete enrollments
                            await session.execute(
                                text("DELETE FROM enrollments WHERE course_id = :course_id"),
                                {"course_id": course_id}
                            )
                            
                            # Delete payments
                            await session.execute(
                                text("DELETE FROM payments WHERE course_id = :course_id"),
                                {"course_id": course_id}
                            )
                            
                            # Delete progress
                            await session.execute(
                                text("DELETE FROM progress WHERE lesson_id IN (SELECT id FROM lessons WHERE module_id IN (SELECT id FROM modules WHERE course_id = :course_id))"),
                                {"course_id": course_id}
                            )
                        
                        # Delete courses
                        await session.execute(
                            text("DELETE FROM courses WHERE teacher_id = :teacher_id"),
                            {"teacher_id": teacher_id}
                        )
                        print(f"   Deleted {len(course_ids)} courses for teacher {teacher_id}")
            
            if student_ids:
                # Delete enrollments for test students
                print("\n4. Deleting student enrollments...")
                for student_id in student_ids:
                    await session.execute(
                        text("DELETE FROM enrollments WHERE user_id = :user_id"),
                        {"user_id": student_id}
                    )
                    await session.execute(
                        text("DELETE FROM payments WHERE user_id = :user_id"),
                        {"user_id": student_id}
                    )
                    await session.execute(
                        text("DELETE FROM progress WHERE user_id = :user_id"),
                        {"user_id": student_id}
                    )
            
            # Delete test teachers
            if teacher_ids:
                print("\n5. Deleting test teachers...")
                await session.execute(
                    text("DELETE FROM users WHERE email LIKE 'teacher%@gmail.com'")
                )
                print(f"   Deleted {len(teacher_ids)} teachers")
            
            # Delete test students
            if student_ids:
                print("\n6. Deleting test students...")
                await session.execute(
                    text("DELETE FROM users WHERE email LIKE 'student%@gmail.com'")
                )
                print(f"   Deleted {len(student_ids)} students")
            
            await session.commit()
            
            print("\n" + "=" * 60)
            print("✅ TEST DATA DELETED SUCCESSFULLY!")
            print("=" * 60)
            print(f"\nDeleted:")
            print(f"  • {len(teacher_ids)} teachers")
            print(f"  • {len(student_ids)} students")
            print(f"  • All associated courses, enrollments, and payments")
            print("=" * 60)
            
        except Exception as e:
            print(f"\n✗ Error deleting data: {e}")
            await session.rollback()
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(delete_test_data())
