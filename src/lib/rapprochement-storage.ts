/**
 * Cache navigateur du rapprochement — clé distincte du cache trésorerie / reporting (v4).
 * Wipe via réinitialiser / clearRapprochementCache.
 */

import type { CrmListeRougeLigne, WinbooksLigne } from "@/types/rapprochement";

export const RAPPROCHEMENT_STORAGE_KEY = "murprotec-rapprochement-cache-v1";

export type RapprochementCache = {
  version: 1;
  crm: CrmListeRougeLigne[] | null;
  crmFileName: string | null;
  winbooks: WinbooksLigne[] | null;
  winbooksFileName: string | null;
  hydrated: boolean;
};

type Stored = Omit<RapprochementCache, "hydrated">;
type Listener = () => void;

const listeners = new Set<Listener>();

function emptyStored(): Stored {
  return {
    version: 1,
    crm: null,
    crmFileName: null,
    winbooks: null,
    winbooksFileName: null,
  };
}

let memory: RapprochementCache = { ...emptyStored(), hydrated: false };

const SERVER_SNAPSHOT: RapprochementCache = { ...emptyStored(), hydrated: false };

function emit(): void {
  for (const listener of listeners) listener();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isCrmLigne(value: unknown): value is CrmListeRougeLigne {
  return (
    isRecord(value) &&
    typeof value.nomClient === "string" &&
    typeof value.numeroContrat === "string" &&
    isNullableString(value.numeroFacture) &&
    isNullableString(value.dateFacture) &&
    isNullableNumber(value.montantRouge)
  );
}

function isWinbooksLigne(value: unknown): value is WinbooksLigne {
  return (
    isRecord(value) &&
    typeof value.numeroTiers === "string" &&
    typeof value.solde === "number" &&
    Number.isFinite(value.solde) &&
    isNullableString(value.numeroDocument) &&
    isNullableString(value.dateDocument)
  );
}

function parseStored(raw: string): Stored {
  const data: unknown = JSON.parse(raw);
  if (!isRecord(data) || data.version !== 1) return emptyStored();
  const crm =
    data.crm === null
      ? null
      : Array.isArray(data.crm) && data.crm.every(isCrmLigne)
        ? data.crm
        : undefined;
  const winbooks =
    data.winbooks === null
      ? null
      : Array.isArray(data.winbooks) && data.winbooks.every(isWinbooksLigne)
        ? data.winbooks
        : undefined;
  if (crm === undefined || winbooks === undefined) return emptyStored();
  return {
    version: 1,
    crm,
    crmFileName: typeof data.crmFileName === "string" ? data.crmFileName : null,
    winbooks,
    winbooksFileName:
      typeof data.winbooksFileName === "string" ? data.winbooksFileName : null,
  };
}

function write(stored: Stored): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RAPPROCHEMENT_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // quota / navigation privée : l'écran garde la mémoire de session
  }
}

export function hydrateRapprochementCacheFromStorage(): void {
  if (typeof window === "undefined") return;
  if (memory.hydrated) return;
  try {
    const raw = window.localStorage.getItem(RAPPROCHEMENT_STORAGE_KEY);
    memory = { ...(raw ? parseStored(raw) : emptyStored()), hydrated: true };
  } catch {
    memory = { ...emptyStored(), hydrated: true };
  }
  emit();
}

export function getRapprochementCacheSnapshot(): RapprochementCache {
  return memory;
}

export function getRapprochementCacheServerSnapshot(): RapprochementCache {
  return SERVER_SNAPSHOT;
}

export function subscribeRapprochementCache(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setRapprochementCrm(
  lignes: CrmListeRougeLigne[] | null,
  fileName: string | null,
): void {
  const stored: Stored = {
    version: 1,
    crm: lignes,
    crmFileName: lignes === null ? null : fileName,
    winbooks: memory.winbooks,
    winbooksFileName: memory.winbooksFileName,
  };
  memory = { ...stored, hydrated: true };
  write(stored);
  emit();
}

export function setRapprochementWinbooks(
  lignes: WinbooksLigne[] | null,
  fileName: string | null,
): void {
  const stored: Stored = {
    version: 1,
    crm: memory.crm,
    crmFileName: memory.crmFileName,
    winbooks: lignes,
    winbooksFileName: lignes === null ? null : fileName,
  };
  memory = { ...stored, hydrated: true };
  write(stored);
  emit();
}

export function clearRapprochementCache(): void {
  memory = { ...emptyStored(), hydrated: true };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(RAPPROCHEMENT_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
  emit();
}
