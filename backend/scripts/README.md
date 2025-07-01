# Backend Scripts

This directory contains utility scripts for managing the DART backend.

## Available Scripts

### Authentication Token Generator

```bash
node get-auth-token.js
```

Generates a JWT authentication token for testing API endpoints. Useful for tools like Postman or curl.

### Bulk Upload

```bash
node bulk-upload.js <projectId> <folderPath> [options]
```

Bulk uploads media files from a local directory to a project.

Options:

- `--batch-size`: Number of files to upload concurrently (default: 10)
- `--delay`: Delay between batches in milliseconds (default: 1000)
- `--skip-duplicates`: Skip files that already exist (default: true)

### Add Quality Field Migration

```bash
node add-quality-field.js
```

One-time migration script to add the quality field to existing media documents.

### Check Battle Readiness

```bash
node check-battle-readiness.js [projectId]
```

Diagnostic script that checks if a project has enough "Good" quality images grouped by prompt number for battles.

This script will show:

- Total media count and quality distribution
- Battle readiness for each prompt group
- Which prompt groups have enough images for battles
- Warnings about missing prompt fields

Example:

```bash
node check-battle-readiness.js 68625498a4c0e32643dd238b
```

### Update Prompt Field

```bash
node update-prompt-field.js
```

Updates the root-level `prompt` field for media documents based on their `generationParams.prompt` value.

**Important**: This script is useful when you have existing media where the prompt number was stored in `generationParams.prompt` but not in the root-level `prompt` field. The battle system uses the root-level `prompt` field to group images.

The script will:

1. Show statistics about current prompt field usage
2. Ask for confirmation before making changes
3. Update all media documents to set `prompt = generationParams.prompt`
4. Display the results and distribution of images by prompt number

## Notes

- All scripts require proper environment variables to be set (MongoDB connection, etc.)
- Scripts should be run from the backend directory: `cd backend && node scripts/<script-name>.js`
- Some scripts are interactive and will ask for confirmation before making changes
