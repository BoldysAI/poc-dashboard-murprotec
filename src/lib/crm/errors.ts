/**
 * Erreur de lecture CRM destinée à l'utilisateur (pas de stack métier).
 */

export class CrmParseError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "CrmParseError";
    this.status = status;
  }
}
