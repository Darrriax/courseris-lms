# User Data Update Summary

## Changes Made

### 1. Database Schema Updates

**User Model** (`backend/shared/models.py` and `backend/auth-service/models.py`)
- ✅ `phone_number` field (Optional[str]) - Already exists in database
- ✅ `country` field (Optional[str]) - Already exists in database

These fields are now included in the `UserBase` and `UserCreate` models, so new user registrations will accept phone numbers and countries.

### 2. Seeding Script Updates

**File:** `backend/seed_database.py`

**New Features:**
- Added `COUNTRIES` list with 22 countries for random selection
- Added `generate_phone_number()` function that creates phone numbers in format: `+1-XXX-XXX-XXXX`
- Updated `register_user()` to include:
  - Random phone number for each user
  - Random country from the COUNTRIES list
  - Password: `123456` for all new users

**Countries Available:**
United States, United Kingdom, Canada, Australia, Germany, France, Spain, Italy, Netherlands, Sweden, Norway, Denmark, Poland, Ukraine, Japan, South Korea, India, Brazil, Mexico, Argentina, Singapore, New Zealand

### 3. Password Policy

**All new users created by the seeding script will have password: `123456`**

This includes:
- All 50 students (student1@gmail.com - student50@gmail.com)
- All 10 teachers (teacher1@gmail.com - teacher10@gmail.com)

### 4. Existing Users

**Current Status:**
- Existing users in the database (created before this update) still have:
  - Password: `password123`
  - No phone number
  - No country

**To Update Existing Users:**
You would need to either:
1. Clear the database and re-run the seeding script (recommended for fresh start)
2. Manually update existing users through the database

### 5. Statistics Benefits

With phone numbers and countries now included, you can:
- Track user distribution by country
- Analyze geographic patterns in course enrollment
- Contact users via phone if needed
- Generate demographic reports
- Understand which countries have the most students/teachers

## How to Use

### For New Deployments
Simply run the updated seeding script:
```bash
docker-compose exec -T auth_service python /app/seed_database.py
```

All new users will automatically have:
- Phone number (format: +1-XXX-XXX-XXXX)
- Country (randomly selected from 22 countries)
- Password: 123456

### For Existing Data
The seeding script has been updated, so any NEW users created will have the complete data. Existing users from previous seeds will retain their old data (password123, no phone/country).

## API Changes

**Registration Endpoint** (`POST /auth/register`)
Now accepts additional fields:
```json
{
  "email": "user@example.com",
  "password": "123456",
  "first_name": "John",
  "last_name": "Doe",
  "age": 25,
  "phone_number": "+1-555-123-4567",
  "country": "United States",
  "role": "student",
  "gender": "MALE"
}
```

**User Response**
All user endpoints now return phone_number and country fields when available.

## Next Steps

1. ✅ Models updated to support phone_number and country
2. ✅ Seeding script updated with phone numbers and countries
3. ✅ All new users will have password: 123456
4. ⏳ Existing users still have old data (password123, no phone/country)

To get a completely fresh database with all users having the new data structure, you would need to clear and re-seed the database.
