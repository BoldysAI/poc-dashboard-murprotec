"use client";

type AgenceTab = {
  id: string;
  label: string;
};

type AgenceTabsProps = {
  agencies: AgenceTab[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function AgenceTabs({
  agencies,
  selectedId,
  onSelect,
}: AgenceTabsProps) {
  return (
    <nav
      aria-label="Agences"
      role="tablist"
      className="flex flex-wrap gap-2 border-b border-primary/15 pb-1"
    >
      {agencies.map((agence) => {
        const isActive = agence.id === selectedId;
        return (
          <button
            key={agence.id}
            type="button"
            onClick={() => onSelect(agence.id)}
            className={[
              "cursor-pointer rounded-t px-3 py-2.5 text-sm font-medium transition-colors duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              isActive
                ? "border-b-2 border-accent text-primary"
                : "text-primary/60 hover:bg-surface hover:text-primary",
            ].join(" ")}
            aria-selected={isActive}
            role="tab"
          >
            {agence.label}
          </button>
        );
      })}
    </nav>
  );
}
