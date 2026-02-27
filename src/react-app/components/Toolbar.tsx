import {
  Scissors,
  Copy,
  Trash2,
  RotateCcw,
  RotateCw,
  Volume2,
  Settings,
  Palette,
  Wand2,
} from 'lucide-react';

interface ToolbarProps {
  onSplit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export default function Toolbar({
  onSplit,
  onDuplicate,
  onDelete,
  onUndo,
  onRedo,
}: ToolbarProps) {
  const tools = [
    { icon: Scissors, label: 'Split', shortcut: 'S', onClick: onSplit },
    { icon: Copy, label: 'Duplicate', shortcut: 'D', onClick: onDuplicate },
    { icon: Trash2, label: 'Delete', shortcut: 'Del', onClick: onDelete },
    { icon: RotateCcw, label: 'Undo', shortcut: '⌘Z', onClick: onUndo },
    { icon: RotateCw, label: 'Redo', shortcut: '⌘⇧Z', onClick: onRedo },
    { icon: Volume2, label: 'Audio', shortcut: 'A', onClick: undefined },
    { icon: Palette, label: 'Color', shortcut: 'C', onClick: undefined },
    { icon: Wand2, label: 'Effects', shortcut: 'E', onClick: undefined },
    { icon: Settings, label: 'Settings', shortcut: ',', onClick: undefined },
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-3 bg-zinc-900/30 border-b border-zinc-800/50">
      {tools.map((tool, idx) => (
        <ToolButton key={idx} {...tool} />
      ))}
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut: string;
  onClick?: () => void;
}

function ToolButton({ icon: Icon, label, shortcut, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-zinc-800/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={`${label} (${shortcut})`}
      disabled={!onClick}
    >
      <Icon className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
      <span className="text-[10px] text-zinc-500 group-hover:text-zinc-300 transition-colors">
        {label}
      </span>
    </button>
  );
}
