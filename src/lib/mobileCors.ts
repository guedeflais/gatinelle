import { NextResponse } from "next/server";

// Les routes /api/mobile/* sont protégées par jeton (Authorization: Bearer),
// jamais par cookie : autoriser toute origine ne réduit pas la sécurité (le
// jeton reste indispensable), et permet à l'appli de fonctionner aussi bien
// en natif qu'en mode web d'Expo (soumis, lui, au CORS du navigateur).
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function corsJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, { status: init?.status, headers: CORS_HEADERS });
}

export function corsOptionsResponse() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
