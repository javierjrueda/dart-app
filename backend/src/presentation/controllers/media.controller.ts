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

      // Save media record to database
      const media = await this.mediaUseCases.createMedia({
        projectId,
        mediaUrl: uploadResult.url,
        mediaType,
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

      if (!projectId) {
        return res.status(400).json({ error: "Project ID is required" });
      }

      const media = await this.mediaUseCases.getMediaByProjectId(projectId);

      return res.json({
        media: media.map((m) => m.toJSON()),
        count: media.length,
      });
    } catch (error) {
      console.error("Get media error:", error);
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get media",
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
      const { fileName, contentType } = req.body;

      if (!fileName || !contentType) {
        return res.status(400).json({
          error: "fileName and contentType are required",
        });
      }

      // Validate file type
      const mediaType = this.getR2Service().validateFileType(contentType);
      if (!mediaType) {
        return res.status(400).json({
          error: "Invalid file type. Only images and videos are allowed.",
        });
      }

      const presignedData = await this.getR2Service().generatePresignedUrl(
        fileName,
        contentType,
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
            : "Failed to generate upload URL",
      });
    }
  }
}
