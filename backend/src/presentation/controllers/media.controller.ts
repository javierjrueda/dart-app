import { Request, Response } from "express";
import { MediaUseCases } from "@/application/use-cases/media.use-cases";
import { MongoDBMediaRepository } from "@/infrastructure/repositories/mongodb-media.repository";
import { CloudflareR2Service } from "@/infrastructure/services/cloudflare-r2.service";
import multer from "multer";

// Extend Request interface to include file property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/ogg",
      "video/quicktime",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only images and videos are allowed."));
    }
  },
});

export class MediaController {
  private mediaUseCases: MediaUseCases;
  private r2Service: CloudflareR2Service | null = null;

  constructor() {
    const mediaRepository = new MongoDBMediaRepository();
    this.mediaUseCases = new MediaUseCases(mediaRepository);
    // Don't instantiate R2Service here - do it lazily when needed
  }

  private getR2Service(): CloudflareR2Service {
    if (!this.r2Service) {
      this.r2Service = new CloudflareR2Service();
    }
    return this.r2Service;
  }

  // Middleware for file upload
  uploadMiddleware = upload.single("media");

  async uploadMedia(req: MulterRequest, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const file = req.file;
      const { loraTraining, promptDescription, extractionMethod } = req.body;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      // Validate file type
      const mediaType = this.getR2Service().validateFileType(file.mimetype);
      if (!mediaType) {
        return res.status(400).json({
          error: "Invalid file type. Only images and videos are allowed.",
        });
      }

      // Upload to Cloudflare R2
      const uploadResult = await this.getR2Service().uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        projectId
      );

      // Save media record to database with metadata extraction
      const media = await this.mediaUseCases.createMedia({
        projectId,
        mediaUrl: uploadResult.url,
        mediaType,
        loraTraining: loraTraining || undefined,
        promptDescription: promptDescription || undefined,
        extractionMethod: extractionMethod || "filename",
        filename: file.originalname,
      });

      return res.status(201).json({
        message: "Media uploaded successfully",
        media: media.toJSON(),
        uploadInfo: uploadResult,
      });
    } catch (error) {
      console.error("Upload error:", error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to upload media",
      });
    }
  }

  async getProjectMedia(req: Request, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      const media = await this.mediaUseCases.getMediaByProjectId(projectId);

      // Sort by createdAt descending (newest first)
      const sortedMedia = media.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMedia = sortedMedia.slice(startIndex, endIndex);

      return res.json({
        media: paginatedMedia.map((m) => m.toJSON()),
        total: media.length,
        page,
        limit,
        totalPages: Math.ceil(media.length / limit),
      });
    } catch (error) {
      console.error("Get media error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get media",
      });
    }
  }

  async getExistingFilenames(req: Request, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      const filenames = await this.mediaUseCases.getExistingFilenames(
        projectId
      );

      return res.json({
        filenames,
        count: filenames.length,
      });
    } catch (error) {
      console.error("Get existing filenames error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to get existing filenames",
      });
    }
  }

  async getUniqueGenerationParams(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      const params = await this.mediaUseCases.getUniqueGenerationParams(
        projectId
      );

      return res.json({
        params,
        count: params.length,
      });
    } catch (error) {
      console.error("Get unique generation params error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to get generation params",
      });
    }
  }

  async getProjectAnalytics(req: Request, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      const analytics = await this.mediaUseCases.getProjectAnalytics(projectId);

      return res.json(analytics);
    } catch (error) {
      console.error("Get project analytics error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to get project analytics",
      });
    }
  }

  async getMedia(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const media = await this.mediaUseCases.getMediaById(id);

      if (!media) {
        return res.status(404).json({ error: "Media not found" });
      }

      return res.json(media.toJSON());
    } catch (error) {
      console.error("Get media error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get media",
      });
    }
  }

  async deleteMedia(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      // Get media record first to get the file key
      const media = await this.mediaUseCases.getMediaById(id);
      if (!media) {
        return res.status(404).json({ error: "Media not found" });
      }

      // Delete from Cloudflare R2
      try {
        const fileKey = this.getR2Service().getFileKeyFromUrl(media.mediaUrl);
        await this.getR2Service().deleteFile(fileKey);
      } catch (r2Error) {
        console.error("Error deleting from R2:", r2Error);
        // Continue with database deletion even if R2 deletion fails
      }

      // Delete from database
      const deleted = await this.mediaUseCases.deleteMedia(id);

      if (!deleted) {
        return res.status(404).json({ error: "Media not found" });
      }

      return res.json({ message: "Media deleted successfully" });
    } catch (error) {
      console.error("Delete media error:", error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to delete media",
      });
    }
  }

  async updateElo(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { elo } = req.body;

      if (typeof elo !== "number") {
        return res.status(400).json({ error: "ELO must be a number" });
      }

      const media = await this.mediaUseCases.updateElo(id, elo);

      if (!media) {
        return res.status(404).json({ error: "Media not found" });
      }

      return res.json({
        message: "ELO updated successfully",
        media: media.toJSON(),
      });
    } catch (error) {
      console.error("Update ELO error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to update ELO",
      });
    }
  }

  async updateQuality(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { quality } = req.body;

      if (quality !== -1 && quality !== 0 && quality !== 1) {
        return res.status(400).json({ error: "Quality must be -1, 0, or 1" });
      }

      const media = await this.mediaUseCases.updateQuality(id, quality);

      if (!media) {
        return res.status(404).json({ error: "Media not found" });
      }

      return res.json({
        message: "Quality updated successfully",
        media: media.toJSON(),
      });
    } catch (error) {
      console.error("Update quality error:", error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to update quality",
      });
    }
  }

  async bulkUpdateQuality(req: Request, res: Response): Promise<Response> {
    try {
      const { mediaIds, quality } = req.body;

      if (!Array.isArray(mediaIds) || mediaIds.length === 0) {
        return res
          .status(400)
          .json({ error: "mediaIds must be a non-empty array" });
      }

      if (quality !== -1 && quality !== 0 && quality !== 1) {
        return res.status(400).json({ error: "Quality must be -1, 0, or 1" });
      }

      const results = await this.mediaUseCases.bulkUpdateQuality(
        mediaIds,
        quality
      );

      return res.json({
        message: "Bulk quality update completed",
        updated: results.updated,
        failed: results.failed,
        total: mediaIds.length,
      });
    } catch (error) {
      console.error("Bulk update quality error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to bulk update quality",
      });
    }
  }

  async getAllMedia(req: Request, res: Response): Promise<Response> {
    try {
      const media = await this.mediaUseCases.getAllMedia();

      return res.json({
        media: media.map((m) => m.toJSON()),
        count: media.length,
      });
    } catch (error) {
      console.error("Get all media error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get media",
      });
    }
  }

  async getPresignedUrl(req: Request, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const { fileName, fileType } = req.body;

      if (!fileName || !fileType) {
        return res.status(400).json({
          error: "fileName and fileType are required",
        });
      }

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      // Validate file type
      const mediaType = this.getR2Service().validateFileType(fileType);
      if (!mediaType) {
        return res.status(400).json({
          error: "Invalid file type. Only images and videos are allowed.",
        });
      }

      // Generate presigned URL
      const presignedData = await this.getR2Service().generatePresignedUrl(
        fileName,
        fileType,
        projectId
      );

      return res.json({
        ...presignedData,
        mediaType,
      });
    } catch (error) {
      console.error("Presigned URL error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate presigned URL",
      });
    }
  }

  async getMediaByPrompt(req: Request, res: Response): Promise<Response> {
    try {
      const { promptDescription } = req.query;

      if (!promptDescription || typeof promptDescription !== "string") {
        return res
          .status(400)
          .json({ error: "Prompt description is required" });
      }

      const media = await this.mediaUseCases.getMediaByPromptDescription(
        promptDescription
      );

      return res.json({
        media: media.map((m) => m.toJSON()),
        count: media.length,
      });
    } catch (error) {
      console.error("Get media by prompt error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to get media by prompt",
      });
    }
  }

  async updateMediaMetadata(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { loraTraining, promptDescription, generationParams } = req.body;

      const media = await this.mediaUseCases.updateMediaMetadata(id, {
        loraTraining,
        promptDescription,
        generationParams,
      });

      if (!media) {
        return res.status(404).json({ error: "Media not found" });
      }

      return res.json({
        message: "Media metadata updated successfully",
        media: media.toJSON(),
      });
    } catch (error) {
      console.error("Update media metadata error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to update media metadata",
      });
    }
  }

  async bulkUpload(req: Request, res: Response): Promise<Response> {
    try {
      // Only allow in development
      if (process.env.NODE_ENV !== "development") {
        return res
          .status(403)
          .json({ error: "Bulk upload only available in development" });
      }

      const { projectId } = req.params;
      const {
        folderPath,
        batchSize = 10,
        delay = 1000,
        skipDuplicates = true,
      } = req.body;

      if (!folderPath) {
        return res.status(400).json({ error: "Folder path is required" });
      }

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      // Import the bulk uploader
      const BulkUploader = require("../../../scripts/bulk-upload");

      // Get the auth token from current session
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const authToken = authHeader.substring(7);

      // Create a unique upload session ID for tracking
      const uploadSessionId = `upload_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Store progress in memory (in production, you'd use Redis or similar)
      (global as any).uploadProgress = (global as any).uploadProgress || {};
      (global as any).uploadProgress[uploadSessionId] = {
        status: "initializing",
        totalFiles: 0,
        processedFiles: 0,
        successfulUploads: 0,
        failedUploads: 0,
        skippedUploads: 0,
        currentFile: "",
        startTime: new Date(),
        errors: [],
        completed: false,
        cancelled: false,
      };

      // Create uploader instance with progress callbacks
      const uploader = new BulkUploader({
        projectId,
        authToken,
        batchSize: parseInt(batchSize),
        delayBetweenBatches: parseInt(delay),
        skipDuplicates: Boolean(skipDuplicates),
        apiUrl: `${req.protocol}://${req.get("host")}/api/v1`,
        uploadSessionId: uploadSessionId, // Pass session ID for cancellation support
        onProgress: (progress: any) => {
          if ((global as any).uploadProgress[uploadSessionId]) {
            (global as any).uploadProgress[uploadSessionId] = {
              ...(global as any).uploadProgress[uploadSessionId],
              ...progress,
              lastUpdate: new Date(),
            };
          }
        },
      });

      // Start the upload process in background
      setImmediate(async () => {
        try {
          await uploader.run(folderPath);
          if ((global as any).uploadProgress[uploadSessionId]) {
            (global as any).uploadProgress[uploadSessionId].status =
              "completed";
            (global as any).uploadProgress[uploadSessionId].completed = true;
          }
          console.log("✅ Bulk upload completed successfully");
        } catch (error) {
          if ((global as any).uploadProgress[uploadSessionId]) {
            (global as any).uploadProgress[uploadSessionId].status = "failed";
            (global as any).uploadProgress[uploadSessionId].error =
              error instanceof Error ? error.message : String(error);
            (global as any).uploadProgress[uploadSessionId].completed = true;
          }
          console.error("❌ Bulk upload failed:", error);
        }
      });

      return res.json({
        message: "Bulk upload started",
        uploadSessionId,
        projectId,
        folderPath,
        batchSize,
        delay,
        skipDuplicates,
      });
    } catch (error) {
      console.error("Bulk upload error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to start bulk upload",
      });
    }
  }

  async getBulkUploadProgress(req: Request, res: Response): Promise<Response> {
    try {
      const { sessionId } = req.params;

      if (
        !(global as any).uploadProgress ||
        !(global as any).uploadProgress[sessionId]
      ) {
        return res.status(404).json({ error: "Upload session not found" });
      }

      return res.json((global as any).uploadProgress[sessionId]);
    } catch (error) {
      console.error("Get progress error:", error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to get progress",
      });
    }
  }

  async cancelBulkUpload(req: Request, res: Response): Promise<Response> {
    try {
      const { sessionId } = req.params;

      if (
        !(global as any).uploadProgress ||
        !(global as any).uploadProgress[sessionId]
      ) {
        return res.status(404).json({ error: "Upload session not found" });
      }

      // Set cancellation flag
      (global as any).uploadProgress[sessionId].cancelled = true;
      (global as any).uploadProgress[sessionId].status = "cancelled";

      console.log(`🛑 Bulk upload ${sessionId} cancelled by user`);

      return res.json({
        message: "Upload cancelled successfully",
        sessionId,
      });
    } catch (error) {
      console.error("Cancel upload error:", error);
      return res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to cancel upload",
      });
    }
  }

  async testR2Connection(req: Request, res: Response): Promise<Response> {
    try {
      // Only allow in development
      if (process.env.NODE_ENV !== "development") {
        return res
          .status(403)
          .json({ error: "Test endpoint only available in development" });
      }

      const { projectId } = req.params;
      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      // Create a tiny test file (just a few bytes)
      const testContent = Buffer.from("test file content");
      const testFileName = `test-${Date.now()}.txt`;

      try {
        const uploadResult = await this.getR2Service().uploadFile(
          testContent,
          testFileName,
          "text/plain",
          projectId
        );

        return res.json({
          message: "R2 connection test successful",
          testFile: {
            fileName: testFileName,
            size: testContent.length,
            url: uploadResult.url,
            key: uploadResult.key,
          },
        });
      } catch (r2Error) {
        console.error("R2 test failed:", r2Error);
        return res.status(500).json({
          error: "R2 connection test failed",
          details: r2Error instanceof Error ? r2Error.message : String(r2Error),
        });
      }
    } catch (error) {
      console.error("Test R2 connection error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to test R2 connection",
      });
    }
  }

  async getBatchPresignedUrls(req: Request, res: Response): Promise<Response> {
    try {
      // Force reload - Updated duplicate checking to consider prompt numbers
      const { projectId } = req.params;
      const { files, promptNumber } = req.body; // Array of { fileName, contentType, size } and promptNumber

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({
          error:
            "Files array is required with fileName and contentType for each file",
        });
      }

      // Validate prompt number is provided
      if (promptNumber === undefined || promptNumber === null) {
        return res.status(400).json({
          error: "Prompt number is required for batch upload",
        });
      }

      // Validate batch size (prevent abuse)
      if (files.length > 4000) {
        return res.status(400).json({
          error: "Maximum 4000 files per batch request",
        });
      }

      console.log(
        `🔍 Batch presigned URLs requested for ${files.length} files in project ${projectId} with prompt ${promptNumber}`
      );

      const r2Service = this.getR2Service();
      const presignedUrls = [];
      const validFiles = [];
      const skippedFiles: Array<{ fileName: string; reason: string }> = [];

      // Enhanced duplicate detection: get existing files with their metadata
      const existingMedia = await this.mediaUseCases.getMediaByProjectId(
        projectId
      );
      const existingFileMap = new Map();

      // Build a map of existing files with their metadata for smarter duplicate detection
      existingMedia.forEach((media) => {
        if (media.filename) {
          // Create a composite key using filename and prompt number
          const key = `${media.filename.toLowerCase()}_prompt_${
            media.prompt || "undefined"
          }`;
          existingFileMap.set(key, {
            filename: media.filename,
            prompt: media.prompt,
            generationParams: media.generationParams,
          });
        }
      });

      console.log(
        `📋 Found ${existingMedia.length} existing media files in project ${projectId}`
      );
      console.log(
        `   Unique filename+prompt combinations: ${existingFileMap.size}`
      );

      // Debug: Show some existing entries to understand the data
      console.log(`🔍 Sample existing entries (first 5):`);
      let sampleCount = 0;
      existingFileMap.forEach((value, key) => {
        if (sampleCount < 5) {
          console.log(`   - Key: "${key}" | Prompt: ${value.prompt}`);
          sampleCount++;
        }
      });

      console.log(
        `🎯 Processing ${files.length} incoming files for smart duplicates with prompt ${promptNumber}...`
      );

      for (const file of files) {
        const fileNameLower = file.fileName.toLowerCase();

        // Validate file type
        const mediaType = r2Service.validateFileType(file.contentType);
        if (!mediaType) {
          console.log(
            `❌ Skipping ${file.fileName}: Invalid file type (${file.contentType})`
          );
          skippedFiles.push({
            fileName: file.fileName,
            reason: "Invalid file type",
          });
          continue; // Skip invalid files
        }

        // Smart duplicate checking with prompt number
        const compositeKey = `${fileNameLower}_prompt_${promptNumber}`;
        const isDuplicate = existingFileMap.has(compositeKey);

        // Debug: Show what we're checking
        if (
          file.fileName.includes("flux_test_001") ||
          file.fileName.includes("flux_test_002")
        ) {
          console.log(`🔍 Debug - Checking duplicate for: ${file.fileName}`);
          console.log(`   - Composite key: "${compositeKey}"`);
          console.log(`   - Is duplicate: ${isDuplicate}`);
        }

        if (isDuplicate) {
          const existingFile = existingFileMap.get(compositeKey);
          console.log(`🔄 Skipping ${file.fileName}: Duplicate detected`);
          console.log(
            `   🎯 Already exists with same prompt number (${promptNumber})`
          );
          console.log(`   📋 Existing file: ${existingFile.filename}`);

          skippedFiles.push({
            fileName: file.fileName,
            reason: `Duplicate file (same filename and prompt number ${promptNumber})`,
          });
          continue; // Skip duplicates
        } else {
          // Check if same filename exists with different prompt number
          const sameFilenameEntries = Array.from(
            existingFileMap.entries()
          ).filter(
            ([key, value]) => value.filename.toLowerCase() === fileNameLower
          );

          if (sameFilenameEntries.length > 0) {
            console.log(
              `✅ Allowing ${file.fileName} with prompt ${promptNumber}`
            );
            console.log(
              `   📋 Same filename exists with different prompt numbers:`
            );
            sameFilenameEntries.forEach(([key, value]) => {
              console.log(`      - Prompt ${value.prompt}: ${value.filename}`);
            });
          }
        }

        try {
          const { uploadUrl, key, publicUrl } =
            await r2Service.generatePresignedUrl(
              file.fileName,
              file.contentType,
              projectId,
              3600 // 1 hour expiry
            );

          presignedUrls.push({
            fileName: file.fileName,
            uploadUrl,
            key,
            publicUrl,
            mediaType,
          });

          validFiles.push({
            fileName: file.fileName,
            key,
            publicUrl,
            mediaType,
          });

          console.log(`✅ Generated presigned URL for ${file.fileName}`);
        } catch (error) {
          console.error(
            `❌ Failed to generate presigned URL for ${file.fileName}:`,
            error
          );
          skippedFiles.push({
            fileName: file.fileName,
            reason: `URL generation failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          });
        }
      }

      const totalSkipped = skippedFiles.length;
      const duplicateCount = skippedFiles.filter((f) =>
        f.reason.includes("Duplicate file")
      ).length;
      const invalidTypeCount = skippedFiles.filter(
        (f) => f.reason === "Invalid file type"
      ).length;

      console.log(`📊 Batch processing complete:`);
      console.log(`   ✅ Valid files with URLs: ${presignedUrls.length}`);
      console.log(
        `   🔄 Skipped duplicates (same filename + prompt): ${duplicateCount}`
      );
      console.log(`   ❌ Skipped invalid types: ${invalidTypeCount}`);
      console.log(`   📋 Total skipped: ${totalSkipped}`);

      // Enhanced debugging: log all skipped duplicates with their exact filenames
      const duplicateSkips = skippedFiles.filter((f) =>
        f.reason.includes("Duplicate file")
      );
      if (duplicateSkips.length > 0) {
        console.log(`🔍 Detailed duplicate analysis:`);
        duplicateSkips.forEach((skip) => {
          console.log(`   🔄 Skipped: ${skip.fileName} - ${skip.reason}`);
        });
      }

      return res.json({
        presignedUrls,
        validFiles,
        totalRequested: files.length,
        totalValid: presignedUrls.length,
        skippedDuplicates: duplicateCount,
        skippedInvalidTypes: invalidTypeCount,
        skippedTotal: totalSkipped,
        skippedDetails: skippedFiles.slice(0, 20), // Increased from 10 to 20 for better debugging
      });
    } catch (error) {
      console.error("Batch presigned URL error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate presigned URLs",
      });
    }
  }

  async confirmBatchUpload(req: Request, res: Response): Promise<Response> {
    try {
      const { projectId } = req.params;
      const { uploadedFiles } = req.body; // Array of { fileName, key, publicUrl, mediaType, prompt? }

      console.log(
        `📥 Confirming batch upload for ${
          uploadedFiles?.length || 0
        } files in project ${projectId}`
      );
      console.log(`📋 Upload data sample:`, uploadedFiles?.[0]);

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      if (!uploadedFiles || !Array.isArray(uploadedFiles)) {
        return res
          .status(400)
          .json({ error: "uploadedFiles array is required" });
      }

      const createdMedia: any[] = [];
      const errors: Array<{ fileName: string; error: string }> = [];

      // Process in smaller batches to avoid overwhelming the database
      const batchSize = 20;
      for (let i = 0; i < uploadedFiles.length; i += batchSize) {
        const batch = uploadedFiles.slice(i, i + batchSize);
        console.log(
          `🔄 Processing batch ${Math.floor(i / batchSize) + 1}: ${
            batch.length
          } files`
        );

        const batchPromises = batch.map(async (file) => {
          try {
            // Validate prompt is provided for each file
            if (file.prompt === undefined || file.prompt === null) {
              throw new Error("Prompt number is required for each file");
            }

            console.log(
              `📝 Creating media for ${file.fileName} with prompt: ${file.prompt}`
            );
            const media = await this.mediaUseCases.createMedia({
              projectId,
              mediaUrl: file.publicUrl,
              mediaType: file.mediaType,
              filename: file.fileName,
              prompt: file.prompt,
              extractionMethod: "filename",
            });
            console.log(`✅ Successfully created media for ${file.fileName}`);
            return media.toJSON();
          } catch (error) {
            console.error(
              `❌ Failed to create media for ${file.fileName}:`,
              error
            );
            errors.push({
              fileName: file.fileName,
              error: error instanceof Error ? error.message : "Unknown error",
            });
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        createdMedia.push(...batchResults.filter(Boolean));
      }

      console.log(
        `📊 Batch confirmation complete: Created ${createdMedia.length}, Errors ${errors.length}`
      );
      if (errors.length > 0) {
        console.log(`❌ Errors:`, errors);
      }

      return res.json({
        message: "Batch upload confirmation completed",
        created: createdMedia.length,
        errors: errors.length,
        errorDetails: errors,
      });
    } catch (error) {
      console.error("Batch upload confirmation error:", error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to confirm batch upload",
      });
    }
  }
}
