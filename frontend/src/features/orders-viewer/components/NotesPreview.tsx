import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const PREVIEW_LENGTH = 80;
const COMPACT_PREVIEW_LENGTH = 42;

interface NotesPreviewProps {
  notes: string;
  compact?: boolean;
}

export function NotesPreview({ notes, compact = false }: NotesPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const trimmed = notes.trim();
  const limit = compact ? COMPACT_PREVIEW_LENGTH : PREVIEW_LENGTH;

  if (!trimmed) {
    return <span className="text-[10px] text-zinc-400">-</span>;
  }

  const isLong = trimmed.length > limit;
  const display =
    expanded || !isLong ? trimmed : `${trimmed.slice(0, limit)}...`;

  return (
    <div className="space-y-0.5">
      <p
        className={cn(
          "break-words text-zinc-600",
          compact
            ? "line-clamp-2 text-[10px] leading-snug"
            : "whitespace-pre-wrap text-xs leading-relaxed",
        )}
      >
        {display}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[10px] font-medium text-zinc-900 underline-offset-4 hover:underline"
        >
          {expanded ? "Collapse Notes" : "Expand Notes"}
        </button>
      )}
    </div>
  );
}

export function TableLink({
  children,
  onClick,
  className,
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-1 inline-flex text-[11px] font-semibold text-blue-650 underline-offset-4 transition-colors hover:text-blue-750 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer",
        className,
      )}
    >
      {children}
    </button>
  );
}
