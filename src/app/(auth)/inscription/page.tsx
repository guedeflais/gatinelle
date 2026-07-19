import { InscriptionForm } from "@/components/InscriptionForm";

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  const initialAccountType = type === "commercant" ? "COMMERCANT" : "PARTICULIER";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Créer un compte</h1>
      <InscriptionForm initialAccountType={initialAccountType} />
    </div>
  );
}
