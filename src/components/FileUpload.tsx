"use client";

import { useCallback, useId, useRef, useState, type DragEvent } from "react";
import { ParseError } from "@/lib/excel/errors";

type FileUploadProps = {
  /** Parse 100 % navigateur (ArrayBuffer → SheetJS) — pas d’upload serveur. */
  parseFile: (file: File) => Promise<unknown>;
  onSuccess: (data: unknown) => void;
  onError?: (message: string) => void;
  label?: string;
  /** Hint only — does not filter the file picker (validation dans parseFile). */
  hint?: string;
};

export function FileUpload({
  parseFile,
  onSuccess,
  onError,
  label = "Téléverser fichier",
  hint = "Fichier Excel",
}: FileUploadProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportError = useCallback(
    (message: string) => {
      setError(message);
      onError?.(message);
    },
    [onError],
  );

  const upload = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);

      try {
        const data = await parseFile(file);
        onSuccess(data);
      } catch (err) {
        if (err instanceof ParseError) {
          reportError(err.message);
        } else {
          reportError(
            "Le fichier n'a pas pu être traité. Vérifiez le format et réessayez.",
          );
        }
      } finally {
        setLoading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onSuccess, parseFile, reportError],
  );

  const onFileChosen = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      void upload(file);
    },
    [upload],
  );

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    onFileChosen(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragging(false);
        }}
        onDrop={onDrop}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-10 transition-colors duration-200",
          dragging
            ? "border-accent bg-accent/10"
            : "border-primary/25 bg-surface",
        ].join(" ")}
      >
        <p className="text-sm text-primary/70">
          Glissez-déposez votre fichier ici, ou
        </p>
        <label
          htmlFor={inputId}
          className={[
            "inline-flex min-h-11 cursor-pointer items-center justify-center rounded px-5 py-2.5 text-sm font-medium transition-colors duration-200",
            "bg-primary text-white hover:bg-primary/90",
            "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
            loading ? "pointer-events-none opacity-60" : "",
          ].join(" ")}
        >
          {loading ? "Traitement…" : label}
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            className="sr-only"
            disabled={loading}
            onChange={(e) => onFileChosen(e.target.files?.[0])}
          />
        </label>
        <p className="text-xs text-primary/50">{hint}</p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
