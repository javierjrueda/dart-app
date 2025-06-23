import mongoose, { Schema, Document, Types } from "mongoose";
import { Battle } from "@/domain/entities/battle.entity";
import { BattleRepository } from "@/domain/repositories/battle.repository";

interface BattleDocument extends Document {
  _id: Types.ObjectId;
  projectId: string;
  mediaAId: string;
  mediaBId: string;
  result: "A" | "B" | "skip";
  userId: string;
  mediaAEloBefore: number;
  mediaBEloBefore: number;
  mediaAEloAfter: number;
  mediaBEloAfter: number;
  createdAt: Date;
}

const BattleSchema = new Schema(
  {
    projectId: { type: String, required: true, index: true },
    mediaAId: { type: String, required: true, index: true },
    mediaBId: { type: String, required: true, index: true },
    result: {
      type: String,
      required: true,
      enum: ["A", "B", "skip"],
    },
    userId: { type: String, required: true, index: true },
    mediaAEloBefore: { type: Number, required: true },
    mediaBEloBefore: { type: Number, required: true },
    mediaAEloAfter: { type: Number, required: true },
    mediaBEloAfter: { type: Number, required: true },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
BattleSchema.index({ projectId: 1, createdAt: -1 });
BattleSchema.index({ mediaAId: 1, mediaBId: 1 });

const BattleModel = mongoose.model<BattleDocument>("Battle", BattleSchema);

export class MongoDBBattleRepository implements BattleRepository {
  private toDomainEntity(doc: BattleDocument): Battle {
    return new Battle(
      (doc._id as Types.ObjectId).toString(),
      doc.projectId,
      doc.mediaAId,
      doc.mediaBId,
      doc.result,
      doc.userId,
      doc.mediaAEloBefore,
      doc.mediaBEloBefore,
      doc.mediaAEloAfter,
      doc.mediaBEloAfter,
      doc.createdAt
    );
  }

  async findAll(): Promise<Battle[]> {
    const docs = await BattleModel.find().sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findById(id: string): Promise<Battle | null> {
    try {
      const doc = await BattleModel.findById(id);
      return doc ? this.toDomainEntity(doc) : null;
    } catch (error) {
      return null;
    }
  }

  async findByProjectId(projectId: string): Promise<Battle[]> {
    const docs = await BattleModel.find({ projectId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findByUserId(userId: string): Promise<Battle[]> {
    const docs = await BattleModel.find({ userId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findByMediaId(mediaId: string): Promise<Battle[]> {
    const docs = await BattleModel.find({
      $or: [{ mediaAId: mediaId }, { mediaBId: mediaId }],
    }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async create(battle: Battle): Promise<Battle> {
    const doc = new BattleModel({
      projectId: battle.projectId,
      mediaAId: battle.mediaAId,
      mediaBId: battle.mediaBId,
      result: battle.result,
      userId: battle.userId,
      mediaAEloBefore: battle.mediaAEloBefore,
      mediaBEloBefore: battle.mediaBEloBefore,
      mediaAEloAfter: battle.mediaAEloAfter,
      mediaBEloAfter: battle.mediaBEloAfter,
    });

    const savedDoc = await doc.save();
    return this.toDomainEntity(savedDoc);
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await BattleModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }

  async getBattleStats(projectId: string): Promise<{
    totalBattles: number;
    mediaParticipation: Record<string, number>;
    userParticipation: Record<string, number>;
  }> {
    const battles = await BattleModel.find({ projectId });

    const totalBattles = battles.length;
    const mediaParticipation: Record<string, number> = {};
    const userParticipation: Record<string, number> = {};

    battles.forEach((battle) => {
      // Count media participation
      mediaParticipation[battle.mediaAId] =
        (mediaParticipation[battle.mediaAId] || 0) + 1;
      mediaParticipation[battle.mediaBId] =
        (mediaParticipation[battle.mediaBId] || 0) + 1;

      // Count user participation
      userParticipation[battle.userId] =
        (userParticipation[battle.userId] || 0) + 1;
    });

    return {
      totalBattles,
      mediaParticipation,
      userParticipation,
    };
  }
}
