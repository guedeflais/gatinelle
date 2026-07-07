import { ConnexionSwitcher } from "@/components/ConnexionSwitcher";

export default function ConnexionPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Connexion</h1>
      <ConnexionSwitcher />
    </div>
  );
}
