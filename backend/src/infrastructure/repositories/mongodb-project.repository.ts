import mongoose, { Schema, Document, Types } from "mongoose";
import { Project } from "@/domain/entities/project.entity";
import { ProjectRepository } from "@/domain/repositories/project.repository";

interface ProjectDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    userId: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

const ProjectModel = mongoose.model<ProjectDocument>("Project", ProjectSchema);

export class MongoDBProjectRepository implements ProjectRepository {
  private toDomainEntity(doc: ProjectDocument): Project {
    return new Project(
      (doc._id as Types.ObjectId).toString(),
      doc.name,
      doc.userId,
      doc.createdAt,
      doc.updatedAt
    );
  }

  async findAll(): Promise<Project[]> {
    const docs = await ProjectModel.find().sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async findById(id: string): Promise<Project | null> {
    try {
      const doc = await ProjectModel.findById(id);
      return doc ? this.toDomainEntity(doc) : null;
    } catch (error) {
      return null;
    }
  }

  async findByUserId(userId: string): Promise<Project[]> {
    const docs = await ProjectModel.find({ userId }).sort({ createdAt: -1 });
    return docs.map((doc) => this.toDomainEntity(doc));
  }

  async create(project: Project): Promise<Project> {
    const doc = new ProjectModel({
      name: project.name,
      userId: project.userId,
    });

    const savedDoc = await doc.save();
    return this.toDomainEntity(savedDoc);
  }

  async update(
    id: string,
    updateData: Partial<Project>
  ): Promise<Project | null> {
    try {
      const doc = await ProjectModel.findByIdAndUpdate(
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
      const result = await ProjectModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      return false;
    }
  }
}
