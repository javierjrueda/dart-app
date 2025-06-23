import mongoose, { Schema, Document, Types } from "mongoose";
import { Media } from "@/domain/entities/media.entity";
import { MediaRepository } from "@/domain/repositories/media.repository";

interface MediaDocument extends Document {
  _id: Types.ObjectId;
  projectId: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  elo: number;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema(
  {
    projectId: { type: String, required: true },
    mediaUrl: { type: String, required: true },
    mediaType: { type: String, enum: ["image", "video"], required: true },
    elo: { type: Number, default: 1200, required: true },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
MediaSchema.index({ projectId: 1 });
MediaSchema.index({ mediaType: 1 });
MediaSchema.index({ elo: 1 });

const MediaModel = mongoose.model<MediaDocument>("Media", MediaSchema);

export class MongoDBMediaRepository implements MediaRepository {
  private toDomainEntity(doc: MediaDocument): Media {
    return new Media(
      (doc._id as Types.ObjectId).toString(),
      doc.projectId,
      doc.mediaUrl,
      doc.mediaType,
      doc.elo,
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
}
