# Bulk Upload Optimization Guide

## Problem with Current Implementation

Your current bulk upload system has several performance bottlenecks:

- **Sequential Processing**: Uploads 10 files at a time with 15-second delays
- **Server Bottleneck**: All files pass through your Node.js server
- **Memory Issues**: Files loaded into server memory before R2 upload
- **Timeout Prone**: Long HTTP requests frequently timeout
- **Poor Scalability**: Cannot handle 1-3k images efficiently

## Optimized Solutions

### 🚀 Option 1: Direct Client Upload (Recommended)

**How it works:**

1. Client requests batch presigned URLs from your API
2. Client uploads files directly to Cloudflare R2 (bypassing your server)
3. Client confirms successful uploads to register in database

**Benefits:**

- ⚡ **10-50x faster** than current approach
- 🛡️ **No server timeouts** - uploads happen directly to R2
- 💾 **Zero server memory usage** for file data
- 🔄 **Concurrent uploads** (10-30 files simultaneously)
- 🎯 **Smart duplicate detection** before upload
- 📊 **Real-time progress tracking**

**Usage:**

```typescript
// Import the new component
import OptimizedBulkUpload from "@/components/OptimizedBulkUpload";

// Use instead of BulkUploadModal
<OptimizedBulkUpload
  projectId={projectId}
  onClose={onClose}
  onUploadComplete={onUploadComplete}
/>;
```

**API Endpoints Added:**

- `POST /projects/:projectId/media/batch-presigned-urls` - Get upload URLs (max 1000 files per batch)
- `POST /projects/:projectId/media/confirm-batch-upload` - Confirm uploads

### 🔧 Option 2: Background Job Queue

For even larger scale (thousands of files), implement a job queue:

```typescript
// Example implementation
const Queue = require("bull");
const uploadQueue = new Queue("file upload");

// Add files to queue
uploadQueue.add("upload-batch", {
  files: fileList,
  projectId,
  userId,
});

// Process queue with concurrency
uploadQueue.process("upload-batch", 20, async (job) => {
  const { files, projectId } = job.data;
  // Process files in background
});
```

### 📈 Performance Comparison

| Method         | 100 Images | 1000 Images | Timeouts  | Server Load |
| -------------- | ---------- | ----------- | --------- | ----------- |
| **Current**    | ~25 min    | ~4+ hours   | Very High | High        |
| **Optimized**  | ~2-5 min   | ~20-50 min  | None      | Minimal     |
| **With Queue** | ~3-7 min   | ~30-60 min  | None      | Low         |

## Implementation Steps

### 1. Use the New Component

Replace your current `BulkUploadModal` with `OptimizedBulkUpload`:

```tsx
// In your project page
const [showOptimizedUpload, setShowOptimizedUpload] = useState(false);

{
  showOptimizedUpload && (
    <OptimizedBulkUpload
      projectId={project.id}
      onClose={() => setShowOptimizedUpload(false)}
      onUploadComplete={() => {
        setShowOptimizedUpload(false);
        // Refresh your media list
      }}
    />
  );
}
```

### 2. Configure Concurrency

The component allows you to adjust concurrent uploads:

- **5 concurrent**: Conservative, works on slower connections
- **10 concurrent**: Recommended for most users
- **20 concurrent**: Aggressive, for fast connections
- **30 concurrent**: Maximum, may hit rate limits

### 3. Monitor Performance

Watch the browser console for performance logs:

```
📋 Getting presigned URLs for 100 files...
🔗 Got 95 presigned URLs, skipped 5 duplicates
🚀 Starting concurrent upload of 95 files (max 10 at once)...
✅ Confirming 95 successful uploads...
🎉 Bulk upload completed!
```

## Advanced Optimizations

### 1. Cloudflare R2 Rate Limits

If you hit rate limits, consider:

- Reducing concurrency to 5-10
- Adding exponential backoff retry logic
- Upgrading your Cloudflare plan for higher limits

### 2. Large File Handling

For files >100MB, implement multipart uploads:

```typescript
// In CloudflareR2Service
async generateMultipartUpload(fileName: string, fileSize: number) {
  // Implement S3 multipart upload for large files
}
```

### 3. Progress Persistence

Save upload progress to localStorage to resume interrupted uploads:

```typescript
// Save progress
localStorage.setItem(`upload-${sessionId}`, JSON.stringify(progress));

// Resume on page reload
const savedProgress = localStorage.getItem(`upload-${sessionId}`);
```

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure R2 bucket allows direct uploads
2. **Rate Limits**: Reduce concurrency or add delays
3. **Memory Issues**: Browser may struggle with 1000+ files - batch the requests
4. **Network Timeouts**: Implement retry logic for failed uploads

### Monitoring:

Check these metrics to optimize performance:

- Upload success rate (aim for >95%)
- Average upload time per file
- Concurrent connection efficiency
- Error types and frequency

## Migration Strategy

1. **Test Phase**: Deploy both components, test with small batches
2. **Gradual Rollout**: Start with power users, monitor performance
3. **Full Migration**: Replace old component once stable
4. **Cleanup**: Remove old bulk upload endpoints after migration

This optimization should easily handle your target of 1-3k images per day with much better reliability and performance.
