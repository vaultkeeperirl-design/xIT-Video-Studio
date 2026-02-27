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
  Mic,
  ScissorsLineDashed,
  Info,
  BookOpen,
  ChevronRight
} from 'lucide-react';
import xitLogo from '@/assets/xit_logo.png';

interface MenuBarProps {
  onImportAsset: (files: FileList) => void;
  onExportProject: () => void;
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

export default function MenuBar({
  onImportAsset,
  onExportProject,
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

  const menuItems = [
    {
      id: 'file',
      label: 'File',
      icon: <File className="w-4 h-4" />,
      items: [
        { label: 'Import Asset...', icon: <Upload className="w-4 h-4" />, action: handleImportClick, shortcut: 'Ctrl+I' },
        { label: 'Export Project...', icon: <Download className="w-4 h-4" />, action: () => { onExportProject(); setActiveMenu(null); }, disabled: !hasClips || isProcessing, shortcut: 'Ctrl+E' },
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
        { label: 'Documentation', icon: <BookOpen className="w-4 h-4" />, action: () => { window.open('https://github.com/xit-video/studio', '_blank'); setActiveMenu(null); } },
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

      <div className="flex items-center gap-4 text-xs text-zinc-500">
        {isProcessing && (
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            Processing...
          </div>
        )}
      </div>
    </div>
  );
}
