// lib/sap.ts

export interface SAPLoginResponse {
  SessionId: string;
  Version: string;
  SessionTimeout: number;
}

export async function loginToSAP() {
  // Asegurarnos de que no rechace certificados auto-firmados
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  const url = process.env.SAP_API_URL;
  const username = process.env.SAP_USERNAME;
  const password = process.env.SAP_PASSWORD;
  const db = process.env.SAP_COMPANY_DB;

  if (!url || !username || !password || !db) {
    throw new Error("Faltan variables de entorno para conectar con SAP");
  }

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
