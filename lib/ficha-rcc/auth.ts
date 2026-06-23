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
