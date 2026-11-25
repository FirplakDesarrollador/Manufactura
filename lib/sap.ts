// lib/sap.ts

export interface SAPLoginResponse {
  SessionId: string;
  Version: string;
  SessionTimeout: number;
}

export const SAP_BASE_URL = 'https://200.7.96.194:50000/b1s/v1';
export const SAP_LOGIN_URL = 'https://200.7.96.194:50000/b1s/v1/Login';
export const SAP_COMPANY_DB = 'Firplak_SA';
export const SAP_USERNAME = 'manager';
export const SAP_PASSWORD = '2023Fir#.*';

export async function loginToSAP() {
  // Asegurarnos de que no rechace certificados auto-firmados
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const rawBase = process.env.SAP_BASE_URL ? `${process.env.SAP_BASE_URL.replace(/\/$/, '')}/Login` : null;
  const url = process.env.SAP_API_URL || rawBase || SAP_LOGIN_URL;
  const username = process.env.SAP_USERNAME || SAP_USERNAME;
  const password = process.env.SAP_PASSWORD || SAP_PASSWORD;
  const db = process.env.SAP_COMPANY_DB || SAP_COMPANY_DB;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      CompanyDB: db,
      Password: password,
      UserName: username,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en login de SAP: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data: SAPLoginResponse = await response.json();

  // Extraemos las cookies del response si están disponibles
  const setCookie = response.headers.get("set-cookie") || "";
  let routeId = "";

  const routeIdMatch = setCookie.match(/ROUTEID=([^;]+)/);
  if (routeIdMatch) {
    routeId = routeIdMatch[1];
  }

  return {
    sessionId: data.SessionId,
    routeId,
    data,
    // Header listo para enviar en las siguientes llamadas a la API de SAP
    cookieHeader: `B1SESSION=${data.SessionId}; ROUTEID=${routeId}`,
  };
}

// ===== Sesión de SAP reutilizable =====
// Iniciar sesión en el Service Layer cuesta un viaje completo a SAP en cada consulta. La sesión se guarda en
// memoria del servidor y se reutiliza hasta 5 minutos antes de que SAP la venza (SessionTimeout, normalmente 30).
// Si SAP responde 401 (sesión vencida o cerrada), se inicia sesión de nuevo y se repite la consulta una vez.
let sesionCache: { cookieHeader: string; vence: number } | null = null

export async function sesionSAP(forzar = false) {
  if (!forzar && sesionCache && Date.now() < sesionCache.vence) return sesionCache
  const login = await loginToSAP()
  const minutos = Math.max(1, Math.min((login.data.SessionTimeout || 30) - 5, 25))
  sesionCache = { cookieHeader: login.cookieHeader, vence: Date.now() + minutos * 60_000 }
  return sesionCache
}

export async function fetchSAP(url: string, init: RequestInit = {}) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"
  const pedir = (cookie: string) => fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...(init.headers || {}), Cookie: cookie } })
  let respuesta = await pedir((await sesionSAP()).cookieHeader)
  if (respuesta.status === 401) respuesta = await pedir((await sesionSAP(true)).cookieHeader)
  return respuesta
}
