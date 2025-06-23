export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  constructor(
    public readonly id: string,
    public name: string,
    public email: string,
    public emailVerified: boolean = false,
    public image: string | null = null,
    public role: string = "user",
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}

  static create(data: {
    name: string;
    email: string;
    image?: string | null;
    role?: string;
  }): User {
    return new User(
      User.generateId(),
      data.name,
      data.email,
      false, // emailVerified starts as false
      data.image || null,
      data.role || "user"
    );
  }

  verifyEmail(): void {
    this.emailVerified = true;
    this.updatedAt = new Date();
  }

  updateProfile(data: {
    name?: string;
    image?: string | null;
    role?: string;
  }): void {
    if (data.name !== undefined) this.name = data.name;
    if (data.image !== undefined) this.image = data.image;
    if (data.role !== undefined) this.role = data.role;
    this.updatedAt = new Date();
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  toProfile(): UserProfile {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      emailVerified: this.emailVerified,
      image: this.image,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    return this.toProfile();
  }
}
