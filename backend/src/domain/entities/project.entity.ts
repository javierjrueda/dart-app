export interface ProjectProfile {
  id: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Project {
  constructor(
    public readonly id: string,
    public name: string,
    public readonly userId: string,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static create(data: { name: string; userId: string }): Project {
    return new Project(Project.generateId(), data.name, data.userId);
  }

  updateName(name: string): void {
    this.name = name;
    this.updatedAt = new Date();
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  toProfile(): ProjectProfile {
    return {
      id: this.id,
      name: this.name,
      userId: this.userId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    return this.toProfile();
  }
}
