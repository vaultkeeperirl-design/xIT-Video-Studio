import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { Film, Image, Music, X, Type, Sparkles } from 'lucide-react';
import type { TimelineClip as TimelineClipType, Asset } from '@/react-app/hooks/useProject';

interface TimelineClipProps {
  clip: TimelineClipType;
  asset: Asset | undefined;
  pixelsPerSecond: number;
  isSelected: boolean;
  trackHeight: number;
  onSelect: (id: string) => void;
  onMove: (id: string, newStart: number, newTrackId?: string) => void;
  onResize: (id: string, newInPoint: number, newOutPoint: number, newStart?: number) => void;
  onDragStart?: () => void;
  onDragEnd: () => void;
  onDelete: (id: string) => void;
  captionPreview?: string;  // For caption clips - first few words
  isCaption?: boolean;       // Whether this is a caption clip
  getSnapPoints?: (start: number, end: number) => number[];     // Function to get timecodes to snap to
}

const getAssetIcon = (type?: Asset['type'] | 'caption') => {
  switch (type) {
    case 'video': return Film;
    case 'image': return Image;
    case 'audio': return Music;
    case 'caption': return Type;
    default: return Film;
  }
};

const getClipColor = (type?: Asset['type'] | 'caption') => {
  switch (type) {
    case 'video': return 'from-blue-500 to-cyan-500';
    case 'image': return 'from-brand-500 to-brand-400';
    case 'audio': return 'from-emerald-500 to-teal-500';
    case 'caption': return 'from-purple-500 to-pink-500';
    default: return 'from-gray-500 to-gray-600';
  }
};

const TimelineClip = memo(function TimelineClip({
  clip,
  asset,
  pixelsPerSecond,
  isSelected,
  trackHeight,
  onSelect,
  onMove,
  onResize,
  onDragStart,
  onDragEnd,
  onDelete,
  captionPreview,
  isCaption = false,
  getSnapPoints,
}: TimelineClipProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [initialStart, setInitialStart] = useState(0);
  const [initialInPoint, setInitialInPoint] = useState(0);
  const [initialOutPoint, setInitialOutPoint] = useState(0);

  const clipRef = useRef<HTMLDivElement>(null);

  const Icon = getAssetIcon(isCaption ? 'caption' : asset?.type);
  const colorClass = getClipColor(isCaption ? 'caption' : asset?.type);

  const left = clip.start * pixelsPerSecond + 1; // 1px offset for visual gap
  const width = Math.max(clip.duration * pixelsPerSecond - 2, 30); // -2px for visual gap between clips

  // Handle dragging for moving the clip
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;

    // Check if clicking on resize handles
    const rect = clipRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const handleWidth = 8;

    if (clickX < handleWidth) {
      // Left resize handle
      onDragStart?.();
      setIsResizingLeft(true);
      setDragStartX(e.clientX);
      setInitialInPoint(clip.inPoint);
      setInitialStart(clip.start);
    } else if (clickX > rect.width - handleWidth) {
      // Right resize handle
      onDragStart?.();
      setIsResizingRight(true);
      setDragStartX(e.clientX);
      setInitialOutPoint(clip.outPoint);
    } else {
      // Main body - dragging
      onDragStart?.();
      setIsDragging(true);
      setDragStartX(e.clientX);
      // We don't track dragStartY because we use elementsFromPoint to find the track
      setInitialStart(clip.start);
    }

    e.preventDefault();
    e.stopPropagation();
  }, [clip.inPoint, clip.outPoint, clip.start]);

  // Handle mouse move for dragging/resizing
  useEffect(() => {
    if (!isDragging && !isResizingLeft && !isResizingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / pixelsPerSecond;

      if (isDragging) {
        let newStart = Math.max(0, initialStart + deltaTime);

        // Snap logic (drag)
        const snapThreshold = 10 / pixelsPerSecond; // 10 pixels snapping distance
        const currentEnd = newStart + clip.duration;
        let bestSnapStart = newStart;
        let minDiff = snapThreshold;

        const snapPoints = getSnapPoints ? getSnapPoints(clip.start, clip.start + clip.duration) : [];

        for (const pt of snapPoints) {
          if (Math.abs(newStart - pt) < minDiff) {
            minDiff = Math.abs(newStart - pt);
            bestSnapStart = pt;
          }
          if (Math.abs(currentEnd - pt) < minDiff) {
            minDiff = Math.abs(currentEnd - pt);
            bestSnapStart = pt - clip.duration;
          }
        }
        if (bestSnapStart >= 0) {
            newStart = bestSnapStart;
        }

        // Find which track we are hovering over
        let targetTrackId: string | undefined;
        // The track element should have a data-track-id attribute (we'll add it in Timeline.tsx)
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        for (const el of elements) {
          const trackId = el.getAttribute('data-track-id');
          if (trackId) {
            targetTrackId = trackId;
            break;
          }
        }

        // Optional validation: only allow moving video/image to video tracks, and audio to audio tracks
        const clipType = isCaption ? 'caption' : asset?.type;
        if (targetTrackId) {
          const isTargetVideo = targetTrackId.startsWith('V');
          const isTargetAudio = targetTrackId.startsWith('A');
          const isTargetText = targetTrackId.startsWith('T');

          let isValidTrack = false;
          if (clipType === 'video' || clipType === 'image') isValidTrack = isTargetVideo;
          if (clipType === 'audio') isValidTrack = isTargetAudio;
          if (clipType === 'caption') isValidTrack = isTargetText;

          if (!isValidTrack) {
            targetTrackId = undefined; // Cancel track change if invalid
          }
        }

        onMove(clip.id, newStart, targetTrackId);
      } else if (isResizingLeft) {
        // Resize from left - changes inPoint and start
        let newInPoint = Math.max(0, initialInPoint + deltaTime);
        const maxInPoint = clip.outPoint - 0.1; // Minimum 0.1s duration
        let clampedInPoint = Math.min(newInPoint, maxInPoint);
        let inPointDelta = clampedInPoint - initialInPoint;
        let newStart = initialStart + inPointDelta;

        // Snapping for resize left
        const snapThreshold = 10 / pixelsPerSecond;
        const snapPoints = getSnapPoints ? getSnapPoints(clip.start, clip.start + clip.duration) : [];
        for (const pt of snapPoints) {
          if (Math.abs(newStart - pt) < snapThreshold) {
            const snappedDelta = pt - initialStart;
            const snappedInPoint = initialInPoint + snappedDelta;
            if (snappedInPoint >= 0 && snappedInPoint <= maxInPoint) {
               newStart = pt;
               clampedInPoint = snappedInPoint;
               break;
            }
          }
        }
        onResize(clip.id, clampedInPoint, clip.outPoint, Math.max(0, newStart));
      } else if (isResizingRight) {
        // Resize from right - changes outPoint
        let newOutPoint = initialOutPoint + deltaTime;
        const minOutPoint = clip.inPoint + 0.1; // Minimum 0.1s duration
        const maxOutPoint = asset?.duration ?? Infinity;
        let clampedOutPoint = Math.min(Math.max(newOutPoint, minOutPoint), maxOutPoint);

        // Output duration = outPoint - inPoint
        // New end time = clip.start + (newOutPoint - clip.inPoint)
        let newEnd = clip.start + (clampedOutPoint - clip.inPoint);

        // Snapping for resize right
        const snapThreshold = 10 / pixelsPerSecond;
        const snapPoints = getSnapPoints ? getSnapPoints(clip.start, clip.start + clip.duration) : [];
        for (const pt of snapPoints) {
          if (Math.abs(newEnd - pt) < snapThreshold) {
             const snappedDuration = pt - clip.start;
             const snappedOutPoint = clip.inPoint + snappedDuration;
             if (snappedOutPoint >= minOutPoint && snappedOutPoint <= maxOutPoint) {
                 clampedOutPoint = snappedOutPoint;
                 break;
             }
          }
        }
        onResize(clip.id, clip.inPoint, clampedOutPoint);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizingLeft(false);
      setIsResizingRight(false);
      onDragEnd();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    isResizingLeft,
    isResizingRight,
    dragStartX,
    initialStart,
    initialInPoint,
    initialOutPoint,
    pixelsPerSecond,
    clip.id,
    clip.inPoint,
    clip.outPoint,
    asset?.duration,
    onMove,
    onResize,
    onDragEnd,
  ]);

  return (
    <div
      ref={clipRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(clip.id);
      }}
      onMouseDown={handleMouseDown}
      className={`absolute rounded-md bg-gradient-to-r ${colorClass} ${
        isDragging
          ? 'opacity-80 scale-105 shadow-xl shadow-black/50 z-30 cursor-grabbing ring-2 ring-brand-400'
          : isResizingLeft || isResizingRight
            ? 'cursor-ew-resize z-20 ring-2 ring-brand-400'
            : isSelected
              ? 'ring-2 ring-brand-400 shadow-lg shadow-brand-500/30 z-20 cursor-grab'
              : 'ring-1 ring-brand-500/50 hover:ring-brand-400 z-10 cursor-grab'
      } transition-all duration-75`}
      style={{
        left: `${left}px`,
        width: `${width}px`,
        top: '4px',
        height: `${trackHeight - 8}px`,
      }}
    >
      {/* Left edge indicator - prominent orange line showing cut point */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500 rounded-l-md shadow-[0_0_4px_rgba(13,255,255,0.6)]" />

      {/* Right edge indicator - prominent orange line showing cut point */}
      <div className="absolute right-0 top-0 bottom-0 w-1 bg-brand-500 rounded-r-md shadow-[0_0_4px_rgba(13,255,255,0.6)]" />

      {/* Left resize handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-brand-400/30 rounded-l-md z-10"
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsResizingLeft(true);
          setDragStartX(e.clientX);
          setInitialInPoint(clip.inPoint);
          setInitialStart(clip.start);
        }}
      />

      {/* Clip content */}
      <div className="flex items-center gap-1.5 px-2 h-full overflow-hidden pointer-events-none">
        {/* Thumbnail or Icon */}
        {isCaption ? (
          <Icon className="w-4 h-4 flex-shrink-0" />
        ) : asset?.thumbnailUrl && asset.type !== 'audio' ? (
          <div className="w-6 h-6 flex-shrink-0 rounded overflow-hidden">
            <img
              src={asset.thumbnailUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        ) : (
          <Icon className="w-4 h-4 flex-shrink-0" />
        )}

        {/* Name or Caption Preview */}
        <span className="text-xs font-medium truncate">
          {isCaption ? (captionPreview || 'Caption') : (asset?.filename || 'Unknown')}
        </span>

        {/* AI-generated indicator */}
        {asset?.aiGenerated && (
          <div
            className="flex-shrink-0 flex items-center gap-0.5 px-1 py-0.5 bg-purple-500/40 rounded text-[8px] font-bold"
            title="AI-generated Remotion animation"
          >
            <Sparkles className="w-2.5 h-2.5" />
            AI
          </div>
        )}
      </div>

      {/* Right resize handle */}
      <div
        className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-brand-400/30 rounded-r-md z-10"
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsResizingRight(true);
          setDragStartX(e.clientX);
          setInitialOutPoint(clip.outPoint);
        }}
      />

      {/* Delete button (shown when selected) */}
      {isSelected && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(clip.id);
          }}
          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-colors z-30"
          title="Remove from timeline"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}

      {/* Duration indicator (shown when resizing) */}
      {(isResizingLeft || isResizingRight) && (
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/80 rounded text-[10px] whitespace-nowrap">
          {formatTime(clip.inPoint)} - {formatTime(clip.outPoint)}
        </div>
      )}
    </div>
  );
});

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
}

export default TimelineClip;
