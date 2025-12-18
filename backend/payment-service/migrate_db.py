"""
Migration script to create payments table
"""
from sqlalchemy import text
from shared.database import engine


def migrate():
    """Create payments table if it doesn't exist"""
    with engine.begin() as conn:
        try:
            # Create payments table
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS payments (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR NOT NULL,
                    course_id VARCHAR NOT NULL,
                    amount FLOAT NOT NULL,
                    currency VARCHAR DEFAULT 'USD',
                    status VARCHAR DEFAULT 'pending',
                    payment_method VARCHAR NOT NULL,
                    transaction_id VARCHAR,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            print("Payment service migration completed successfully!")
            
        except Exception as e:
            print(f"Migration error: {e}")
            raise


if __name__ == "__main__":
    migrate()
