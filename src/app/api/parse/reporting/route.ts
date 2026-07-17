import { NextResponse } from "next/server";
import { ParseError } from "@/lib/excel/errors";
import { parseReporting } from "@/lib/excel/parse-reporting";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Aucun fichier reçu. Utilisez le champ « file » en multipart/form-data." },
        { status: 400 },
      );
    }

    const name = file.name || "fichier.xlsx";
    if (!/\.xlsx$/i.test(name)) {
      return NextResponse.json(
        { error: "Format invalide : le dashboard Reporting attend un fichier .xlsx." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = parseReporting(buffer, name);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof ParseError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Une erreur est survenue lors du traitement du fichier reporting." },
      { status: 500 },
    );
  }
}
