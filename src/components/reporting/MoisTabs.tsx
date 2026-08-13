"use client";

import { CONSOLIDE_MONTH_ID, type ReportingMonthId } from "@/types/dashboard";

type MoisTab = {
  id: ReportingMonthId;
  label: string;
};

type MoisTabsProps = {
  months: MoisTab[];
  selectedId: ReportingMonthId;
  onSelect: (id: ReportingMonthId) => void;
};

export function MoisTabs({ months, selectedId, onSelect }: MoisTabsProps) {
  const tabs: MoisTab[] = [
    ...months,
    { id: CONSOLIDE_MONTH_ID, label: "Consolidé" },
  ];

  return (
    <nav
      aria-label="Période"
      role="tablist"
      className="flex flex-wrap gap-2 border-b border-primary/15 pb-1"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === selectedId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
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
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
