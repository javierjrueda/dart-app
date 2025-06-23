import { Dreamshot } from "@/domain/entities/dreamshot.entity";
import { DreamshotRepository } from "@/domain/repositories/dreamshot.repository";

export class DreamshotUseCases {
  constructor(private dreamshotRepository: DreamshotRepository) {}

  async getAllDreamshots(): Promise<Dreamshot[]> {
    return await this.dreamshotRepository.findAll();
  }

  async getDreamshotById(id: string): Promise<Dreamshot | null> {
    if (!id) {
      throw new Error("Dreamshot ID is required");
    }
    return await this.dreamshotRepository.findById(id);
  }

  async createDreamshot(data: {
    title: string;
    description: string;
    imageUrl: string;
    author: string;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<Dreamshot> {
    // Validation
    if (!data.title || !data.description || !data.imageUrl || !data.author) {
      throw new Error("Title, description, image URL, and author are required");
    }

    const id = this.generateId();
    const dreamshot = new Dreamshot(
      id,
      data.title,
      data.description,
      data.imageUrl,
      data.author,
      [], // empty annotations
      { score: 0, votes: 0, averageRating: 0 }, // initial ranking
      new Date(),
      new Date(),
      data.tags || [],
      data.isPublic ?? true
    );

    return await this.dreamshotRepository.create(dreamshot);
  }

  async updateDreamshot(
    id: string,
    updateData: Partial<Dreamshot>
  ): Promise<Dreamshot | null> {
    if (!id) {
      throw new Error("Dreamshot ID is required");
    }

    const existingDreamshot = await this.dreamshotRepository.findById(id);
    if (!existingDreamshot) {
      throw new Error("Dreamshot not found");
    }

    return await this.dreamshotRepository.update(id, updateData);
  }

  async deleteDreamshot(id: string): Promise<boolean> {
    if (!id) {
      throw new Error("Dreamshot ID is required");
    }

    const existingDreamshot = await this.dreamshotRepository.findById(id);
    if (!existingDreamshot) {
      throw new Error("Dreamshot not found");
    }

    return await this.dreamshotRepository.delete(id);
  }

  async addAnnotation(
    id: string,
    annotationData: {
      text: string;
      author: string;
      coordinates?: { x: number; y: number };
    }
  ): Promise<Dreamshot | null> {
    if (!id) {
      throw new Error("Dreamshot ID is required");
    }

    if (!annotationData.text || !annotationData.author) {
      throw new Error("Annotation text and author are required");
    }

    const dreamshot = await this.dreamshotRepository.findById(id);
    if (!dreamshot) {
      throw new Error("Dreamshot not found");
    }

    dreamshot.addAnnotation(annotationData);
    return await this.dreamshotRepository.update(id, dreamshot);
  }

  async updateRanking(id: string, rating: number): Promise<Dreamshot | null> {
    if (!id) {
      throw new Error("Dreamshot ID is required");
    }

    if (rating < 1 || rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const dreamshot = await this.dreamshotRepository.findById(id);
    if (!dreamshot) {
      throw new Error("Dreamshot not found");
    }

    dreamshot.updateRanking(rating);
    return await this.dreamshotRepository.update(id, dreamshot);
  }

  async getDreamshotsByAuthor(author: string): Promise<Dreamshot[]> {
    if (!author) {
      throw new Error("Author is required");
    }
    return await this.dreamshotRepository.findByAuthor(author);
  }

  async getDreamshotsByTags(tags: string[]): Promise<Dreamshot[]> {
    if (!tags || tags.length === 0) {
      throw new Error("At least one tag is required");
    }
    return await this.dreamshotRepository.findByTags(tags);
  }

  async getPublicDreamshots(): Promise<Dreamshot[]> {
    return await this.dreamshotRepository.findPublic();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
