# MongoDB Unified Configuration

This document explains how MongoDB is configured to use a single global `.env` file for both frontend and backend.

## Configuration Overview

Both the frontend and backend applications are configured to use MongoDB Atlas (cloud database) with credentials stored in the root `.env` file.

### Global Environment File

Location: `/Users/javierjrueda/dev/dart/.env`

The `.env` file contains:

```env
MONGODB_URI=mongodb+srv://[username]:[password]@cluster0.wzh5eff.mongodb.net/dart-db?retryWrites=true&w=majority&appName=Cluster0
```

### Backend Configuration

The backend loads environment variables from the parent directory:

```typescript
// backend/src/server.ts
import dotenv from "dotenv";
import path from "path";

// Load environment variables from parent directory's .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });
```

### Frontend Configuration

The frontend loads environment variables through Next.js configuration:

```javascript
// frontend/next.config.js
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from parent directory's .env file
dotenv.config({ path: path.join(__dirname, "../.env") });
```

## Running the Application

Use the mise tasks to start both servers with properly loaded environment variables:

```bash
# Check environment setup
mise run env:check

# Start both frontend and backend
mise run dev
```

## Troubleshooting

1. **Environment variables not loading**:

   - Ensure the global `.env` file exists at the project root
   - Run `mise run env:check` to verify configuration

2. **MongoDB connection errors**:

   - Verify your IP is whitelisted in MongoDB Atlas
   - Check that the connection string in `.env` is correct

3. **Clear cached builds**:
   - Frontend: `rm -rf frontend/.next`
   - Backend: `rm -rf backend/dist`

## Benefits of Unified Configuration

- **Single source of truth**: All environment variables in one file
- **Easier deployment**: Same configuration structure for development and production
- **Reduced duplication**: No need to maintain separate `.env` files
- **Consistent setup**: Both frontend and backend use the same database connection
