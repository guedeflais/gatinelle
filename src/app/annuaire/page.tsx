import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AnnuairePage() {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const merchants = await prisma.merchantProfile.findMany({
    where: { validated: true },
    select: { businessName: true, address: true, category: true },
    orderBy: { businessName: "asc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Annuaire des points de vente agréés</h1>
      {merchants.length === 0 ? (
        <p className="text-neutral-500">Aucun commerçant agréé pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {merchants.map((m) => (
            <li key={m.businessName} className="rounded border border-neutral-200 p-4">
              <p className="font-medium">{m.businessName}</p>
              <p className="text-sm text-neutral-600">{m.category}</p>
              <p className="text-sm text-neutral-500">{m.address}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
