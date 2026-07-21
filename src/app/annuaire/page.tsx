import { prisma } from "@/lib/prisma";
import { MerchantMapLoader } from "@/components/MerchantMapLoader";
import { MERCHANT_CATEGORY_LABELS } from "@/lib/merchantCategory";

export default async function AnnuairePage() {
  const merchants = await prisma.merchantProfile.findMany({
    where: { validated: true },
    select: { businessName: true, address: true, category: true, latitude: true, longitude: true },
    orderBy: { businessName: "asc" },
  });

  const withLabels = merchants.map((m) => ({ ...m, category: MERCHANT_CATEGORY_LABELS[m.category] }));
  const located = withLabels.filter(
    (m): m is typeof m & { latitude: number; longitude: number } =>
      m.latitude !== null && m.longitude !== null
  );
  const unlocated = withLabels.filter((m) => m.latitude === null || m.longitude === null);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Annuaire des points de vente agréés</h1>
      {merchants.length === 0 ? (
        <p className="text-neutral-500">Aucun commerçant agréé pour l&apos;instant.</p>
      ) : (
        <>
          {located.length > 0 && <MerchantMapLoader merchants={located} />}
          {unlocated.length > 0 && (
            <div>
              <p className="mb-2 text-sm text-neutral-500">
                Commerçants non localisés sur la carte :
              </p>
              <ul className="flex flex-col gap-4">
                {unlocated.map((m) => (
                  <li key={m.businessName} className="rounded border border-neutral-200 p-4">
                    <p className="font-medium">{m.businessName}</p>
                    <p className="text-sm text-neutral-600">{m.category}</p>
                    <p className="text-sm text-neutral-500">{m.address}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
