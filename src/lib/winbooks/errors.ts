/**
 * Erreur de lecture Winbooks destinée à l'utilisateur (pas de stack métier).
 */

export class WinbooksParseError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "WinbooksParseError";
    this.status = status;
  }
}
