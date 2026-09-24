import React from 'react';
import { GitFork, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SubItemButton({ count = 0, isExpanded = false, onClick, onAddSubItem }) {
  const hasItems = count > 0;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (hasItems) {
          if (onClick) onClick();
        } else {
          if (onAddSubItem) onAddSubItem();
        }
      }}
      className={cn(
        "group relative inline-flex items-center justify-center gap-1 px-2 py-1 rounded-md transition-all text-xs font-bold select-none cursor-pointer",
        hasItems
          ? (isExpanded 
              ? "bg-blue-600 text-white shadow-xs" 
              : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200")
          : "text-slate-400 hover:text-blue-600 hover:bg-slate-100 opacity-60 hover:opacity-100"
      )}
      title={hasItems ? `${count} sous-élément(s) — Cliquer pour ${isExpanded ? 'replier' : 'déplier'}` : "Ajouter un sous-élément"}
    >
      <GitFork className={cn("w-3.5 h-3.5 transition-transform", isExpanded ? "rotate-90 text-white" : "text-blue-600")} />
      {hasItems ? (
        <span className={cn(
          "text-[10.5px] font-black min-w-[14px] text-center",
          isExpanded ? "text-white" : "text-blue-700"
        )}>
          {count}
        </span>
      ) : (
        <Plus className="w-3 h-3 group-hover:scale-110" />
      )}
    </button>
  );
}
