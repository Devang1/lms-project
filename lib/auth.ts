import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6)
});

export const authConfig = {
  // Removed PrismaAdapter to prevent JWT/session conflicts
  session: {
    strategy: "jwt"
  },

  pages: {
    signIn: "/login"
  },

  trustHost: true,

  secret: process.env.AUTH_SECRET,

  providers: [
    Credentials({
      credentials: {
        username: {
          label: "Username",
          type: "text"
        },
        password: {
          label: "Password",
          type: "password"
        }
      },

      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);

        if (!parsed.success) return null;

        const username = parsed.data.username.toLowerCase();

        const user = await prisma.user.findUnique({
          where: {
            username
          }
        });

        if (!user || !user.passwordHash) {
          console.log("User not found:", username);
          return null;
        }

        const validPassword = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash
        );

        if (!validPassword) {
          console.log("Invalid password:", username);
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role
        };
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "STUDENT";
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? "";
        session.user.role =
          (token.role as "ADMIN" | "TEACHER" | "STUDENT") ?? "STUDENT";
      }

      return session;
    }
  }
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);