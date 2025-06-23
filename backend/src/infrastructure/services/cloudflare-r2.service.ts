import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadResult {
  url: string;
  key: string;
}

export class CloudflareR2Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    // Initialize S3 client for Cloudflare R2
    this.s3Client = new S3Client({
      region: "auto", // Cloudflare R2 uses 'auto' as region
      endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
      },
    });

    this.bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "dart";
  }

  async uploadFile(
    file: Buffer,
    fileName: string,
    contentType: string,
    projectId: string
  ): Promise<UploadResult> {
    try {
      // Generate unique file key with project prefix
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const extension = fileName.split(".").pop();
      const key = `projects/${projectId}/media/${timestamp}-${randomString}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: contentType,
        Metadata: {
          projectId: projectId,
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      // Generate the public URL
      const url = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

      return {
        url,
        key,
      };
    } catch (error) {
      console.error("Error uploading file to Cloudflare R2:", error);
      throw new Error("Failed to upload file to cloud storage");
    }
  }

  async deleteFile(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error("Error deleting file from Cloudflare R2:", error);
      return false;
    }
  }

  async generatePresignedUrl(
    fileName: string,
    contentType: string,
    projectId: string,
    expiresIn: number = 3600 // 1 hour default
  ): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
    try {
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const extension = fileName.split(".").pop();
      const key = `projects/${projectId}/media/${timestamp}-${randomString}.${extension}`;

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        Metadata: {
          projectId: projectId,
          originalName: fileName,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;

      return {
        uploadUrl,
        key,
        publicUrl,
      };
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw new Error("Failed to generate upload URL");
    }
  }

  validateFileType(contentType: string): "image" | "video" | null {
    if (contentType.startsWith("image/")) {
      // Common image types
      const supportedImageTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/svg+xml",
      ];
      return supportedImageTypes.includes(contentType) ? "image" : null;
    }

    if (contentType.startsWith("video/")) {
      // Common video types
      const supportedVideoTypes = [
        "video/mp4",
        "video/webm",
        "video/ogg",
        "video/quicktime",
        "video/x-msvideo", // .avi
      ];
      return supportedVideoTypes.includes(contentType) ? "video" : null;
    }

    return null;
  }

  getFileKeyFromUrl(url: string): string {
    const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;
    if (url.startsWith(`${publicUrl}/`)) {
      return url.replace(`${publicUrl}/`, "");
    }
    throw new Error("Invalid file URL");
  }
}
