import mongoose, { Schema, Document, Types } from "mongoose";
import { Media } from "@/domain/entities/media.entity";
import { MediaRepository } from "@/domain/repositories/media.repository";

interface MediaDocument extends Document {
  _id: Types.ObjectId;
  projectId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  elo: number;
  quality: number; // -1 (bad), 0 (unrated), 1 (good)
  prompt?: number; // Prompt number for grouping tests
  loraTraining?: string;
  promptDescription?: string;
  generationParams?: Record<string, any>;
  extractionMethod: "filename" | "metadata" | "manual" | "json";
  filename?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema(
  {
    projectId: { type: String, required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    elo: { type: Number, default: 1200, required: true },
    quality: { type: Number, default: 0, required: true, enum: [-1, 0, 1] },
    prompt: { type: Number, required: false },
    loraTraining: { type: String, required: false },
    promptDescription: { type: String, required: false },
    generationParams: { type: Schema.Types.Mixed, required: false },
    extractionMethod: {
      type: String,
      enum: ["filename", "metadata", "manual", "json"],
      default: "filename",
      required: true,
    },
    filename: { type: String, required: false },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
MediaSchema.index({ projectId: 1 });
MediaSchema.index({ mediaType: 1 });
MediaSchema.index({ elo: 1 });
MediaSchema.index({ projectId: 1, filename: 1 });
MediaSchema.index({ quality: 1 }); // Index for quality filtering
MediaSchema.index({ projectId: 1, prompt: 1 }); // Index for prompt filtering

const MediaModel = mongoose.model<MediaDocument>("Media", MediaSchema);

export class MongoDBMediaRepository implements MediaRepository {
  private toDomainEntity(doc: MediaDocument): Media {
    return new Media(
      (doc._id as Types.ObjectId).toString(),
      doc.projectId,
      doc.mediaUrl,
      doc.mediaType,
      doc.elo,
      doc.quality || 0, // Default to unrated if not present
      doc.prompt,
      doc.loraTraining,
      doc.promptDescription,
      doc.generationParams,
      doc.extractionMethod,
      doc.filename,
      doc.createdAt,
      doc.updatedAt
    );
  }

  async findAll(): Promise<Media[]> {
    const docs = await MediaModel.find().sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findById(id: string): Promise<Media | null> {
    try {
      const doc = await MediaModel.findById(id);
      return doc ? this.toDomainEntity(doc) : null;
    } catch (error) {
      return null;
    }
  }

  async findByProjectId(projectId: string): Promise<Media[]> {
    const docs = await MediaModel.find({ projectId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async create(media: Media): Promise<Media> {
    const doc = new MediaModel({
      projectId: media.projectId,
      mediaUrl: media.mediaUrl,
      mediaType: media.mediaType,
      elo: media.elo,
      quality: media.quality,
      prompt: media.prompt,
      loraTraining: media.loraTraining,
      promptDescription: media.promptDescription,
      generationParams: media.generationParams,
      extractionMethod: media.extractionMethod,
      filename: media.filename,
    });

    const savedDoc = await doc.save();
    return this.toDomainEntity(savedDoc);
  }

  async update(id: string, updateData: Partial<Media>): Promise<Media | null> {
    try {
      const doc = await MediaModel.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
      return doc ? this.toDomainEntity(doc) : null;
    } catch (error) {
      return null;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await MediaModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  async findByMediaType(mediaType: "image" | "video"): Promise<Media[]> {
    const docs = await MediaModel.find({ mediaType }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findByEloRange(minElo: number, maxElo: number): Promise<Media[]> {
    const docs = await MediaModel.find({
      elo: { $gte: minElo, $lte: maxElo },
    }).sort({ elo: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findByPromptDescription(promptDescription: string): Promise<Media[]> {
    const docs = await MediaModel.find({
      promptDescription: { $regex: promptDescription, $options: "i" },
    }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findByFilename(
    projectId: string,
    filename: string
  ): Promise<Media | null> {
    const doc = await MediaModel.findOne({
      projectId,
      filename: { $regex: new RegExp(`^${filename}$`, "i") }, // Case-insensitive exact match
    });
    return doc ? this.toDomainEntity(doc) : null;
  }

  async findExistingFilenames(projectId: string): Promise<string[]> {
    console.log(`🔍 Finding existing filenames for project: ${projectId}`);
    const docs = await MediaModel.find(
      {
        projectId,
        filename: {
          $exists: true,
          $ne: null,
          $not: { $eq: "" },
        },
      },
      { filename: 1, prompt: 1, _id: 0 }
    ).lean(); // Use lean() for better performance

    const filenames = docs
      .map((doc) => doc.filename)
      .filter(Boolean) as string[];

    console.log(
      `📋 Found ${filenames.length} existing filenames:`,
      filenames.slice(0, 10)
    );

    // Enhanced logging: show filenames with their prompt numbers for debugging
    console.log(`🔍 Detailed filename analysis (first 10):`);
    docs.slice(0, 10).forEach((doc, index) => {
      console.log(
        `   ${index + 1}. ${doc.filename} (prompt: ${
          doc.prompt || "undefined"
        })`
      );
    });

    // Check for potential filename patterns to identify why duplicates are detected
    if (filenames.length > 0) {
      const testFiles = filenames.filter((f) => f.includes("flux_test_"));
      if (testFiles.length > 0) {
        console.log(
          `🧪 Found ${testFiles.length} flux_test files in existing database`
        );
        console.log(`   Sample flux_test files:`, testFiles.slice(0, 5));
      }
    }

    return filenames;
  }

  async bulkUpdateQuality(
    mediaIds: string[],
    quality: number
  ): Promise<number> {
    try {
      console.log(
        `🔄 Performing bulk quality update for ${mediaIds.length} media items`
      );

      // Use MongoDB's bulk write operation for better performance
      const bulkOperations = mediaIds.map((id) => ({
        updateOne: {
          filter: { _id: id },
          update: {
            $set: {
              quality: quality,
              updatedAt: new Date(),
            },
          },
        },
      }));

      const result = await MediaModel.bulkWrite(bulkOperations, {
        ordered: false, // Continue processing even if some updates fail
      });

      console.log(
        `✅ Bulk update completed: ${result.modifiedCount}/${mediaIds.length} updated`
      );

      return result.modifiedCount;
    } catch (error) {
      console.error("❌ Bulk update failed:", error);
      throw error;
    }
  }
}
