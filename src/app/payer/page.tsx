import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PayerForm } from "@/components/PayerForm";

export default async function PayerPage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Payer un commerçant</h1>
      <PayerForm />
    </div>
  );
}
