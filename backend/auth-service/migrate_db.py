"""
Migration script to add new columns to users table
"""
import asyncio
from sqlalchemy import text
from database import engine


async def migrate():
    """Add new columns to users table if they don't exist"""
    async with engine.begin() as conn:
        # Check if columns exist and add them if they don't
        try:
            # Add first_name column
            await conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='users' AND column_name='first_name'
                    ) THEN
                        ALTER TABLE users ADD COLUMN first_name VARCHAR;
                    END IF;
                END $$;
            """))
            
            # Add last_name column
            await conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='users' AND column_name='last_name'
                    ) THEN
                        ALTER TABLE users ADD COLUMN last_name VARCHAR;
                    END IF;
                END $$;
            """))
            
            # Add age column
            await conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name='users' AND column_name='age'
                    ) THEN
                        ALTER TABLE users ADD COLUMN age INTEGER;
                    END IF;
                END $$;
            """))
            
            # Migrate existing data: split name into first_name and last_name
            await conn.execute(text("""
                UPDATE users 
                SET first_name = SPLIT_PART(name, ' ', 1),
                    last_name = CASE 
                        WHEN POSITION(' ' IN name) > 0 
                        THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
                        ELSE ''
                    END
                WHERE first_name IS NULL AND name IS NOT NULL;
            """))
            
            # Make first_name and last_name NOT NULL if we have data
            await conn.execute(text("""
                DO $$ 
                BEGIN
                    IF EXISTS (SELECT 1 FROM users WHERE first_name IS NULL) THEN
                        UPDATE users SET first_name = '' WHERE first_name IS NULL;
                        UPDATE users SET last_name = '' WHERE last_name IS NULL;
                    END IF;
                END $$;
            """))
            
            await conn.execute(text("""
                ALTER TABLE users 
                ALTER COLUMN first_name SET NOT NULL,
                ALTER COLUMN last_name SET NOT NULL;
            """))
            
            print("Migration completed successfully!")
            
        except Exception as e:
            print(f"Migration error: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(migrate())

