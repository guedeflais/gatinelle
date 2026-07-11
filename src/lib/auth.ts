import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { attemptPinLogin } from "./pin";
import { attemptPasswordLogin } from "./passwordAuth";
import type { AccountType, StaffRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      fullName: string;
      accountType: AccountType;
      staffRole: StaffRole | null;
      merchantId: string | null;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    accountType: AccountType;
    staffRole: StaffRole | null;
    merchantId: string | null;
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Session longue durée : sur son propre téléphone, l'adhérent ne devrait
  // quasiment jamais avoir à se reconnecter (cf. friction en caisse).
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 90 },
  pages: { signIn: "/connexion" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;
        return attemptPasswordLogin(email, password);
      },
    }),
    // Connexion rapide en caisse (numéro d'adhérent + PIN à 4 chiffres),
    // sur le modèle de l'Eusko/euskopay. Bloqué après 3 échecs.
    Credentials({
      id: "member-pin",
      name: "Numéro d'adhérent + PIN",
      credentials: {
        memberNumber: { label: "Numéro d'adhérent", type: "text" },
        pin: { label: "Code PIN", type: "password" },
      },
      async authorize(credentials) {
        const memberNumber = credentials?.memberNumber;
        const pin = credentials?.pin;
        if (typeof memberNumber !== "string" || typeof pin !== "string") return null;
        return attemptPinLogin(memberNumber, pin);
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.accountType = (user as unknown as { accountType: AccountType }).accountType;
        token.staffRole = (user as unknown as { staffRole: StaffRole | null }).staffRole;
        token.merchantId = (user as unknown as { merchantId: string | null }).merchantId;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id;
      session.user.accountType = token.accountType;
      session.user.staffRole = token.staffRole;
      session.user.merchantId = token.merchantId;
      return session;
    },
  },
});
