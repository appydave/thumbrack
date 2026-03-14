// ---------------------------------------------------------------------------
// GroupDivider — thin amber horizontal separator rendered before a sorted item
// ---------------------------------------------------------------------------

interface GroupDividerProps {
  onRemove: () => void;
}

export function GroupDivider({ onRemove }: GroupDividerProps) {
  return (
    <div className="group-divider" role="separator">
      <div className="group-divider__line" />
      <button
        className="group-divider__remove"
        onClick={onRemove}
        title="Remove divider"
        aria-label="Remove divider"
      >
        ×
      </button>
    </div>
  );
}

export default GroupDivider;
