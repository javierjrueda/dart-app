import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { connectDatabase } from "@/infrastructure/database/connection";
import { MongoDBUserRepository } from "@/infrastructure/repositories/mongodb-user.repository";
import jwt from "jsonwebtoken";

// Define custom user type
interface AuthUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: string;
}

// This configuration is for reference only - actual NextAuth runs in the frontend
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials): Promise<AuthUser | null> {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Connect to MongoDB using existing connection
        await connectDatabase();
        
        const userRepo = new MongoDBUserRepository();
        const user = await userRepo.findUserByEmail(credentials.email);
        
        if (!user) {
          return null;
        }

        // Check password from account
        const accounts = await userRepo.findAccountsByUserId(user.id);
        const credentialAccount = accounts.find(acc => acc.providerId === "credential");
        
        if (!credentialAccount || !credentialAccount.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          credentialAccount.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;
        token.id = authUser.id;
        token.role = authUser.role || "user";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    // signUp is not a default NextAuth page
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
};

// Helper functions for backend auth
export async function verifyAuth(token: string) {
  try {
    const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as any;
    return decoded;
  } catch (error) {
    return null;
  }
}

export async function createAuthToken(user: AuthUser) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET!;
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    { expiresIn: "30d" }
  );
}
