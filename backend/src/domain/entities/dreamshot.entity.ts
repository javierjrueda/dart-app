export interface Annotation {
  id: string;
  text: string;
  author: string;
  timestamp: Date;
  coordinates?: {
    x: number;
    y: number;
  };
}

export interface Ranking {
  score: number;
  votes: number;
  averageRating: number;
}

export class Dreamshot {
  constructor(
    public readonly id: string,
    public title: string,
    public description: string,
    public imageUrl: string,
    public author: string,
    public annotations: Annotation[] = [],
    public ranking: Ranking = { score: 0, votes: 0, averageRating: 0 },
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public tags: string[] = [],
    public isPublic: boolean = true
  ) {}

  addAnnotation(annotation: Omit<Annotation, "id" | "timestamp">): void {
    const newAnnotation: Annotation = {
      ...annotation,
      id: this.generateId(),
      timestamp: new Date(),
    };
    this.annotations.push(newAnnotation);
    this.updatedAt = new Date();
  }

  updateRanking(rating: number): void {
    const newVotes = this.ranking.votes + 1;
    const totalScore = this.ranking.score + rating;
    const newAverageRating = totalScore / newVotes;

    this.ranking = {
      score: totalScore,
      votes: newVotes,
      averageRating: newAverageRating,
    };
    this.updatedAt = new Date();
  }

  addTag(tag: string): void {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
      this.updatedAt = new Date();
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
    this.updatedAt = new Date();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      imageUrl: this.imageUrl,
      author: this.author,
      annotations: this.annotations,
      ranking: this.ranking,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      tags: this.tags,
      isPublic: this.isPublic,
    };
  }
}
