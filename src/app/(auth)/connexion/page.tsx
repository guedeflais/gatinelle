import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ConnexionSwitcher } from "@/components/ConnexionSwitcher";
import { Butterfly } from "@/components/Butterfly";

export default async function ConnexionPage() {
  const session = await auth();
  if (session?.user) redirect("/payer");

  return (
    <div className="flex flex-col items-center gap-6">
      <Butterfly flying={false} />
      <h1 className="text-2xl font-semibold">Connexion</h1>
      <ConnexionSwitcher />
    </div>
  );
}
