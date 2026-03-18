import type React from 'react';

// ---------------------------------------------------------------------------
// GroupDivider — thin amber horizontal separator rendered before a sorted item
// ---------------------------------------------------------------------------

interface GroupDividerProps {
  onRemove: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function GroupDivider({ onRemove, dragHandleProps }: GroupDividerProps) {
  return (
    <div className="group-divider" role="separator">
      <div className="group-divider__line" title="Drag to move divider" {...dragHandleProps} />
      <button
        className="group-divider__remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove divider"
        aria-label="Remove divider"
      >
        ×
      </button>
    </div>
  );
}

export default GroupDivider;
