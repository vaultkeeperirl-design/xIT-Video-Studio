import { useState, useMemo } from 'react';
import { User, RefreshCw, X, Check, Target, ToggleLeft, ToggleRight } from 'lucide-react';
import { useProject } from '@/react-app/hooks/useProject';

interface ReframeToolProps {
  clipId: string | null;
  onClose: () => void;
  onEnableReframe: (clipId: string, trackId: number | null) => void;
  activeFaceTrackId: number | null;
  isEnabled: boolean;
}

export default function ReframeTool({
  clipId,
  onClose,
  onEnableReframe,
  activeFaceTrackId,
  isEnabled,
}: ReframeToolProps) {
  const { clips, assets, detectFaces, faceTrackingData } = useProject();
  const [detecting, setDetecting] = useState(false);

  const selectedClip = useMemo(() => clips.find(c => c.id === clipId), [clips, clipId]);
  const selectedAsset = useMemo(() =>
    selectedClip ? assets.find(a => a.id === selectedClip.assetId) : null,
    [selectedClip, assets]
  );

  const faces = useMemo(() => {
    if (!selectedAsset) return [];
    return faceTrackingData[selectedAsset.id] || [];
  }, [faceTrackingData, selectedAsset]);

  const handleDetect = async () => {
    if (!selectedAsset) return;
    setDetecting(true);
    try {
      await detectFaces(selectedAsset.id);
    } catch (err) {
      console.error("Face detection failed", err);
    } finally {
      setDetecting(false);
    }
  };

  const handleToggle = () => {
    if (!clipId) return;
    if (isEnabled) {
      onEnableReframe(clipId, null);
    } else {
      // Default to first face if available, or just enable mode waiting for selection
      const firstTrackId = faces.length > 0 ? faces[0].id : null;
      onEnableReframe(clipId, firstTrackId);
    }
  };

  const handleSelectFace = (trackId: number) => {
    if (!clipId) return;
    onEnableReframe(clipId, trackId);
  };

  if (!selectedClip || !selectedAsset) {
    return (
      <div className="p-4 text-center text-zinc-500">
        Select a video clip to use Auto-Reframe
      </div>
    );
  }

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <h2 className="font-medium flex items-center gap-2">
          <Target className="w-4 h-4 text-brand-400" />
          Auto Reframe
        </h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {/* Toggle Switch */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-zinc-300">Enable Auto-Reframe</span>
          <button
            onClick={handleToggle}
            className={`transition-colors ${isEnabled ? 'text-brand-400' : 'text-zinc-600 hover:text-zinc-500'}`}
          >
            {isEnabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
          </button>
        </div>

        {/* Info Box */}
        <div className="p-3 bg-zinc-800/50 rounded-lg text-xs text-zinc-400">
          Automatically crops and pans 16:9 video to keep the subject centered in 9:16 vertical format.
        </div>

        {/* Faces Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Detected Faces</h3>
            {faces.length === 0 && !detecting && (
              <button
                onClick={handleDetect}
                className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Detect Faces
              </button>
            )}
          </div>

          {detecting ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-500">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xs">Analyzing video...</span>
            </div>
          ) : faces.length > 0 ? (
            <div className="grid grid-cols-2 gap-2">
              {faces.map((face, index) => {
                const isActive = isEnabled && activeFaceTrackId === face.id;
                const duration = (face.keyframes[face.keyframes.length - 1].t - face.keyframes[0].t).toFixed(1);

                return (
                  <button
                    key={face.id}
                    onClick={() => handleSelectFace(face.id)}
                    className={`
                      relative p-3 rounded-lg border text-left transition-all
                      flex flex-col gap-2
                      ${isActive
                        ? 'bg-brand-500/10 border-brand-500/50'
                        : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center
                        ${isActive ? 'bg-brand-500 text-black' : 'bg-zinc-700 text-zinc-400'}
                      `}>
                        <User className="w-4 h-4" />
                      </div>
                      {isActive && <Check className="w-4 h-4 text-brand-400" />}
                    </div>

                    <div>
                      <div className={`text-sm font-medium ${isActive ? 'text-brand-100' : 'text-zinc-300'}`}>
                        Face {index + 1}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {duration}s tracked
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 text-sm border-2 border-dashed border-zinc-800 rounded-lg">
              No faces detected yet.
              <br />
              Click "Detect Faces" to start.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
