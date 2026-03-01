import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ZoomIn, ZoomOut, Play, Pause, SkipBack, Scissors, Trash2, Type, RectangleHorizontal, RectangleVertical, Link, Unlink, Film, Music, Copy, RotateCcw, RotateCw, Volume2, Palette, Wand2, ScanFace, Settings } from 'lucide-react';
import TimelineClip from './TimelineClip';
import type { Track, TimelineClip as TimelineClipType, Asset, CaptionData } from '@/react-app/hooks/useProject';

interface TimelineProps {
  tracks: Track[];
  clips: TimelineClipType[];
  assets: Asset[];
  selectedClipId: string | null;
  selectedTrackId: string | null;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  aspectRatio: '16:9' | '9:16';
  onSelectClip: (id: string | null) => void;
  onSelectTrack: (id: string | null) => void;
  onTimeChange: (time: number) => void;
  onPlayPause: () => void;
  onStop: () => void;
  onMoveClip: (clipId: string, newStart: number, newTrackId?: string) => void;
  onResizeClip: (clipId: string, newInPoint: number, newOutPoint: number, newStart?: number) => void;
  onDeleteClip: (clipId: string) => void;
  onCutAtPlayhead: () => void;
  onAddText: () => void;
  onToggleAspectRatio: () => void;
  autoSnap?: boolean;
  onToggleAutoSnap?: () => void;
  onDropAsset: (asset: Asset, trackId: string, time: number) => void;
  onSave: () => void;
  getCaptionData?: (clipId: string) => CaptionData | null;
  onDuplicate?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onAutoReframe?: () => void;
  onDragStart?: () => void;
  onOpenSettings?: () => void;
}

const TRACK_HEIGHTS: Record<string, number> = {
  video: 56,
  audio: 44,
  text: 48,
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function Timeline({
  tracks,
  clips,
  assets,
  selectedClipId,
  selectedTrackId,
  currentTime,
  duration,
  isPlaying,
  aspectRatio,
  onSelectClip,
  onSelectTrack,
  onTimeChange,
  onPlayPause,
  onStop,
  onMoveClip,
  onResizeClip,
  onDeleteClip,
  onCutAtPlayhead,
  onAddText,
  onToggleAspectRatio,
  autoSnap = true,
  onToggleAutoSnap,
  onDropAsset,
  onSave,
  getCaptionData,
  onDuplicate,
  onUndo,
  onRedo,
  onAutoReframe,
  onDragStart,
  onOpenSettings,
}: TimelineProps) {
  const [zoom, setZoom] = useState(1);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragOverTrack, setDragOverTrack] = useState<string | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const trackHeadersRef = useRef<HTMLDivElement>(null);

  // Sync vertical scroll between track headers and tracks content
  useEffect(() => {
    const tracksContainer = tracksContainerRef.current;
    const trackHeaders = trackHeadersRef.current;
    if (!tracksContainer || !trackHeaders) return;

    const handleScroll = () => {
      trackHeaders.scrollTop = tracksContainer.scrollTop;
    };

    tracksContainer.addEventListener('scroll', handleScroll);
    return () => tracksContainer.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected clip with Delete or Backspace key
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedClipId) {
        // Don't trigger if user is typing in an input
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        onDeleteClip(selectedClipId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, onDeleteClip]);

  // Calculate display properties
  const totalDuration = Math.max(duration, 10);
  const basePixelsPerSecond = Math.min(100, 2000 / totalDuration);
  const pixelsPerSecond = basePixelsPerSecond * zoom;
  const timelineWidth = Math.max(totalDuration * pixelsPerSecond, 800);

  // Track header width
  const headerWidth = 80;

  // Time ruler intervals
  const getTimeInterval = useCallback(() => {
    const effectiveZoom = pixelsPerSecond / 50;
    if (effectiveZoom > 2) return 1;
    if (effectiveZoom > 1) return 5;
    if (effectiveZoom > 0.5) return 10;
    if (effectiveZoom > 0.2) return 30;
    return 60;
  }, [pixelsPerSecond]);

  const timeInterval = getTimeInterval();
  const tickCount = Math.ceil(totalDuration / timeInterval) + 1;

  // Sort tracks by order
  const sortedTracks = useMemo(() =>
    [...tracks].sort((a, b) => a.order - b.order),
    [tracks]
  );

  // ⚡ Bolt: Use a ref for current time to avoid recreating snap points on every frame
  // This prevents O(N^2) array creation and O(N) re-renders of TimelineClip during playback
  const currentTimeRef = useRef(currentTime);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const getSnapPoints = useCallback((clipStart: number, clipEnd: number) => {
    const points = [
      0,
      currentTimeRef.current,
      ...clips.flatMap(c => [c.start, c.start + c.duration])
    ];
    return points.filter(p => p !== clipStart && p !== clipEnd).sort((a, b) => a - b);
  }, [clips]);

  // Get clips for a specific track
  const getTrackClips = useCallback((trackId: string) =>
    clips.filter(c => c.trackId === trackId),
    [clips]
  );

  // Handle clicking on timeline to seek
  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (!tracksContainerRef.current) return;

    const rect = tracksContainerRef.current.getBoundingClientRect();
    const scrollLeft = tracksContainerRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const newTime = Math.max(0, Math.min(clickX / pixelsPerSecond, duration));

    onTimeChange(newTime);
    onSelectClip(null);
  }, [pixelsPerSecond, duration, onTimeChange, onSelectClip]);

  // Handle playhead dragging
  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingPlayhead || !tracksContainerRef.current) return;

    const rect = tracksContainerRef.current.getBoundingClientRect();
    const scrollLeft = tracksContainerRef.current.scrollLeft;
    const clickX = e.clientX - rect.left + scrollLeft;
    const newTime = Math.max(0, Math.min(clickX / pixelsPerSecond, duration));

    onTimeChange(newTime);
  }, [isDraggingPlayhead, pixelsPerSecond, duration, onTimeChange]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  // Handle drop from asset library
  const handleDragOver = useCallback((e: React.DragEvent, trackId: string) => {
    // Check compatibility based on drag types
    const hasVideo = e.dataTransfer.types.includes('application/x-hyperedit-asset-video');
    const hasImage = e.dataTransfer.types.includes('application/x-hyperedit-asset-image');
    const hasAudio = e.dataTransfer.types.includes('application/x-hyperedit-asset-audio');

    // Only enforce rules if we detect our custom drag types
    if (hasVideo || hasImage || hasAudio) {
      const isAudioTrack = trackId.startsWith('A');
      const isVideoTrack = trackId.startsWith('V');

      if ((hasVideo || hasImage) && isAudioTrack) return;
      if (hasAudio && isVideoTrack) return;
      if ((hasVideo || hasImage || hasAudio) && trackId.startsWith('T')) return; // No dropping media on Text track
    }

    e.preventDefault();
    e.stopPropagation();
    setDragOverTrack(trackId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverTrack(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTrack(null);

    const assetData = e.dataTransfer.getData('application/x-hyperedit-asset');
    if (!assetData) return;

    try {
      const asset = JSON.parse(assetData) as Asset;

      // Calculate drop time position
      const rect = tracksContainerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const scrollLeft = tracksContainerRef.current?.scrollLeft || 0;
      const dropX = e.clientX - rect.left + scrollLeft;
      const dropTime = Math.max(0, dropX / pixelsPerSecond);

      onDropAsset(asset, trackId, dropTime);
    } catch (err) {
      console.error('Failed to parse dropped asset:', err);
    }
  }, [pixelsPerSecond, onDropAsset]);

  // Get asset for a clip
  const getAssetForClip = useCallback((clip: TimelineClipType) =>
    assets.find(a => a.id === clip.assetId),
    [assets]
  );

  return (
    <div
      ref={timelineRef}
      className="flex flex-col h-full select-none"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Timeline header */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-800/50 border-b border-zinc-700/50">
        <div className="flex items-center gap-3">
          {/* Playback controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={onStop}
              className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
              title="Stop (go to start)"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              onClick={onPlayPause}
              className={`p-1 rounded transition-colors ${
                isPlaying
                  ? 'bg-brand-500 hover:bg-brand-600 text-zinc-900'
                  : 'bg-zinc-700 hover:bg-zinc-600'
              }`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-3 h-3" />
              ) : (
                <Play className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Editing tools */}
          <div className="flex items-center gap-1 border-l border-zinc-700 pl-3 ml-1">
            <button
              onClick={onCutAtPlayhead}
              className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
              title="Cut at playhead (split clip)"
            >
              <Scissors className="w-3 h-3" />
            </button>
            <button
              onClick={onDuplicate}
              className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Duplicate selected clip"
              disabled={!selectedClipId || !onDuplicate}
            >
              <Copy className="w-3 h-3" />
            </button>
            <button
              onClick={() => selectedClipId && onDeleteClip(selectedClipId)}
              disabled={!selectedClipId}
              className="p-1 bg-zinc-700 hover:bg-red-600 disabled:opacity-40 disabled:hover:bg-zinc-700 rounded transition-colors"
              title="Delete selected clip (Delete key)"
            >
              <Trash2 className="w-3 h-3" />
            </button>
            <div className="w-px h-4 bg-zinc-600 mx-1" />
            <button
              onClick={onUndo}
              className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo (⌘Z)"
              disabled={!onUndo}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={onRedo}
              className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo (⌘⇧Z)"
              disabled={!onRedo}
            >
              <RotateCw className="w-3 h-3" />
            </button>
            <div className="w-px h-4 bg-zinc-600 mx-1" />
            <button
              onClick={onAddText}
              className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
              title="Add text overlay"
            >
              <Type className="w-3 h-3" />
            </button>
            <button
              onClick={onToggleAspectRatio}
              className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
              title={`Currently ${aspectRatio === '16:9' ? '16:9 (horizontal)' : '9:16 (vertical)'} - click to switch`}
            >
              {aspectRatio === '16:9' ? (
                <RectangleHorizontal className="w-3 h-3" />
              ) : (
                <RectangleVertical className="w-3 h-3" />
              )}
            </button>
            <div className="w-px h-4 bg-zinc-600 mx-1" />
            <button
              onClick={onToggleAutoSnap}
              className={`p-1 rounded transition-colors ${
                autoSnap
                  ? 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
                  : 'bg-zinc-700 hover:bg-zinc-600 text-zinc-400'
              }`}
              title={autoSnap ? 'Auto-snap ON: Clips shift when deleting' : 'Auto-snap OFF: Gaps remain when deleting'}
            >
              {autoSnap ? (
                <Link className="w-3 h-3" />
              ) : (
                <Unlink className="w-3 h-3" />
              )}
            </button>
          </div>
          <button
            className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Audio (A)"
            onClick={() => alert("Feature coming soon")}
          >
            <Volume2 className="w-3 h-3" />
          </button>
          <button
            className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Color (C)"
            onClick={() => alert("Feature coming soon")}
          >
            <Palette className="w-3 h-3" />
          </button>
          <button
            className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Effects (E)"
            onClick={() => alert("Feature coming soon")}
          >
            <Wand2 className="w-3 h-3" />
          </button>
          <button
            onClick={onAutoReframe}
            className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Auto Reframe (F)"
            disabled={!onAutoReframe}
          >
            <ScanFace className="w-3 h-3" />
          </button>
          <button
            className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Settings (,)"
            onClick={onOpenSettings}
          >
            <Settings className="w-3 h-3" />
          </button>

          {/* Time display */}
          <div className="flex items-center gap-2 text-xs ml-2 border-l border-zinc-700 pl-3">
            <span className="font-mono text-brand-400">{formatTime(currentTime)}</span>
            <span className="text-zinc-600">/</span>
            <span className="font-mono text-zinc-400">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
            className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3 h-3" />
          </button>
          <span className="text-xs text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            className="p-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Timeline content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track headers (fixed horizontally, syncs vertically) */}
        <div
          className="flex-shrink-0 bg-zinc-900/80 border-r border-zinc-700/50 flex flex-col"
          style={{ width: headerWidth }}
        >
          {/* Spacer for time ruler (sticky) */}
          <div className="h-6 border-b border-zinc-800 flex-shrink-0" />

          {/* Track labels (scrolls vertically with tracks) */}
          <div
            ref={trackHeadersRef}
            className="flex-1 overflow-hidden"
          >
            {sortedTracks.map(track => {
              const trackClipCount = clips.filter(c => c.trackId === track.id).length;
              const isTextTrack = track.type === 'text' && trackClipCount > 0;

              let TrackIcon = Film;
              let trackColorClass = 'text-cyan-400';

              if (track.type === 'audio') {
                TrackIcon = Music;
                trackColorClass = 'text-emerald-400';
              } else if (track.type === 'text') {
                TrackIcon = Type;
                trackColorClass = 'text-purple-400';
              }

              const isSelected = selectedTrackId === track.id;

              return (
                <div
                  key={track.id}
                  onClick={() => onSelectTrack(track.id)}
                  className={`flex items-center justify-start pl-3 gap-2 text-xs font-medium border-b border-zinc-800/50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-zinc-800/80 text-zinc-200 border-l-2 border-l-brand-500' : 'text-zinc-400 hover:bg-zinc-800/30'
                  }`}
                  style={{ height: TRACK_HEIGHTS[track.type] }}
                >
                  <TrackIcon className={`w-3.5 h-3.5 ${trackColorClass}`} />
                  <span className="truncate">{track.name}</span>
                  {isTextTrack && (
                    <button
                      title={`Delete all ${trackClipCount} captions`}
                      className="p-0.5 rounded hover:bg-red-500/20 hover:text-red-400 transition-colors flex-shrink-0 ml-auto mr-1"
                      onClick={() => {
                        if (confirm(`Delete all ${trackClipCount} captions on ${track.name}?`)) {
                          clips
                            .filter(c => c.trackId === track.id)
                            .forEach(c => onDeleteClip(c.id));
                        }
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Scrollable tracks area */}
        <div
          ref={tracksContainerRef}
          className="flex-1 overflow-auto bg-zinc-950"
          onMouseMove={handleMouseMove}
        >
          <div
            className="relative flex flex-col"
            style={{ width: timelineWidth, minHeight: '100%' }}
          >
            {/* Time ruler */}
            <div
              className="sticky top-0 h-6 bg-zinc-900/95 border-b border-zinc-800 z-30 flex-shrink-0"
              onClick={handleTimelineClick}
            >
              {Array.from({ length: tickCount }).map((_, i) => {
                const time = i * timeInterval;
                if (time > totalDuration) return null;
                return (
                  <div
                    key={i}
                    className="absolute flex flex-col items-start"
                    style={{ left: `${time * pixelsPerSecond}px` }}
                  >
                    <span className="text-[10px] text-zinc-500 pl-1">{formatTime(time)}</span>
                    <div className="w-px h-2 bg-zinc-700" />
                  </div>
                );
              })}
            </div>

            {/* Tracks */}
            <div onClick={handleTimelineClick} className="flex-1">
              {sortedTracks.map(track => {
                const trackClips = getTrackClips(track.id);
                const isDragOver = dragOverTrack === track.id;
                const isSelected = selectedTrackId === track.id;

                return (
                  <div
                    key={track.id}
                    data-track-id={track.id}
                    onClick={(e) => {
                      // Stop propagation so it doesn't trigger the general timeline click
                      e.stopPropagation();
                      onSelectTrack(track.id);
                      // Still allow standard playhead jumping logic
                      handleTimelineClick(e);
                    }}
                    className={`relative border-b border-zinc-800/50 transition-colors ${
                      isDragOver ? 'bg-brand-500/10' : isSelected ? 'bg-zinc-800/40' : 'bg-zinc-900/30 hover:bg-zinc-800/20'
                    }`}
                    style={{ height: TRACK_HEIGHTS[track.type] }}
                    onDragOver={(e) => handleDragOver(e, track.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, track.id)}
                  >
                    {/* Track background grid lines */}
                    {Array.from({ length: tickCount }).map((_, i) => {
                      const time = i * timeInterval;
                      if (time > totalDuration) return null;
                      return (
                        <div
                          key={i}
                          className="absolute top-0 bottom-0 w-px bg-zinc-800/50"
                          style={{ left: `${time * pixelsPerSecond}px` }}
                        />
                      );
                    })}

                    {/* Empty track placeholder */}
                    {trackClips.length === 0 && !isDragOver && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-600 pointer-events-none">
                        Drop clips here
                      </div>
                    )}

                    {/* Drop indicator */}
                    {isDragOver && (
                      <div className="absolute inset-0 flex items-center justify-center text-xs text-brand-400 pointer-events-none border-2 border-dashed border-brand-500/50 rounded">
                        Drop to add clip
                      </div>
                    )}

                    {/* Clips */}
                    {trackClips.map(clip => {
                      const captionData = getCaptionData?.(clip.id);
                      const isCaption = track.type === 'text';
                      const captionPreview = captionData?.words
                        .slice(0, 5)
                        .map(w => w.text)
                        .join(' ') + (captionData && captionData.words.length > 5 ? '...' : '');

                      return (
                        <TimelineClip
                          key={clip.id}
                          clip={clip}
                          asset={getAssetForClip(clip)}
                          pixelsPerSecond={pixelsPerSecond}
                          isSelected={selectedClipId === clip.id}
                          trackHeight={TRACK_HEIGHTS[track.type]}
                          onSelect={onSelectClip}
                          onMove={onMoveClip}
                          onResize={onResizeClip}
                          onDelete={onDeleteClip}
                          onDragStart={onDragStart}
                          onDragEnd={onSave}
                          isCaption={isCaption}
                          captionPreview={captionPreview}
                          getSnapPoints={getSnapPoints}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Playhead */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-brand-500 z-40 pointer-events-none"
              style={{ left: `${currentTime * pixelsPerSecond}px` }}
            >
              {/* Playhead handle */}
              <div
                className="absolute -top-0 -left-2.5 w-5 h-5 cursor-ew-resize pointer-events-auto"
                onMouseDown={handlePlayheadMouseDown}
              >
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-brand-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
