import { InscriptionForm } from "@/components/InscriptionForm";

export default function InscriptionPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Créer un compte</h1>
      <InscriptionForm />
    </div>
  );
}
