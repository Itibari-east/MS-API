export const TOTP_SECRET_BY_PERSON_ID_SQL = 'select totp_secret from itibari.core.people where id = $1';

export function totpSecretByPersonIdQuery(id: number) {
  return {
    text: TOTP_SECRET_BY_PERSON_ID_SQL,
    values: [id],
  };
}
