import mongoose, { Schema, Document, Types } from "mongoose";
import { Media } from "@/domain/entities/media.entity";
import { MediaRepository } from "@/domain/repositories/media.repository";

interface MediaDocument extends Document {
  _id: Types.ObjectId;
  projectId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  elo: number;
  loraTraining?: string;
  promptDescription?: string;
  generationParams?: Record<string, any>;
  extractionMethod: "filename" | "metadata" | "manual";
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
    loraTraining: { type: String, required: false },
    promptDescription: { type: String, required: false },
    generationParams: { type: Schema.Types.Mixed, required: false },
    extractionMethod: {
      type: String,
      enum: ["filename", "metadata", "manual"],
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

const MediaModel = mongoose.model<MediaDocument>("Media", MediaSchema);

export class MongoDBMediaRepository implements MediaRepository {
  private toDomainEntity(doc: MediaDocument): Media {
    return new Media(
      (doc._id as Types.ObjectId).toString(),
      doc.projectId,
      doc.mediaUrl,
      doc.mediaType,
      doc.elo,
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
      { filename: 1, _id: 0 }
    ).lean(); // Use lean() for better performance

    const filenames = docs
      .map((doc) => doc.filename)
      .filter(Boolean) as string[];
    console.log(
      `📋 Found ${filenames.length} existing filenames:`,
      filenames.slice(0, 5)
    );
    return filenames;
  }
}
