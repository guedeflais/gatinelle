import { NextResponse } from "next/server";
import { expireLots } from "@/lib/wallet";

/**
 * Job de péremption quotidien. À déclencher une fois par jour par un
 * ordonnanceur externe (Vercel Cron, tâche planifiée Windows, cron Linux...)
 * avec l'en-tête `Authorization: Bearer <CRON_SECRET>`.
 * Vercel Cron appelle en GET ; les autres ordonnanceurs peuvent utiliser POST.
 */
async function run(request: Request) {
  const expected = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!expected || authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const result = await expireLots();
  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;
