/**
 * Erreurs de parsing destinées à l'utilisateur (pas de stack).
 */

export class ParseError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ParseError";
    this.status = status;
  }
}
