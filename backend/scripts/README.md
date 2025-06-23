# Bulk Upload Scripts

This directory contains scripts for bulk uploading media files to your DART project.

## Overview

For large-scale uploads (like your 3500 images), these scripts provide:

- **Batch processing** - Uploads files in controlled batches to avoid overwhelming the server
- **Progress tracking** - Real-time progress with ETA and success/failure counts
- **Error handling** - Retry logic and detailed error reporting
- **Filename parsing** - Automatic extraction of generation parameters from filenames
- **Performance optimization** - Configurable batch sizes and delays

## Prerequisites

1. **Install dependencies** (if not already installed):

   ```bash
   cd backend
   npm install
   ```

2. **Start your backend server**:

   ```bash
   npm run dev
   ```

3. **Have your images ready** in a local folder with the naming convention:
   ```
   flux_test_1750_cfg-7.0_orient-7.0_sampler-ddim_scheduler-beta_prompt-1_batch-0_node-9.png
   ```

## Quick Start Guide

### Step 1: Get your authentication token

```bash
node scripts/get-auth-token.js your-email@example.com your-password
```

This will output your auth token. Copy it for the next step.

### Step 2: Run the bulk upload

```bash
node scripts/bulk-upload.js /path/to/your/images YOUR_PROJECT_ID "YOUR_AUTH_TOKEN"
```

**Example:**

```bash
node scripts/bulk-upload.js ./flux-images 67890abcdef123456789 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## Advanced Configuration

### Adjusting Performance Settings

For 3500 images, you might want to tune the performance:

```bash
# Smaller batches for better stability (5 files at a time, 2 second delay)
node scripts/bulk-upload.js ./images PROJECT_ID "TOKEN" --batch-size 5 --delay 2000

# Faster processing (20 files at a time, 500ms delay)
node scripts/bulk-upload.js ./images PROJECT_ID "TOKEN" --batch-size 20 --delay 500
```

### Performance Recommendations

For **3500 images (5GB)**:

- **Conservative**: `--batch-size 5 --delay 2000` (slower but very stable)
- **Balanced**: `--batch-size 10 --delay 1000` (default, good balance)
- **Aggressive**: `--batch-size 15 --delay 500` (faster but watch for errors)

## What the Scripts Do

### Filename Parameter Extraction

The script automatically extracts parameters from filenames like:

```
flux_test_1750_cfg-7.0_orient-7.0_sampler-ddim_scheduler-beta_prompt-1_batch-0_node-9.png
```

Becomes:

```json
{
  "cfg": 7.0,
  "orient": 7.0,
  "sampler": "ddim",
  "scheduler": "beta",
  "prompt": 1,
  "batch": 0,
  "node": 9
}
```

### Supported File Types

- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- **Videos**: `.mp4`, `.webm`, `.mov`

## Monitoring Progress

The script provides real-time feedback:

```
🚀 Starting bulk upload...
📁 Scanning folder: ./flux-images
📋 Found 3500 media files
🎯 Project ID: 67890abcdef123456789
📦 Batch size: 10
⏳ Delay between batches: 1000ms

▶️  Starting upload process...

🔄 Processing batch 1/350 (10 files)...

📊 Progress: 10/3500 (0.3%)
✅ Successful: 10
❌ Failed: 0
⏱️  Rate: 2.45 files/sec
🕐 ETA: 23m 45s
⏰ Elapsed: 4s
```

## Troubleshooting

### Common Issues

1. **Authentication Error**

   ```
   ❌ HTTP 401: Unauthorized
   ```

   **Solution**: Get a fresh auth token with `get-auth-token.js`

2. **File Too Large Error**

   ```
   ❌ HTTP 413: File too large
   ```

   **Solution**: Check individual file sizes (50MB limit per file)

3. **Rate Limiting**

   ```
   ❌ HTTP 429: Too Many Requests
   ```

   **Solution**: Increase `--delay` or decrease `--batch-size`

4. **Network Timeouts**
   ```
   ❌ Network timeout
   ```
   **Solution**: Reduce batch size and increase delay

### Recovery from Failures

If the upload fails partway through:

1. Check the error log printed at the end
2. Remove successfully uploaded files from your folder
3. Re-run the script with the remaining files

### Cloudflare R2 Considerations

- **No changes needed** to your current setup
- The script uses the same upload endpoint
- Files are automatically organized by project: `projects/PROJECT_ID/media/`
- All metadata and generation parameters are preserved

## Script Options Reference

### bulk-upload.js

```bash
node bulk-upload.js <folder_path> <project_id> <auth_token> [options]

Options:
  --batch-size <number>     Files per batch (default: 10)
  --delay <milliseconds>    Delay between batches (default: 1000)
  --api-url <url>          API base URL (default: http://localhost:3001/api/v1)
```

### get-auth-token.js

```bash
node get-auth-token.js <email> <password> [api_url]
```

## Estimated Upload Time

For **3500 images** with different settings:

| Batch Size | Delay  | Estimated Time | Stability |
| ---------- | ------ | -------------- | --------- |
| 5          | 2000ms | ~4-5 hours     | Very High |
| 10         | 1000ms | ~2-3 hours     | High      |
| 15         | 500ms  | ~1-2 hours     | Medium    |
| 20         | 250ms  | ~1 hour        | Lower     |

Choose based on your internet connection and server performance.

## Need Help?

- Check the console output for detailed error messages
- Ensure your backend server is running (`npm run dev`)
- Verify your project ID exists and you have access
- Test with a small batch first (10-20 images) before running the full upload
