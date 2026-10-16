import { parseListeRougeFile } from "@/lib/crm";
import { parseWinbooksFile, parseWinbooksPdfFile } from "@/lib/winbooks";
import type { CrmListeRougeLigne, WinbooksLigne } from "@/types/rapprochement";

export type FichierRapprochement<T> = {
  lignes: T;
  fileName: string;
};

/** Liste rouge CRM (Word/RTF). Le format est contrôlé par le parser, pas par l'extension. */
export async function parseListeRougeUpload(
  file: File,
): Promise<FichierRapprochement<CrmListeRougeLigne[]>> {
  return { lignes: await parseListeRougeFile(file), fileName: file.name };
}

/** Export Winbooks Excel, ou PDF si le fichier commence par %PDF. */
export async function parseWinbooksUpload(
  file: File,
): Promise<FichierRapprochement<WinbooksLigne[]>> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const isPdf =
    head.length >= 4 &&
    head[0] === 0x25 &&
    head[1] === 0x50 &&
    head[2] === 0x44 &&
    head[3] === 0x46;
  const lignes = isPdf ? await parseWinbooksPdfFile(file) : await parseWinbooksFile(file);
  return { lignes, fileName: file.name };
}
