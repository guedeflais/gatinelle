import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PayerForm } from "@/components/PayerForm";

export default async function PayerPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Payer un commerçant</h1>
      <p className="max-w-md text-neutral-600">
        Demandez au commerçant son code (affiché sur son QR de comptoir) et
        saisissez le montant à payer.
      </p>
      <PayerForm />
    </div>
  );
}
