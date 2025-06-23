# Debugging Bulk Upload Errors

## When All Files Fail (0 Success Rate)

If you see **all files failing** like in your case (58 errors, 0 success), it's usually a configuration issue, not individual file problems.

### 🔍 **Step 1: Check Browser Console**

Open browser console (F12) and look for these error patterns:

#### **CORS Errors**

```
Access to XMLHttpRequest at 'https://...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution**: Configure CORS policy in Cloudflare R2 bucket settings

#### **403 Forbidden Errors**

```
❌ Upload failed for "file.png": Error: Upload failed with status 403
```

**Solution**: Check R2 access keys and bucket permissions

#### **Network/DNS Errors**

```
❌ Upload failed for "file.png": Error: Network error during upload
```

**Solution**: Verify R2 endpoint URL and network connectivity

#### **Missing Upload URL Errors**

```
❌ Upload failed for "file.png": Error: No upload URL available
```

**Solution**: Check if presigned URL generation is working

### 🛠️ **Step 2: Common Fixes**

#### **Fix CORS Policy (Most Common Issue)**

Add this CORS policy to your Cloudflare R2 bucket:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

**How to add CORS in Cloudflare:**

1. Go to Cloudflare Dashboard → R2 → Your Bucket
2. Click "Settings" tab
3. Scroll to "CORS Policy"
4. Add the policy above

#### **Verify Environment Variables**

Check your `.env` file has:

```bash
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_ACCESS_KEY_ID=your-access-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret-key
CLOUDFLARE_R2_BUCKET_NAME=your-bucket-name
CLOUDFLARE_R2_PUBLIC_URL=https://your-bucket.your-domain.com
```

#### **Test R2 Connection**

Use the test endpoint to verify R2 is working:

```bash
curl -X POST http://localhost:3001/api/v1/projects/YOUR_PROJECT_ID/media/test-r2 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 📊 **Step 3: Understanding Error Types**

The new error summary will group errors like:

- **CORS Policy**: Browser blocking cross-origin requests
- **Access Denied**: 403 errors from R2 (permissions issue)
- **Network Error**: Connection problems to R2
- **Missing Upload URL**: Presigned URL generation failed
- **Duplicate File**: File already exists (filtered out before upload)

### 🚀 **Step 4: Quick Diagnostics**

1. **Check Console Logs**: Look for the sample presigned URL format
2. **Verify Upload URLs**: Should start with your R2 endpoint
3. **Test Single File**: Try uploading one file through regular upload
4. **Check Network Tab**: See actual HTTP requests and responses

### 💡 **Pro Tips**

- **Development**: Use `http://localhost:3000` in CORS
- **Production**: Use your actual domain in CORS
- **Multiple Environments**: Add both localhost and production URLs to CORS
- **Rate Limiting**: If uploads are too fast, reduce concurrency from 10 to 5

### 🔧 **Emergency Workaround**

If direct upload fails, you can temporarily fall back to the old bulk upload system:

```tsx
// In your project page, temporarily switch back
{
  showBulkUpload && (
    <BulkUploadModal // Old system that goes through your server
      projectId={projectId}
      onClose={() => setShowBulkUpload(false)}
      onUploadComplete={() => {
        fetchMedia();
        setShowBulkUpload(false);
      }}
    />
  );
}
```

This will be slower but bypass CORS/direct upload issues while you fix the configuration.
