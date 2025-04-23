# Database Scripts

This directory contains scripts for database operations.

## Create Consultation Script

The `createConsultation.js` script creates a new consultation entry with the specified data.

### How to Run

**Method 1:** Using npm script
```bash
npm run create-consultation
```

**Method 2:** Using the batch file (Windows)
```
Double-click on create-consultation.bat in the backend directory
```

**Method 3:** Running directly
```bash
node scripts/createConsultation.js
```

### Details

The script will:
1. Create a new consultation entry in the database
2. Link it to the specified therapist (ID: 6807473300958dbfad42606e)
3. Link it to the specified user (ID: 6809142f14e77810586058e9)
4. Include the specified exercises (IDs: 6803b993d4fa54dd1adcc19e, 6803b993d4fa54dd1adcc1a5)
5. Set the consultation status to 'pending'
6. Update the therapist's pending request count

### Customization

If you need to create a different consultation, you can modify the `consultationData` object in the script. 