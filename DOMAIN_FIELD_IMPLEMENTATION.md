# Domain Field Implementation - Summary

## Overview

Simple text-based domain field added to both Package and Subject models.
- **domain** field is a TEXT field that stores domain information as free text
- Supports any domain name (e.g., "Development", "Testing", "DevOps", "QA")

## Changes Made

### 1. Models Updated

#### [src/models/package.js](src/models/package.js)
- Added `domain: DataTypes.TEXT` field to the Package model

#### [src/models/subject.js](src/models/subject.js)
- Added `domain: DataTypes.TEXT` field to the Subject model

### 2. Migrations Created

#### [src/migrations/20260424_add_domainid_to_packages.js](src/migrations/20260424_add_domainid_to_packages.js)
- Migration to add domain column (TEXT, nullable) to packages table
- Removes old domainId column if it exists

#### [src/migrations/20260424_add_domainid_to_subjects.js](src/migrations/20260424_add_domainid_to_subjects.js)
- Migration to add domain column (TEXT, nullable) to subjects table
- Removes old domainId column if it exists

### 3. Controllers Updated

#### [src/controllers/package.controller.js](src/controllers/package.controller.js)
- **createPackage**: Extracts domain field from both multipart/form-data and JSON requests
- **getAllPackages**: Includes domain in attributes selection
- **getPackageById**: Includes domain in attributes selection
- **updatePackage**: Updates domain field for both request types

#### [src/controllers/subject.controller.js](src/controllers/subject.controller.js)
- **createSubject**: Extracts domain field and includes in create
- **getAllSubjects**: Includes domain in attributes selection
- **updateSubject**: Updates domain field

### 4. Postman Collection Created

[postman_collection.json](postman_collection.json) includes test endpoints:

**Packages:**
- Create Package with Domain (e.g., "Development")
- Get All Packages
- Get Package by ID
- Update Package Domain

**Subjects:**
- Create Subject with Domain (e.g., "Testing")
- Get All Subjects
- Update Subject Domain

## How to Use

### 1. Run Migrations
```bash
npm run migrate
# or
npx sequelize-cli db:migrate
```

### 2. Test with Postman

#### Create Subject with Domain:
```json
POST /api/subjects
{
  "name": "Java Programming",
  "code": "JAVA101",
  "description": "Learn Java",
  "type": "beginner",
  "duration": 10,
  "fees": 20000,
  "domain": "Development",
  "startDate": "2026-06-01",
  "overview": {"topics": "Core Java"},
  "syllabus": {"modules": ["Variables", "OOP"]},
  "prerequisites": {"required": ["Basic knowledge"]}
}
```

#### Create Package with Domain:
```json
POST /api/packages
{
  "name": "Web Development Bootcamp",
  "code": "WDB001",
  "description": "Web development course",
  "type": "bootcamp",
  "duration": 12,
  "fees": 50000,
  "domain": "Development",
  "packageType": "standard",
  "startDate": "2026-05-01",
  "overview": {"intro": "Learn web dev"},
  "syllabus": {"modules": ["HTML", "CSS", "JS"]},
  "prerequisites": {"required": ["Basic knowledge"]}
}
```

#### Update Subject Domain:
```json
PUT /api/subjects/{id}
{
  "domain": "Testing"
}
```

## Response Examples

### Subject with Domain
```json
{
  "id": 1,
  "name": "Java Programming",
  "code": "JAVA101",
  "description": "Learn Java",
  "type": "beginner",
  "duration": 10,
  "fees": "20000.00",
  "domain": "Development",
  "image": null,
  "overview": {...},
  "syllabus": {...},
  "prerequisites": {...},
  "startDate": "2026-06-01",
  "createdAt": "2026-04-24T10:30:00.000Z",
  "updatedAt": "2026-04-24T10:30:00.000Z"
}
```

### Package with Domain
```json
{
  "id": 1,
  "name": "Web Development Bootcamp",
  "code": "WDB001",
  "description": "Web development course",
  "type": "bootcamp",
  "duration": 12,
  "fees": "50000.00",
  "domain": "Development",
  "image": null,
  "overview": {...},
  "syllabus": {...},
  "prerequisites": {...},
  "startDate": "2026-05-01",
  "createdAt": "2026-04-24T10:30:00.000Z",
  "updatedAt": "2026-04-24T10:30:00.000Z",
  "subjects": [...]
}
```

## API Endpoints

### Packages
- `GET /api/packages` - Get all packages (includes domain)
- `GET /api/packages/:id` - Get package by ID (includes domain)
- `POST /api/packages` - Create package (supports domain)
- `PUT /api/packages/:id` - Update package (supports domain)
- `DELETE /api/packages/:id` - Delete package

### Subjects
- `GET /api/subjects` - Get all subjects (includes domain)
- `GET /api/subjects/:id` - Get subject by ID
- `POST /api/subjects` - Create subject (supports domain)
- `PUT /api/subjects/:id` - Update subject (supports domain)
- `DELETE /api/subjects/:id` - Delete subject

## Domain Values

You can use any text value for domain. Examples:
- "Development"
- "Testing"
- "DevOps"
- "QA"
- "Security"
- "Infrastructure"
- "Data Science"
- "Machine Learning"

## Notes
- Domain field is optional (nullable)
- Both packages and subjects support the domain field
- Domain is included in all GET responses
- Domain can be created and updated through the API
- Requires ADMIN or COUNSELLOR role to create/update packages and subjects
