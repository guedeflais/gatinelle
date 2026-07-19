import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileEditForm } from "@/components/ProfileEditForm";
import { PinChangeForm } from "@/components/PinChangeForm";
import { SignOutButton } from "@/components/SignOutButton";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: {
      memberNumber: true,
      fullName: true,
      email: true,
      merchantProfile: {
        select: { businessName: true, address: true, category: true, iban: true },
      },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Mon compte</h1>
        <p className="text-neutral-500">{user.fullName}</p>
        <p className="text-sm text-neutral-500">
          Numéro d&apos;adhérent :{" "}
          <span className="font-mono font-medium text-neutral-800">{user.memberNumber}</span>
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Mon profil</h2>
        <ProfileEditForm
          fullName={user.fullName}
          email={user.email}
          merchant={
            user.merchantProfile
              ? { ...user.merchantProfile, iban: user.merchantProfile.iban ?? "" }
              : undefined
          }
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">Sécurité</h2>
        <p className="mb-3 max-w-md text-sm text-neutral-600">
          Changez votre code PIN de connexion rapide en caisse (numéro d&apos;adhérent + PIN).
        </p>
        <PinChangeForm />
      </div>

      <div>
        <SignOutButton className="rounded border border-neutral-300 px-4 py-2 text-neutral-700 hover:bg-neutral-50" />
      </div>
    </div>
  );
}
