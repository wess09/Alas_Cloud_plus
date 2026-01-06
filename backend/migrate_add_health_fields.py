import sys
import os
from sqlalchemy import text
from app.database import engine

def migrate():
    """Add health_status and last_health_check columns to instances table"""
    print("Migrating database...")
    
    with engine.connect() as connection:
        # Check if columns exist (simple check) specific for SQLite/Postgres/MySQL
        # Here we just try to add them and ignore if they exist, or use a safer approach for SQLite (no IF NOT EXISTS for ADD COLUMN in older versions) 
        # But commonly we just catch the exception
        
        try:
            # Add health_status
            print("Adding health_status column...")
            connection.execute(text("ALTER TABLE instances ADD COLUMN health_status VARCHAR(50) DEFAULT 'unknown'"))
            print("✓ health_status column added")
        except Exception as e:
            print(f"⚠ Could not add health_status column (might already exist): {e}")

        try:
            # Add last_health_check
            print("Adding last_health_check column...")
            connection.execute(text("ALTER TABLE instances ADD COLUMN last_health_check DATETIME"))
            print("✓ last_health_check column added")
        except Exception as e:
            print(f"⚠ Could not add last_health_check column (might already exist): {e}")

        connection.commit()
    
    print("Migration completed.")

if __name__ == "__main__":
    # Ensure app directory is in python path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(current_dir)
    
    migrate()
