import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/authz";
import { InscriptionExpressForm } from "@/components/InscriptionExpressForm";

export default async function InscriptionExpressPage() {
  const session = await auth();
  if (!session?.user || !isStaff(session)) redirect("/");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Inscription express</h1>
      <p className="max-w-md text-neutral-600">
        Pour un événement (marché, festival) : créez rapidement un compte avec juste un
        nom et un email, puis liez le bracelet ou la carte du participant.
      </p>
      <InscriptionExpressForm />
    </div>
  );
}
