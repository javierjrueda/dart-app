import mongoose, { Schema, Document, Types } from "mongoose";
import {
  Dreamshot,
  Annotation,
  Ranking,
} from "@/domain/entities/dreamshot.entity";
import { DreamshotRepository } from "@/domain/repositories/dreamshot.repository";

interface DreamshotDocument extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  imageUrl: string;
  author: string;
  annotations: Annotation[];
  ranking: Ranking;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isPublic: boolean;
}

const AnnotationSchema = new Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  author: { type: String, required: true },
  timestamp: { type: Date, required: true },
  coordinates: {
    x: { type: Number },
    y: { type: Number },
  },
});

const RankingSchema = new Schema({
  score: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
});

const DreamshotSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    author: { type: String, required: true },
    annotations: [AnnotationSchema],
    ranking: { type: RankingSchema, default: () => ({}) },
    tags: [{ type: String }],
    isPublic: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

const DreamshotModel = mongoose.model<DreamshotDocument>(
  "Dreamshot",
  DreamshotSchema
);

export class MongoDBDreamshotRepository implements DreamshotRepository {
  private toDomainEntity(doc: DreamshotDocument): Dreamshot {
    return new Dreamshot(
      (doc._id as Types.ObjectId).toString(),
      doc.title,
      doc.description,
      doc.imageUrl,
      doc.author,
      doc.annotations,
      doc.ranking,
      doc.createdAt,
      doc.updatedAt,
      doc.tags,
      doc.isPublic
    );
  }

  async findAll(): Promise<Dreamshot[]> {
    const docs = await DreamshotModel.find().sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findById(id: string): Promise<Dreamshot | null> {
    try {
      const doc = await DreamshotModel.findById(id);
      return doc ? this.toDomainEntity(doc) : null;
    } catch (error) {
      return null;
    }
  }

  async findByAuthor(author: string): Promise<Dreamshot[]> {
    const docs = await DreamshotModel.find({ author }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findByTags(tags: string[]): Promise<Dreamshot[]> {
    const docs = await DreamshotModel.find({ tags: { $in: tags } }).sort({
      createdAt: -1,
    });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async create(dreamshot: Dreamshot): Promise<Dreamshot> {
    const doc = new DreamshotModel({
      title: dreamshot.title,
      description: dreamshot.description,
      imageUrl: dreamshot.imageUrl,
      author: dreamshot.author,
      annotations: dreamshot.annotations,
      ranking: dreamshot.ranking,
      tags: dreamshot.tags,
      isPublic: dreamshot.isPublic,
    });

    const savedDoc = await doc.save();
    return this.toDomainEntity(savedDoc);
  }

  async update(
    id: string,
    updateData: Partial<Dreamshot>
  ): Promise<Dreamshot | null> {
    try {
      const doc = await DreamshotModel.findByIdAndUpdate(
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
      const result = await DreamshotModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  async findPublic(): Promise<Dreamshot[]> {
    const docs = await DreamshotModel.find({ isPublic: true }).sort({
      createdAt: -1,
    });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findByRankingRange(
    minRating: number,
    maxRating: number
  ): Promise<Dreamshot[]> {
    const docs = await DreamshotModel.find({
      "ranking.averageRating": { $gte: minRating, $lte: maxRating },
    }).sort({ "ranking.averageRating": -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }
}
