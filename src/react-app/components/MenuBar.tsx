import React, { useState, useRef, useEffect } from 'react';
import {
  File,
  Edit,
  View,
  Sparkles,
  HelpCircle,
  Upload,
  Download,
  Settings,
  LogOut,
  Undo,
  Redo,
  Trash2,
  Scissors,
  Maximize,
  ZoomIn,
  ZoomOut,
  FileText,
  Film,
  Play,
  Mic,
  ScissorsLineDashed,
  Info,
  BookOpen
} from 'lucide-react';
import xitLogo from '@/assets/xit_logo.png';

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TiktokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.41-.16.71-.05 1.49.27 2.15.54 1.1 1.74 1.83 2.93 1.8 1.25.03 2.5-.78 2.87-1.96.19-.57.23-1.17.22-1.77-.02-3.5-.02-7.01-.01-10.51z"/>
  </svg>
);

interface MenuBarProps {
  onImportAsset: (files: FileList) => void;
  onExportProject: () => void;
  onYoutubeExport: () => void;
  onTiktokExport: () => void;
  onOpenSettings: () => void;
  onDeleteSelected: () => void;
  onSplitClip: () => void;
  onAutoEdit: () => void; // Could open AI panel or trigger default
  onGenerateChapters: () => void;
  onGenerateBroll: () => void;
  onTranscribe: () => void;
  onRemoveDeadAir: () => void;
  onOpenAbout: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isProcessing?: boolean;
  hasProject?: boolean;
  hasClips?: boolean;
}

type MenuItemAction = {
  type?: undefined;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  shortcut?: string;
  disabled?: boolean;
};

type MenuItemSeparator = {
  type: 'separator';
};

type MenuItem = MenuItemAction | MenuItemSeparator;

type MenuCategory = {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: MenuItem[];
};

export default function MenuBar({
  onImportAsset,
  onExportProject,
  onYoutubeExport,
  onTiktokExport,
  onOpenSettings,
  onDeleteSelected,
  onSplitClip,
  onAutoEdit,
  onGenerateChapters,
  onGenerateBroll,
  onTranscribe,
  onRemoveDeadAir,
  onOpenAbout,
  canUndo = false,
  canRedo = false,
  isProcessing = false,
  hasProject = false,
  hasClips = false,
}: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleImportClick = () => {
    fileInputRef.current?.click();
    setActiveMenu(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onImportAsset(e.target.files);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setActiveMenu(null);
  };

  const menuItems: MenuCategory[] = [
    {
      id: 'file',
      label: 'File',
      icon: <File className="w-4 h-4" />,
      items: [
        { label: 'Import Asset...', icon: <Upload className="w-4 h-4" />, action: handleImportClick, shortcut: 'Ctrl+I' },
        { label: 'Render Project...', icon: <Download className="w-4 h-4" />, action: () => { onExportProject(); setActiveMenu(null); }, disabled: !hasClips || isProcessing, shortcut: 'Ctrl+R' },
        { type: 'separator' },
        { label: 'Settings', icon: <Settings className="w-4 h-4" />, action: () => { onOpenSettings(); setActiveMenu(null); }, shortcut: 'Ctrl+,' },
        { type: 'separator' },
        { label: 'Exit', icon: <LogOut className="w-4 h-4" />, action: () => window.close(), shortcut: 'Alt+F4' },
      ]
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      items: [
        { label: 'Undo', icon: <Undo className="w-4 h-4" />, action: () => setActiveMenu(null), disabled: !canUndo, shortcut: 'Ctrl+Z' },
        { label: 'Redo', icon: <Redo className="w-4 h-4" />, action: () => setActiveMenu(null), disabled: !canRedo, shortcut: 'Ctrl+Y' },
        { type: 'separator' },
        { label: 'Delete Selected', icon: <Trash2 className="w-4 h-4" />, action: () => { onDeleteSelected(); setActiveMenu(null); }, shortcut: 'Del' },
        { label: 'Split Clip', icon: <Scissors className="w-4 h-4" />, action: () => { onSplitClip(); setActiveMenu(null); }, shortcut: 'Ctrl+K' },
      ]
    },
    {
      id: 'view',
      label: 'View',
      icon: <View className="w-4 h-4" />,
      items: [
        { label: 'Zoom In', icon: <ZoomIn className="w-4 h-4" />, action: () => setActiveMenu(null), shortcut: 'Ctrl++' },
        { label: 'Zoom Out', icon: <ZoomOut className="w-4 h-4" />, action: () => setActiveMenu(null), shortcut: 'Ctrl+-' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', icon: <Maximize className="w-4 h-4" />, action: toggleFullScreen, shortcut: 'F11' },
      ]
    },
    {
      id: 'ai',
      label: 'AI Tools',
      icon: <Sparkles className="w-4 h-4" />,
      items: [
        { label: 'Auto-Edit Video', icon: <Film className="w-4 h-4" />, action: () => { onAutoEdit(); setActiveMenu(null); }, disabled: !hasProject },
        { label: 'Generate Chapters', icon: <FileText className="w-4 h-4" />, action: () => { onGenerateChapters(); setActiveMenu(null); }, disabled: !hasProject || isProcessing },
        { label: 'Generate B-roll', icon: <Film className="w-4 h-4" />, action: () => { onGenerateBroll(); setActiveMenu(null); }, disabled: !hasProject || isProcessing },
        { label: 'Transcribe & Captions', icon: <Mic className="w-4 h-4" />, action: () => { onTranscribe(); setActiveMenu(null); }, disabled: !hasProject || isProcessing },
        { label: 'Remove Dead Air', icon: <ScissorsLineDashed className="w-4 h-4" />, action: () => { onRemoveDeadAir(); setActiveMenu(null); }, disabled: !hasProject || isProcessing },
      ]
    },
    {
      id: 'help',
      label: 'Help',
      icon: <HelpCircle className="w-4 h-4" />,
      items: [
        { label: 'Documentation', icon: <BookOpen className="w-4 h-4" />, action: () => { window.open('https://github.com/vaultkeeperirl-design/xIT-Video-Studio', '_blank'); setActiveMenu(null); } },
        { type: 'separator' },
        { label: 'About xIT Video Studio', icon: <Info className="w-4 h-4" />, action: () => { onOpenAbout(); setActiveMenu(null); } },
      ]
    },
  ];

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 select-none app-region-drag" ref={menuRef}>
      <style>{`
        .app-region-drag {
          -webkit-app-region: drag;
        }
        .app-region-no-drag {
          -webkit-app-region: no-drag;
        }
      `}</style>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileChange}
        accept="video/*,image/*,audio/*"
      />

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 mr-2">
           <img src={xitLogo} alt="xIT Logo" className="h-6" />
        </div>

        <div className="flex items-center gap-1 app-region-no-drag">
          {menuItems.map((menu) => (
            <div key={menu.id} className="relative group">
              <button
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  activeMenu === menu.id
                    ? 'bg-zinc-800 text-brand-400'
                    : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                }`}
                onClick={() => setActiveMenu(activeMenu === menu.id ? null : menu.id)}
                onMouseEnter={() => {
                  if (activeMenu) setActiveMenu(menu.id);
                }}
              >
                {/* {menu.icon} */}
                {menu.label}
              </button>

              {activeMenu === menu.id && (
                <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 py-1 flex flex-col">
                  {menu.items.map((item, index) => {
                    if (item.type === 'separator') {
                      return <div key={index} className="h-px bg-zinc-800 my-1 mx-2" />;
                    }

                    return (
                      <button
                        key={index}
                        className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between group/item ${
                          item.disabled
                            ? 'text-zinc-600 cursor-not-allowed'
                            : 'text-zinc-300 hover:bg-brand-500/10 hover:text-brand-400'
                        }`}
                        onClick={item.action}
                        disabled={item.disabled}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`${item.disabled ? 'text-zinc-600' : 'text-zinc-400 group-hover/item:text-brand-400'}`}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                        {item.shortcut && (
                          <span className="text-xs text-zinc-600 font-mono ml-4">{item.shortcut}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 app-region-no-drag">
        {isProcessing && (
          <div className="flex items-center gap-2 mr-4 text-xs text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            Processing...
          </div>
        )}

        <button
          onClick={onYoutubeExport}
          disabled={!hasClips || isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-red-600/20 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export for YouTube (Horizontal 16:9)"
        >
          <YoutubeIcon className="w-4 h-4" />
          YouTube
        </button>

        <button
          onClick={onTiktokExport}
          disabled={!hasClips || isProcessing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-300 text-sm font-medium hover:bg-cyan-600/20 hover:text-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export for TikTok/Shorts (Vertical 9:16)"
        >
          <TiktokIcon className="w-4 h-4" />
          TikTok
        </button>

        <button
          onClick={onExportProject}
          disabled={!hasClips || isProcessing}
          className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-brand-500 text-black text-sm font-bold hover:bg-brand-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4 fill-current" />
          Render
        </button>
      </div>
    </div>
  );
}
