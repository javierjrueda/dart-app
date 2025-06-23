# Cloudflare R2 Setup for Media Upload

This guide explains how to configure Cloudflare R2 for media upload functionality in the DART project.

## Required Environment Variables

Add these environment variables to your `.env` file in the project root:

```bash
# Cloudflare R2 Configuration
CLOUDFLARE_R2_ENDPOINT=https://a1cc4a64a2153b50b4e4710f93f7d58f.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your-r2-access-key-here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-r2-secret-key-here
CLOUDFLARE_R2_BUCKET_NAME=dart
CLOUDFLARE_R2_PUBLIC_URL=https://files.dreamshot.io
```

## How to Get Your R2 Credentials

1. **Log in to Cloudflare Dashboard**

   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Navigate to R2 Object Storage

2. **Get the R2 Endpoint**

   - The endpoint is already configured: `https://a1cc4a64a2153b50b4e4710f93f7d58f.r2.cloudflarestorage.com`

3. **Create R2 API Token**

   - Go to "Manage R2 API tokens"
   - Click "Create API token"
   - Select "Custom token"
   - Set permissions:
     - **Account ID**: Your account
     - **Permissions**: R2:Edit (for read/write access)
     - **Resource**: Include specific bucket "dart"
   - Copy the Access Key ID and Secret Access Key

4. **Configure Public Domain**
   - The public URL is already set up: `https://files.dreamshot.io`
   - This allows public access to uploaded media

## Bucket Information

- **Bucket Name**: `dart`
- **Region**: Western Europe (WEUR)
- **Created**: Jun 22, 2025
- **Access**: Public via custom domain

## File Organization

Media files will be organized in the bucket as follows:

```
dart/
├── projects/
│   ├── [project-id]/
│   │   └── media/
│   │       ├── [timestamp]-[random].[ext]
│   │       └── [timestamp]-[random].[ext]
│   └── [project-id]/
│       └── media/
└── ...
```

## Supported File Types

### Images

- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- SVG (.svg)

### Videos

- MP4 (.mp4)
- WebM (.webm)
- OGG (.ogg)
- QuickTime (.mov)
- AVI (.avi)

## File Size Limits

- Maximum file size: **50MB**
- Recommended for optimal performance: **10MB or less**

## Security Features

- **Authentication Required**: All uploads require valid JWT token
- **File Type Validation**: Only allowed media types are accepted
- **Project Isolation**: Files are organized by project ID
- **Unique Names**: Timestamp + random string prevents conflicts

## API Endpoints

The media upload system provides these endpoints:

```
POST /api/v1/projects/:projectId/media/upload
GET  /api/v1/projects/:projectId/media
GET  /api/v1/media/:id
DELETE /api/v1/media/:id
PATCH /api/v1/media/:id/elo
POST /api/v1/projects/:projectId/media/presigned-url
```

## Testing the Setup

1. **Add environment variables** to your `.env` file
2. **Restart the backend server**: `mise run dev`
3. **Navigate to a project** in the frontend
4. **Click "Upload Media"** button
5. **Select an image or video** and upload

## Troubleshooting

### Upload Fails with 403 Error

- Check that your R2 API token has correct permissions
- Verify the bucket name is exactly "dart"
- Ensure the access key and secret are correct

### Files Not Accessible via Public URL

- Verify the custom domain `files.dreamshot.io` is configured
- Check that the bucket allows public read access
- Confirm the public URL in environment variables

### Large File Upload Timeouts

- Reduce file size to under 10MB
- Check network connection stability
- Consider using presigned URLs for very large files

## Development vs Production

### Development

- Uses the configuration above
- Files are uploaded directly to R2
- No CDN caching

### Production

- Should use the same R2 bucket
- Consider adding CloudFlare CDN for better performance
- Monitor usage and costs

## Next Steps

After setting up R2:

1. **Test media upload** functionality
2. **Implement ELO rating** system for images
3. **Add media comparison** features
4. **Create media management** tools
5. **Optimize performance** with image resizing

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Review backend logs for upload errors
3. Verify all environment variables are set correctly
4. Test R2 credentials using AWS CLI tools
