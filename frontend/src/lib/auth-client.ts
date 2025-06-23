import { getSession, signIn, signOut } from "next-auth/react";

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  role: string;
}

export interface Session {
  user: User & { accessToken?: string };
  expires: string;
}

export const authClient = {
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      return result;
    },
    social: async (provider: string) => {
      await signIn(provider, { callbackUrl: "/dashboard" });
    },
  },

  signUp: {
    email: async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name: string;
    }) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Signup failed");
      }

      // Auto sign in after signup
      return authClient.signIn.email({ email, password });
    },
  },

  signOut: async () => {
    await signOut({ callbackUrl: "/" });
  },

  getSession: async (): Promise<Session | null> => {
    const session = await getSession();
    return session as Session | null;
  },

  // Helper to get auth headers for API calls
  getAuthHeaders: async () => {
    const session = await getSession();
    if (!session?.user) {
      return {};
    }

    const accessToken = (session.user as any).accessToken;
    if (!accessToken) {
      return {};
    }

    return {
      Authorization: `Bearer ${accessToken}`,
    };
  },
};
