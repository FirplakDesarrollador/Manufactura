import { resolveNombreCompleto } from './constants';

export const AUTHORIZED_EMAILS = [
  'supervisorcalidad2@firplak.com',
  'supervisorcalidad3@firplak.com',
  'coordinacioncalidad@firplak.com',
  'estiven.londono@firplak.com'
];

export const isAuthorized = (email?: string | null): boolean => {
  if (!email) return false;
  return AUTHORIZED_EMAILS.includes(email.toLowerCase());
};

export const checkCanEditFicha = (
  ficha: { user_id?: string | null; responsable?: string | null },
  user: any,
  userData: { nombre?: string; correo?: string; rol?: string; permisos?: any } | null
): boolean => {
  if (!user) return false;

  // 1. Permiso de Administrador, rol admin/desarrollador, o 'editar_fichas_administrador'
  const permisosFicha = userData?.permisos?.ficha_rcc;
  if (
    userData?.rol === 'admin' ||
    userData?.rol === 'desarrollador' ||
    permisosFicha === true ||
    permisosFicha?.administrador === true ||
    permisosFicha?.editar_fichas_administrador === true
  ) {
    return true;
  }

  // 2. Creador de la ficha
  if (ficha.user_id && ficha.user_id === user.id) {
    return true;
  }

  // 3. Responsable asignado de la ficha
  if (ficha.responsable) {
    const respFull = resolveNombreCompleto(ficha.responsable).toLowerCase().trim();
    const respRaw = ficha.responsable.toLowerCase().trim();

    const userFullName = resolveNombreCompleto(userData?.nombre || user.user_metadata?.nombre || user.user_metadata?.full_name || '').toLowerCase().trim();
    const userRawName = (userData?.nombre || user.user_metadata?.nombre || user.user_metadata?.full_name || '').toLowerCase().trim();
    const email = (user.email || userData?.correo || '').toLowerCase().trim();

    // Coincidencia con nombre completo o nombre guardado
    if (userFullName && (userFullName === respFull || userFullName === respRaw)) return true;
    if (userRawName && (userRawName === respFull || userRawName === respRaw)) return true;
    if (email && (email === respRaw || email === respFull)) return true;

    // Coincidencia de tokens (ej. "Dimer Vergara" con "Dimer Gonzalo Vergara Delgado")
    const tokensUser = (userFullName || userRawName).split(' ').filter((t: string) => t.length > 2);
    const tokensResp = respFull.split(' ').filter((t: string) => t.length > 2);
    const matchingTokens = tokensUser.filter((t: string) => tokensResp.includes(t));
    if (matchingTokens.length >= 2) return true;
  }

  return false;
};
