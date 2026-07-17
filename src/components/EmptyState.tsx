type EmptyStateProps = {
  title?: string;
};

export function EmptyState({
  title = "Aucun fichier chargé",
}: EmptyStateProps) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-primary/20 bg-surface px-6 py-16 text-center"
      role="status"
    >
      <p className="text-lg font-medium text-primary">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-primary/70">
        Importez un fichier Excel pour afficher les indicateurs.
      </p>
    </div>
  );
}
