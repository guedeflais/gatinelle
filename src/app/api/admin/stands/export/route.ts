import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getBalanceCents } from "@/lib/wallet";
import { centsToEuros } from "@/lib/money";

const TYPE_LABELS: Record<string, string> = {
  PAYMENT: "Encaissement",
  CONVERSION: "Reconversion",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  COMPLETED: "Validée",
  REJECTED: "Rejetée",
};

function csvEscape(value: string): string {
  return /[;"\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Bilan des opérations d'un ou plusieurs stands d'événement, pour un
 * organisateur (qui peut posséder plusieurs stands) — export CSV avec un
 * résumé par stand (encaissé/reconverti/solde) suivi du détail de chaque
 * opération, pour laisser l'organisateur vérifier ligne par ligne.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Accès réservé aux administrateurs." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (ids.length === 0) {
    return NextResponse.json({ error: "Aucun stand sélectionné." }, { status: 400 });
  }

  const stands = await prisma.merchantProfile.findMany({
    where: { id: { in: ids }, isEventStand: true },
    include: { user: { include: { wallet: true } } },
  });
  if (stands.length === 0) {
    return NextResponse.json({ error: "Aucun stand trouvé." }, { status: 404 });
  }

  const standUserIds = stands.map((s) => s.userId);

  const transactions = await prisma.transaction.findMany({
    where: {
      OR: [{ toUserId: { in: standUserIds } }, { fromUserId: { in: standUserIds } }],
      type: { in: ["PAYMENT", "CONVERSION"] },
    },
    orderBy: { createdAt: "asc" },
  });

  const standByUserId = new Map(stands.map((s) => [s.userId, s]));

  const rows: string[] = [];
  rows.push("Bilan des stands");
  rows.push("");
  rows.push(["Stand", "Total encaissé (€)", "Total reconverti (€)", "Solde actuel (€)"].join(";"));

  for (const stand of stands) {
    const encaisse = transactions
      .filter((t) => t.toUserId === stand.userId && t.type === "PAYMENT" && t.status === "COMPLETED")
      .reduce((sum, t) => sum + t.amountCents, 0);
    const reconverti = transactions
      .filter((t) => t.fromUserId === stand.userId && t.type === "CONVERSION" && t.status === "COMPLETED")
      .reduce((sum, t) => sum + t.amountCents, 0);
    const solde = stand.user.wallet ? await getBalanceCents(prisma, stand.user.wallet.id) : 0;

    rows.push(
      [
        csvEscape(stand.businessName),
        centsToEuros(encaisse).toFixed(2),
        centsToEuros(reconverti).toFixed(2),
        centsToEuros(solde).toFixed(2),
      ].join(";")
    );
  }

  rows.push("");
  rows.push("Détail des opérations");
  rows.push(["Date", "Stand", "Type", "Montant (€)", "Statut"].join(";"));

  for (const t of transactions) {
    const standUserId = t.type === "PAYMENT" ? t.toUserId : t.fromUserId;
    const stand = standUserId ? standByUserId.get(standUserId) : undefined;
    rows.push(
      [
        t.createdAt.toISOString().slice(0, 10),
        csvEscape(stand?.businessName ?? ""),
        TYPE_LABELS[t.type] ?? t.type,
        centsToEuros(t.amountCents).toFixed(2),
        STATUS_LABELS[t.status] ?? t.status,
      ].join(";")
    );
  }

  const csv = "﻿" + rows.join("\r\n");
  const filename = `bilan-stands-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
