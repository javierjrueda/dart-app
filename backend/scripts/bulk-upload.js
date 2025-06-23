const fs = require("fs").promises;
const path = require("path");
const FormData = require("form-data");
const fetch = require("node-fetch");

class BulkUploader {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || "http://localhost:3001/api/v1";
    this.projectId = options.projectId;
    this.authToken = options.authToken;
    this.batchSize = options.batchSize || 10; // Upload 10 files at a time
    this.delayBetweenBatches = options.delayBetweenBatches || 1000; // 1 second delay
    this.supportedExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".webp",
      ".mp4",
      ".webm",
      ".mov",
    ];

    // Progress tracking
    this.totalFiles = 0;
    this.processedFiles = 0;
    this.successfulUploads = 0;
    this.failedUploads = 0;
    this.skippedUploads = 0;
    this.retriedUploads = 0;
    this.errors = [];
    this.currentFile = "";
    this.startTime = null;

    // Progress callback
    this.onProgress = options.onProgress || (() => {});

    // Duplicate detection
    this.skipDuplicates = options.skipDuplicates !== false; // Default to true
    this.existingFiles = new Set(); // Cache existing filenames

    // Retry configuration
    this.maxRetries = options.maxRetries || 2;
    this.retryDelay = options.retryDelay || 3000; // 3 seconds

    // Error analysis
    this.errorStats = new Map();

    // Cancellation support
    this.uploadSessionId = options.uploadSessionId;
    this.cancelled = false;
  }

  async findMediaFiles(folderPath) {
    try {
      // Check if folder exists
      const stat = await fs.stat(folderPath);
      if (!stat.isDirectory()) {
        throw new Error(`Path is not a directory: ${folderPath}`);
      }
    } catch (error) {
      throw new Error(
        `Cannot access folder: ${folderPath}. Error: ${error.message}`
      );
    }

    const files = [];

    async function scanDirectory(dir) {
      try {
        const items = await fs.readdir(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          try {
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
              await scanDirectory.call(this, fullPath);
            } else if (stat.isFile()) {
              const ext = path.extname(item).toLowerCase();
              if (this.supportedExtensions.includes(ext)) {
                files.push(fullPath);
              }
            }
          } catch (itemError) {
            console.warn(
              `Warning: Could not process ${fullPath}: ${itemError.message}`
            );
          }
        }
      } catch (dirError) {
        console.warn(
          `Warning: Could not read directory ${dir}: ${dirError.message}`
        );
      }
    }

    await scanDirectory.call(this, folderPath);
    return files;
  }

  async checkForExistingFiles() {
    if (!this.skipDuplicates) return;

    try {
      console.log("🔍 Checking for existing files in project...");
      const response = await fetch(
        `${this.apiUrl}/projects/${this.projectId}/media/filenames`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Use the dedicated filenames endpoint for better performance
        data.filenames.forEach((filename) => {
          this.existingFiles.add(filename.toLowerCase());
        });
        console.log(`📋 Found ${this.existingFiles.size} existing files`);
      }
    } catch (error) {
      console.warn(
        "⚠️  Warning: Could not check existing files:",
        error.message
      );
    }
  }

  isDuplicate(filename) {
    if (!this.skipDuplicates) return false;
    return this.existingFiles.has(filename.toLowerCase());
  }

  analyzeError(error) {
    // Categorize errors for better debugging
    let errorType = "Unknown";
    const errorMessage = error.toLowerCase();

    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("etimedout")
    ) {
      errorType = "Timeout";
    } else if (
      errorMessage.includes("econnreset") ||
      errorMessage.includes("econnrefused")
    ) {
      errorType = "Connection";
    } else if (errorMessage.includes("http 401")) {
      errorType = "Authentication";
    } else if (errorMessage.includes("http 413")) {
      errorType = "File Too Large";
    } else if (errorMessage.includes("http 429")) {
      errorType = "Rate Limit";
    } else if (errorMessage.includes("http 500")) {
      errorType = "Server Error";
    } else if (
      errorMessage.includes("http 502") ||
      errorMessage.includes("http 503")
    ) {
      errorType = "Server Unavailable";
    } else if (errorMessage.includes("duplicate")) {
      errorType = "Duplicate";
    }

    // Track error frequency
    const count = this.errorStats.get(errorType) || 0;
    this.errorStats.set(errorType, count + 1);

    return errorType;
  }

  async checkCancellation() {
    if (!this.uploadSessionId) return false;

    try {
      const response = await fetch(
        `${this.apiUrl}/bulk-upload/${this.uploadSessionId}/progress`,
        {
          headers: {
            Authorization: `Bearer ${this.authToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.cancelled) {
          this.cancelled = true;
          console.log("🛑 Upload cancelled by user");
          return true;
        }
      }
    } catch (error) {
      console.warn("⚠️  Could not check cancellation status:", error.message);
    }

    return false;
  }

  async uploadSingleFile(filePath, retryCount = 0) {
    try {
      const fileName = path.basename(filePath);
      this.currentFile = fileName;

      // Check for duplicates
      if (this.isDuplicate(fileName)) {
        return {
          success: false,
          fileName,
          error: "Duplicate file (skipped)",
          skipped: true,
        };
      }

      const fileBuffer = await fs.readFile(filePath);
      const stats = await fs.stat(filePath);

      // Skip very large files to avoid timeouts
      if (stats.size > 100 * 1024 * 1024) {
        // 100MB
        return {
          success: false,
          fileName,
          error: "File too large (>100MB)",
          skipped: true,
        };
      }

      // Determine content type
      const ext = path.extname(fileName).toLowerCase();
      let contentType = "application/octet-stream";

      if ([".png"].includes(ext)) contentType = "image/png";
      else if ([".jpg", ".jpeg"].includes(ext)) contentType = "image/jpeg";
      else if ([".gif"].includes(ext)) contentType = "image/gif";
      else if ([".webp"].includes(ext)) contentType = "image/webp";
      else if ([".mp4"].includes(ext)) contentType = "video/mp4";
      else if ([".webm"].includes(ext)) contentType = "video/webm";
      else if ([".mov"].includes(ext)) contentType = "video/quicktime";

      const formData = new FormData();
      formData.append("media", fileBuffer, {
        filename: fileName,
        contentType: contentType,
      });
      formData.append("extractionMethod", "filename");

      // Add longer timeout for large files (increased for slow connections)
      const timeout = stats.size > 10 * 1024 * 1024 ? 120000 : 90000; // 2 minutes for large files, 90s for small

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(
          `${this.apiUrl}/projects/${this.projectId}/media/upload`,
          {
            method: "POST",
            body: formData,
            headers: {
              Authorization: `Bearer ${this.authToken}`,
              ...formData.getHeaders(),
            },
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.text();
          let errorMessage = `HTTP ${response.status}`;

          try {
            const parsed = JSON.parse(errorData);
            errorMessage = parsed.error || errorMessage;
          } catch {
            errorMessage += `: ${errorData.substring(0, 100)}`;
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();

        // Add to existing files cache
        if (this.skipDuplicates) {
          this.existingFiles.add(fileName.toLowerCase());
        }

        if (retryCount > 0) {
          this.retriedUploads++;
          console.log(
            `✅ Retry successful for ${fileName} (attempt ${retryCount + 1})`
          );
        }

        return {
          success: true,
          fileName,
          fileSize: stats.size,
          media: result.media,
          retryCount,
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (error) {
      const errorType = this.analyzeError(error.message);

      // Retry logic for certain types of errors
      if (retryCount < this.maxRetries && this.shouldRetry(error, errorType)) {
        console.log(
          `⚠️  Retry ${retryCount + 1}/${this.maxRetries} for ${path.basename(
            filePath
          )}: ${error.message}`
        );

        // Wait before retrying with exponential backoff
        const delay = this.retryDelay * Math.pow(2, retryCount);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.uploadSingleFile(filePath, retryCount + 1);
      }

      console.error(
        `❌ Failed to upload ${path.basename(filePath)}: ${error.message}`
      );

      return {
        success: false,
        fileName: path.basename(filePath),
        error: error.message,
        errorType,
        retryCount,
      };
    }
  }

  shouldRetry(error, errorType) {
    // Retry for network/server issues but not for client errors
    const retryableErrors = [
      "Timeout",
      "Connection",
      "Rate Limit",
      "Server Error",
      "Server Unavailable",
    ];
    return retryableErrors.includes(errorType);
  }

  async uploadBatch(files) {
    const promises = files.map((file) => this.uploadSingleFile(file));
    const results = await Promise.all(promises);

    // Check if we're hitting rate limits
    const rateLimitErrors = results.filter(
      (r) =>
        !r.success &&
        (r.error?.includes("429") ||
          r.error?.includes("Too many requests") ||
          r.error?.includes("ECONNRESET"))
    ).length;

    // If more than half the batch failed with rate limits, increase delay
    if (rateLimitErrors > files.length / 2) {
      console.log("⚠️  High rate limit errors detected, increasing delay...");
      this.delayBetweenBatches = Math.min(this.delayBetweenBatches * 2, 30000); // Cap at 30s
      console.log(`📊 New delay: ${this.delayBetweenBatches}ms`);
    }

    // Update counters
    results.forEach((result) => {
      this.processedFiles++;
      this.currentFile = result.fileName;
      if (result.success) {
        this.successfulUploads++;
      } else if (result.skipped) {
        this.skippedUploads++;
      } else {
        this.failedUploads++;
        this.errors.push({
          fileName: result.fileName,
          error: result.error,
          errorType: result.errorType,
          retryCount: result.retryCount,
        });
      }
    });

    // Report progress via callback
    this.reportProgress();

    return results;
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  reportProgress() {
    if (this.onProgress) {
      this.onProgress({
        status: "processing",
        totalFiles: this.totalFiles,
        processedFiles: this.processedFiles,
        successfulUploads: this.successfulUploads,
        failedUploads: this.failedUploads,
        skippedUploads: this.skippedUploads,
        retriedUploads: this.retriedUploads,
        currentFile: this.currentFile,
        startTime: this.startTime,
        errors: this.errors,
        completed: false,
      });
    }
  }

  printProgress() {
    const progress = ((this.processedFiles / this.totalFiles) * 100).toFixed(1);
    const elapsed = (Date.now() - this.startTime.getTime()) / 1000;
    const rate = this.processedFiles / elapsed;
    const eta = (this.totalFiles - this.processedFiles) / rate;

    console.log(
      `\n📊 Progress: ${this.processedFiles}/${this.totalFiles} (${progress}%)`
    );
    console.log(`✅ Successful: ${this.successfulUploads}`);
    console.log(`⏭️  Skipped: ${this.skippedUploads}`);
    console.log(`🔄 Retried: ${this.retriedUploads}`);
    console.log(`❌ Failed: ${this.failedUploads}`);
    console.log(`⏱️  Rate: ${rate.toFixed(2)} files/sec`);
    console.log(`🕐 ETA: ${this.formatTime(eta)}`);
    console.log(`⏰ Elapsed: ${this.formatTime(elapsed)}`);

    // Show error breakdown every 50 files
    if (this.processedFiles % 50 === 0 && this.errorStats.size > 0) {
      console.log(`\n🔍 Error Analysis:`);
      for (const [errorType, count] of this.errorStats.entries()) {
        console.log(`   ${errorType}: ${count} occurrences`);
      }
    }
  }

  async checkServerHealth() {
    try {
      console.log("🏥 Checking server health...");
      const response = await fetch(`${this.apiUrl}/../health`, {
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
        timeout: 5000,
      });

      if (response.ok) {
        const health = await response.json();
        console.log(`✅ Server healthy: ${health.status}`);
        return true;
      } else {
        console.warn(`⚠️  Server health check failed: HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      console.warn(`⚠️  Server health check failed: ${error.message}`);
      return false;
    }
  }

  async run(folderPath) {
    console.log("🚀 Starting bulk upload...");
    console.log(`📁 Scanning folder: ${folderPath}`);

    // Find all media files
    const files = await this.findMediaFiles(folderPath);
    this.totalFiles = files.length;

    if (this.totalFiles === 0) {
      console.log("❌ No supported media files found in the specified folder.");
      return;
    }

    console.log(`📋 Found ${this.totalFiles} media files`);

    // Check server health before starting
    const serverHealthy = await this.checkServerHealth();
    if (!serverHealthy) {
      console.log(
        "⚠️  Server health check failed, but continuing with upload..."
      );
    }

    // Check for existing files to avoid duplicates
    await this.checkForExistingFiles();

    // Adjust batch size and delays for large uploads to reduce server load
    if (this.totalFiles > 500) {
      this.batchSize = Math.min(this.batchSize, 3); // Even smaller batches
      this.delayBetweenBatches = Math.max(this.delayBetweenBatches, 5000); // Longer delays
      console.log(
        `🔧 Large upload detected: adjusted batch size to ${this.batchSize}, delay to ${this.delayBetweenBatches}ms`
      );
    } else if (this.totalFiles > 100) {
      this.batchSize = Math.min(this.batchSize, 5);
      this.delayBetweenBatches = Math.max(this.delayBetweenBatches, 3000);
      console.log(
        `🔧 Medium upload detected: adjusted batch size to ${this.batchSize}, delay to ${this.delayBetweenBatches}ms`
      );
    }

    console.log(`🎯 Project ID: ${this.projectId}`);
    console.log(`📦 Batch size: ${this.batchSize}`);
    console.log(`⏳ Delay between batches: ${this.delayBetweenBatches}ms`);
    console.log(`🔄 Max retries: ${this.maxRetries}`);
    console.log(
      `🔍 Duplicate detection: ${this.skipDuplicates ? "enabled" : "disabled"}`
    );
    console.log("\n▶️  Starting upload process...\n");

    this.startTime = new Date();

    // Report initial progress
    this.reportProgress();

    // Process files in batches
    for (let i = 0; i < files.length; i += this.batchSize) {
      // Check for cancellation before each batch
      if (await this.checkCancellation()) {
        console.log("🛑 Upload cancelled by user");
        break;
      }

      const batch = files.slice(i, i + this.batchSize);
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const totalBatches = Math.ceil(files.length / this.batchSize);

      console.log(
        `\n🔄 Processing batch ${batchNumber}/${totalBatches} (${batch.length} files)...`
      );

      await this.uploadBatch(batch);
      this.printProgress();

      // Check for cancellation after each batch
      if (await this.checkCancellation()) {
        console.log("🛑 Upload cancelled by user");
        break;
      }

      // Check server health every 10 batches if there are many failures
      if (
        batchNumber % 10 === 0 &&
        this.failedUploads > this.successfulUploads
      ) {
        console.log(
          "\n🏥 High failure rate detected, checking server health..."
        );
        const healthy = await this.checkServerHealth();
        if (!healthy) {
          console.log("⚠️  Server appears unhealthy, increasing delays...");
          this.delayBetweenBatches = Math.max(this.delayBetweenBatches, 10000); // 10 second delay
        }
      }

      // Longer delay between batches to avoid overwhelming the server
      if (i + this.batchSize < files.length) {
        console.log(
          `⏸️  Waiting ${this.delayBetweenBatches}ms before next batch...`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, this.delayBetweenBatches)
        );
      }
    }

    // Report final progress
    const finalStatus = this.cancelled ? "cancelled" : "completed";
    if (this.onProgress) {
      this.onProgress({
        status: finalStatus,
        totalFiles: this.totalFiles,
        processedFiles: this.processedFiles,
        successfulUploads: this.successfulUploads,
        failedUploads: this.failedUploads,
        skippedUploads: this.skippedUploads,
        retriedUploads: this.retriedUploads,
        currentFile: "",
        startTime: this.startTime,
        errors: this.errors,
        completed: true,
        cancelled: this.cancelled,
      });
    }

    // Final summary
    const totalTime = (Date.now() - this.startTime.getTime()) / 1000;
    if (this.cancelled) {
      console.log("\n🛑 Bulk upload cancelled!");
    } else {
      console.log("\n🎉 Bulk upload completed!");
    }
    console.log(`\n📊 Final Results:`);
    console.log(`✅ Successful uploads: ${this.successfulUploads}`);
    console.log(`⏭️  Skipped uploads: ${this.skippedUploads}`);
    console.log(`🔄 Retried uploads: ${this.retriedUploads}`);
    console.log(`❌ Failed uploads: ${this.failedUploads}`);
    console.log(`⏰ Total time: ${this.formatTime(totalTime)}`);
    console.log(
      `📈 Average rate: ${(this.totalFiles / totalTime).toFixed(2)} files/sec`
    );

    // Detailed error analysis
    if (this.errorStats.size > 0) {
      console.log(`\n🔍 Error Breakdown:`);
      for (const [errorType, count] of this.errorStats.entries()) {
        console.log(`   ${errorType}: ${count} occurrences`);
      }
    }

    // Show errors if any
    if (this.errors.length > 0) {
      console.log(`\n❌ Errors (${this.errors.length}):`);
      this.errors.slice(0, 10).forEach((error, index) => {
        console.log(
          `${index + 1}. ${error.fileName}: ${error.error} (${
            error.errorType || "Unknown"
          })`
        );
      });
      if (this.errors.length > 10) {
        console.log(`... and ${this.errors.length - 10} more errors`);
      }
    }
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log(`
Usage: node bulk-upload.js <folder_path> <project_id> <auth_token> [options]

Arguments:
  folder_path   Path to folder containing images/videos
  project_id    Target project ID
  auth_token    Authentication token

Options:
  --batch-size <number>     Files per batch (default: 10)
  --delay <milliseconds>    Delay between batches (default: 1000)
  --api-url <url>          API base URL (default: http://localhost:3001/api/v1)

Examples:
  node bulk-upload.js ./images my-project-id your-auth-token
  node bulk-upload.js ./images my-project-id your-auth-token --batch-size 5 --delay 2000
`);
    process.exit(1);
  }

  const [folderPath, projectId, authToken] = args;

  // Parse options
  const options = { projectId, authToken };
  for (let i = 3; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case "--batch-size":
        options.batchSize = parseInt(value);
        break;
      case "--delay":
        options.delayBetweenBatches = parseInt(value);
        break;
      case "--api-url":
        options.apiUrl = value;
        break;
    }
  }

  const uploader = new BulkUploader(options);
  uploader.run(folderPath).catch((error) => {
    console.error("❌ Upload failed:", error);
    process.exit(1);
  });
}

module.exports = BulkUploader;
