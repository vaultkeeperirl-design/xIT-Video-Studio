import { Play, Image as ImageIcon, Layers, Move } from 'lucide-react';
import { useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useState, useCallback } from 'react';
import CaptionRenderer from './CaptionRenderer';
import type { CaptionWord, CaptionStyle, FaceTrack } from '@/react-app/hooks/useProject';

interface ClipTransform {
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  opacity?: number;
  cropTop?: number;
  cropBottom?: number;
  cropLeft?: number;
  cropRight?: number;
}

interface ClipLayer {
  id: string;
  url: string;
  type: 'video' | 'image' | 'audio' | 'caption';
  trackId: string;
  clipTime: number;
  transform?: ClipTransform;
  // Caption-specific data
  captionWords?: CaptionWord[];
  captionStyle?: CaptionStyle;
}

interface VideoPreviewProps {
  layers?: ClipLayer[];
  isPlaying?: boolean;
  aspectRatio?: '16:9' | '9:16';
  onLayerMove?: (layerId: string, x: number, y: number) => void;
  onLayerSelect?: (layerId: string) => void;
  onLayerResize?: (layerId: string, scale: number) => void;
  selectedLayerId?: string | null;
  // Auto-Reframe props
  reframeConfig?: {
    isEnabled: boolean;
    mode: 'single' | 'group';
    faceTrack: FaceTrack | null;
    allFaceTracks?: FaceTrack[];
  };
}

export interface VideoPreviewHandle {
  seekTo: (time: number) => void;
  getVideoElement: () => HTMLVideoElement | null;
}

// Helper to interpolate value between two keyframes
function interpolate(t: number, kf1: { t: number, val: number }, kf2: { t: number, val: number }): number {
  if (t <= kf1.t) return kf1.val;
  if (t >= kf2.t) return kf2.val;

  const progress = (t - kf1.t) / (kf2.t - kf1.t);
  // Simple linear interpolation for now
  return kf1.val + (kf2.val - kf1.val) * progress;
}

/**
 * Calculates CSS transformation styles for video layers to handle scaling, rotation, positioning, and cropping.
 *
 * **Why use `reframeOverride`?**
 * When the Auto-Reframe (Face Tracking) feature is enabled for a 9:16 vertical video export of a 16:9 source,
 * it replaces the standard clip transform with a dynamic scale and X-axis offset. This ensures the subject
 * remains centered within the cropped viewport without displaying black bars.
 *
 * @param transform - The standard transformation properties applied by the user (scale, rotation, crop, etc.).
 * @param zIndex - The layer stack position (e.g., base video is 1, overlay is 2+).
 * @param isDragging - If true, adds a 'grabbing' cursor style to indicate active interaction.
 * @param reframeOverride - Overrides `x` and `scale` properties dynamically based on face tracking data.
 * @returns A React CSS properties object with `transform`, `clipPath`, and visual indicators.
 */
function getTransformStyles(
  transform?: ClipTransform,
  zIndex: number = 0,
  isDragging?: boolean,
  reframeOverride?: { x: number, scale: number }
): React.CSSProperties {
  const t = transform || {};

  const transforms: string[] = [];

  // Use reframe override if available, otherwise use clip transform
  // For reframe, we want to center the face.
  // Standard transform x/y is offset from center in pixels.
  // Reframe logic calculates needed offset.

  const x = reframeOverride ? reframeOverride.x : (t.x || 0);
  const y = t.y || 0; // Vertical reframe usually keeps y=0 unless we want to track vertical movement too
  const scale = reframeOverride ? reframeOverride.scale : (t.scale || 1);

  // Position (translate)
  if (x || y) {
    transforms.push(`translate(${x}px, ${y}px)`);
  }

  // Scale
  if (scale && scale !== 1) {
    transforms.push(`scale(${scale})`);
  }

  // Rotation
  if (t.rotation) {
    transforms.push(`rotate(${t.rotation}deg)`);
  }

  // Crop using clip-path
  const cropTop = t.cropTop || 0;
  const cropBottom = t.cropBottom || 0;
  const cropLeft = t.cropLeft || 0;
  const cropRight = t.cropRight || 0;
  const hasClip = cropTop || cropBottom || cropLeft || cropRight;

  return {
    zIndex,
    transform: transforms.length > 0 ? transforms.join(' ') : undefined,
    opacity: t.opacity ?? 1,
    clipPath: hasClip
      ? `inset(${cropTop}% ${cropRight}% ${cropBottom}% ${cropLeft}%)`
      : undefined,
    cursor: isDragging ? 'grabbing' : undefined,
  };
}

const VideoPreview = forwardRef<VideoPreviewHandle, VideoPreviewProps>(({
  layers = [],
  isPlaying = false,
  aspectRatio = '16:9',
  onLayerMove,
  onLayerSelect,
  onLayerResize,
  selectedLayerId,
  reframeConfig,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedSrcRef = useRef<string | null>(null);
  const overlayVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);
  const [draggingLayer, setDraggingLayer] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; layerX: number; layerY: number } | null>(null);
  const [resizingLayer, setResizingLayer] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; initialScale: number } | null>(null);

  // Find the base video layer (V1) for audio/playback control
  const foundBaseLayer = layers.find(l => l.trackId === 'V1' && l.type === 'video');
  const baseLayerId = foundBaseLayer?.id;
  const baseLayerUrl = foundBaseLayer?.url;
  const baseLayerClipTime = foundBaseLayer?.clipTime;

  // Memoize to prevent effect triggers when only caption layers change
  const baseVideoLayer = useMemo(() => {
    return foundBaseLayer;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseLayerId, baseLayerUrl]);

  // Get all layers sorted by track for rendering (V1 at bottom, then V2/V3, then T1 captions on top)
  const sortedLayers = useMemo(() => {
    const getTrackOrder = (trackId: string) => {
      if (trackId === 'V1') return 0;
      if (trackId === 'V2') return 1;
      if (trackId === 'V3') return 2;
      if (trackId.startsWith('T')) return 10; // Text/caption tracks on top
      return 5; // Other tracks in between
    };
    return [...layers].sort((a, b) => getTrackOrder(a.trackId) - getTrackOrder(b.trackId));
  }, [layers]);

  useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (videoRef.current) videoRef.current.currentTime = time;
    },
    getVideoElement: () => videoRef.current,
  }));

  /**
   * Calculates dynamic scaling and panning offsets to keep tracked faces centered when converting
   * 16:9 landscape videos into 9:16 vertical format ("Auto-Reframe").
   *
   * **The Mathematical "Why" Behind the Calculation:**
   *
   * 1. **Zoom to Fill (Scale):**
   *    To fill a 9:16 container with a 16:9 video (simulating `object-fit: cover` on a centered video),
   *    the video must be scaled up significantly so its height matches the container height.
   *    - Container Ratio = 9/16 (0.5625)
   *    - Video Ratio = 16/9 (1.777)
   *    - Target Scale = `(16/9) / (9/16)` ≈ 3.16x
   *
   * 2. **Pixel Offset (Pan):**
   *    Once scaled, the video is much wider than the container. We translate the X-axis (in pixels)
   *    to center the interpolated face coordinates.
   *    - We calculate the face's pixel position relative to the scaled video's full width.
   *    - We then determine the offset needed to move that pixel to the container's horizontal center.
   *
   * 3. **Clamping (Preventing Black Bars):**
   *    To ensure the panning never reveals the edges of the video (black bars), the X offset is
   *    mathematically clamped to `(targetVideoWidth - containerWidth) / 2` in both directions.
   *
   * @param clipTime - The current playback time to interpolate face keyframes.
   * @returns An object containing the required `x` offset in pixels and the `scale` factor, or `undefined` if disabled.
   */
  const getReframeTransform = useCallback((clipTime: number): { x: number, scale: number } | undefined => {
    if (!reframeConfig?.isEnabled || aspectRatio !== '9:16') {
      return undefined;
    }

    let faceCenterX = 0.5;

    if (reframeConfig.mode === 'group' && reframeConfig.allFaceTracks && reframeConfig.allFaceTracks.length > 0) {
      let activeFaces = 0;
      let totalX = 0;

      for (const track of reframeConfig.allFaceTracks) {
        const { keyframes } = track;
        if (keyframes.length === 0) continue;

        // Check if face is active at this time
        if (clipTime >= keyframes[0].t && clipTime <= keyframes[keyframes.length - 1].t) {
          let kf1 = keyframes[0];
          let kf2 = keyframes[keyframes.length - 1];

          for (let i = 0; i < keyframes.length - 1; i++) {
            if (clipTime >= keyframes[i].t && clipTime < keyframes[i+1].t) {
              kf1 = keyframes[i];
              kf2 = keyframes[i+1];
              break;
            }
          }

          const trackX = interpolate(
            clipTime,
            { t: kf1.t, val: kf1.x },
            { t: kf2.t, val: kf2.x }
          );

          totalX += trackX;
          activeFaces++;
        }
      }

      if (activeFaces > 0) {
        faceCenterX = totalX / activeFaces;
      } else {
        return undefined; // No faces active
      }
    } else if (reframeConfig.mode === 'single' && reframeConfig.faceTrack) {
      const { keyframes } = reframeConfig.faceTrack;
      if (keyframes.length === 0) return undefined;

      // Find surrounding keyframes
      let kf1 = keyframes[0];
      let kf2 = keyframes[keyframes.length - 1];

      for (let i = 0; i < keyframes.length - 1; i++) {
        if (clipTime >= keyframes[i].t && clipTime < keyframes[i+1].t) {
          kf1 = keyframes[i];
          kf2 = keyframes[i+1];
          break;
        }
      }

      // Interpolate face center X (0-1 range)
      faceCenterX = interpolate(
        clipTime,
        { t: kf1.t, val: kf1.x },
        { t: kf2.t, val: kf2.x }
      );
    } else {
      return undefined;
    }

    // Calculate transform needed to center this X coordinate
    // Video preview container dimensions depend on CSS, but logic handles relative scale

    // In 9:16 mode, we typically scale the video to fill height (cover)
    // For a 16:9 video in a 9:16 frame:
    // Scale = (9/16) / (16/9) is wrong.
    // We want video height = container height.
    // Video width = video height * (16/9)
    // Container width = container height * (9/16)
    // Ratio of Widths = (16/9) / (9/16) = 3.16
    // So the video is ~3.16x wider than the container when fitting height.

    // Let's assume standard "cover" behavior where height matches (scale=1 relative to cover)
    // We just need to shift X.

    // faceCenterX is 0-1 (relative to video width).
    // Center of video is 0.5.
    // If face is at 0.7, we need to shift video LEFT by (0.7 - 0.5) * videoWidth

    // Container width (CW)
    // Video width (VW)
    // We want faceCenterX * VW to be at CW / 2
    // offset = (CW/2) - (faceCenterX * VW)

    // If we assume the viewer renders video such that height fits container:
    // VW = VH * (16/9)
    // CW = VH * (9/16)
    // VW = CW * (16/9) / (9/16) = CW * (256/81) ≈ 3.16 * CW

    // Let's verify pixel-based transform logic in VideoPreview.
    // Transform `x` is translation in pixels.
    // If we don't know pixel size here, we might need a ref to container dimensions.

    const container = containerRef.current;
    if (!container) return undefined;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    // Assuming source video is 16:9 and fits height-wise (cover behavior)
    // Actually, typical <video> behavior with object-fit: contain puts it in middle.
    // But for reframe we likely want to scale it up to cover height.

    const videoAspect = 16/9;
    const targetVideoHeight = containerH;
    const targetVideoWidth = targetVideoHeight * videoAspect;

    // Center of the face in pixel coordinates relative to video top-left
    const facePixelX = faceCenterX * targetVideoWidth;

    // We want this pixel to be at container center (containerW / 2)
    // The video is by default centered?
    // <video> is absolute inset-0 w-full h-full.
    // If we apply scale, it scales from center.

    // Let's assume we start with video centered.
    // Center of video is at container center.
    // Center of video X coord is targetVideoWidth / 2.
    // Face is at facePixelX.
    // Distance from video center = facePixelX - (targetVideoWidth / 2).
    // We need to shift opposite direction: -(facePixelX - targetVideoWidth / 2).

    const xOffset = -(facePixelX - (targetVideoWidth / 2));

    // Limit offset so we don't show black bars
    // Max shift left: right edge of video touches right edge of container
    // Max shift right: left edge of video touches left edge of container

    // Video width > Container width
    const maxOffset = (targetVideoWidth - containerW) / 2;
    const clampedOffset = Math.max(-maxOffset, Math.min(maxOffset, xOffset));

    // Calculate Scale needed to fill height
    // Container is 9:16. Video is 16:9.
    // To fill height, scale = 1 (if object-fit was cover, but it is contain in component?)
    // In component: `className="absolute inset-0 w-full h-full object-contain"`
    // So video fits inside. For 9:16 container, 16:9 video will define width and leave gaps top/bottom?
    // Wait, 16:9 video in 9:16 container:
    // Video will fit WIDTH (small), leaving huge gaps top/bottom.
    // To fill height, we need to scale up significantly.
    // Scale = ContainerHeight / VideoHeight
    // VideoHeight (rendered) = ContainerWidth / (16/9)
    // Scale = ContainerHeight / (ContainerWidth * 9/16)
    // Since ContainerHeight/ContainerWidth = 16/9
    // Scale = (16/9) / (9/16) = (16/9)^2 ≈ 3.16

    // Standard reframe usually implies "Cover" mode.
    // So we need a base scale that makes it cover.
    const baseScale = (16/9) / (9/16);

    return {
      x: clampedOffset,
      scale: baseScale // Apply this base scale + any tracking scale (tracking scale usually 1 unless zooming)
    };
  }, [reframeConfig, aspectRatio]);

  // Reload video when source URL changes (e.g., after dead air removal)
  // Using stable key + manual load() preserves the audio permission from user gesture
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !baseLayerUrl) return;
    if (loadedSrcRef.current !== baseLayerUrl) {
      if (loadedSrcRef.current) {
        console.log('[VideoPreview] Source changed, reloading video with audio');
        console.log('[VideoPreview] Old:', loadedSrcRef.current?.slice(-60));
        console.log('[VideoPreview] New:', baseLayerUrl.slice(-60));
      }
      video.src = baseLayerUrl;
      video.load();
      loadedSrcRef.current = baseLayerUrl;
    }
  }, [baseLayerUrl]);

  // Seek control for base video (only when paused/scrubbing)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || baseLayerClipTime === undefined) return;
    if (isPlaying) return;

    if (Math.abs(video.currentTime - baseLayerClipTime) > 0.1) {
      video.currentTime = baseLayerClipTime;
    }
  }, [baseLayerClipTime, isPlaying]);

  // Play/pause control for base video
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      console.log('[VideoPreview] Playing base video:', { src: video.src?.slice(-60), muted: video.muted, volume: video.volume, readyState: video.readyState, networkState: video.networkState });
      video.play().catch((err) => {
        console.error('[VideoPreview] Play failed:', err.name, err.message);
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  // Play/pause control for overlay videos (V2, V3, etc.)
  useEffect(() => {
    overlayVideoRefs.current.forEach((video) => {
      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    });
  }, [isPlaying]);

  // Sync overlay video and audio seeking when scrubbing
  useEffect(() => {
    if (isPlaying) return; // Don't interfere during playback

    // Find overlay video and audio layers and sync their time
    const overlayMediaLayers = layers.filter(
      l => (l.type === 'video' && l.trackId !== 'V1') || l.type === 'audio'
    );

    overlayMediaLayers.forEach((layer) => {
      const mediaEl = overlayVideoRefs.current.get(layer.id);
      if (mediaEl && layer.clipTime !== undefined) {
        if (Math.abs(mediaEl.currentTime - layer.clipTime) > 0.1) {
          mediaEl.currentTime = layer.clipTime;
        }
      }
    });
  }, [layers, isPlaying]);

  // Seek on load
  const handleLoaded = () => {
    if (videoRef.current && baseLayerClipTime !== undefined) {
      videoRef.current.currentTime = baseLayerClipTime;
    }
  };

  // Handle mouse down on draggable layer
  const handleLayerMouseDown = useCallback((e: React.MouseEvent, layer: ClipLayer) => {
    // Only allow dragging non-V1 layers (overlays)
    if (layer.trackId === 'V1') return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    setDraggingLayer(layer.id);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      layerX: layer.transform?.x || 0,
      layerY: layer.transform?.y || 0,
    });

    // Select this layer
    onLayerSelect?.(layer.id);
  }, [onLayerSelect]);

  // Handle mouse down on resize handle
  const handleResizeMouseDown = useCallback((e: React.MouseEvent, layer: ClipLayer) => {
    e.preventDefault();
    e.stopPropagation();

    setResizingLayer(layer.id);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      initialScale: layer.transform?.scale || (layer.trackId === 'V1' ? 1 : 0.2), // Default scale based on track
    });
  }, []);

  // Handle mouse move for dragging/resizing
  useEffect(() => {
    if (!draggingLayer && !resizingLayer) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingLayer && dragStart) {
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        const newX = dragStart.layerX + deltaX;
        const newY = dragStart.layerY + deltaY;

        onLayerMove?.(draggingLayer, newX, newY);
      } else if (resizingLayer && resizeStart) {
        // Calculate resize based on mouse movement (simplified uniform scaling)
        const deltaX = e.clientX - resizeStart.x;
        // Sensitivity factor
        const scaleChange = deltaX * 0.005;
        const newScale = Math.max(0.1, resizeStart.initialScale + scaleChange);

        onLayerResize?.(resizingLayer, newScale);
      }
    };

    const handleMouseUp = () => {
      setDraggingLayer(null);
      setDragStart(null);
      setResizingLayer(null);
      setResizeStart(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingLayer, dragStart, resizingLayer, resizeStart, onLayerMove, onLayerResize]);

  // Aspect ratio styles
  const isVertical = aspectRatio === '9:16';
  // Use object-cover to show full video with center cropping for vertical preview
  const videoFitClass = isVertical ? 'object-cover' : 'object-contain';

  // Container classes based on aspect ratio
  const containerClass = isVertical
    ? 'h-[65vh] w-auto aspect-[9/16]'  // Vertical: fixed height, width from aspect ratio
    : 'w-full max-w-4xl aspect-video';  // Horizontal: constrain width, height follows

  if (layers.length === 0) {
    return (
      <div className={`relative ${containerClass} bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex items-center justify-center`}>
        <div className="text-center text-zinc-600">
          <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No media to display</p>
        </div>
      </div>
    );
  }

  // Separate base video from overlay layers to prevent re-render issues
  const overlayLayers = useMemo(() =>
    sortedLayers.filter(l => !(l.trackId === 'V1' && l.type === 'video')),
    [sortedLayers]
  );

  // Apply reframe to V1 layer if active
  const reframeTransform = foundBaseLayer && foundBaseLayer.trackId === 'V1' && reframeConfig?.isEnabled
    ? getReframeTransform(foundBaseLayer.clipTime)
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative ${containerClass} bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10`}
    >
      {/* Base video layer (V1) - rendered separately for stability */}
      {foundBaseLayer && (
        <video
          key="base-video"
          ref={videoRef}
          src={foundBaseLayer.url}
          className={`absolute inset-0 w-full h-full ${videoFitClass}`}
          style={{
            zIndex: 1,
            // Apply reframe styles if enabled, otherwise regular styles
            ...getTransformStyles(foundBaseLayer.transform, 1, false, reframeTransform)
          }}
          playsInline
          preload="auto"
          onLoadedData={handleLoaded}
        />
      )}

      {/* Render overlay layers (V2+, images, captions) */}
      {overlayLayers.map((layer, index) => {
        const isOverlay = layer.trackId !== 'V1';
        const isDragging = draggingLayer === layer.id;
        const isResizing = resizingLayer === layer.id;
        const isSelected = selectedLayerId === layer.id;
        const styles = getTransformStyles(layer.transform, index + 2, isDragging);

        // Common wrapper for interactivity handles
        const renderHandles = (content: React.ReactNode) => {
          if (!isOverlay) return content;

          return (
            <div
              key={layer.id}
              className="absolute cursor-grab active:cursor-grabbing group/layer"
              style={{
                ...styles,
                width: layer.type === 'image' ? `${(layer.transform?.scale || 0.2) * 100}%` : 'auto',
                // For images, we position explicitly. For videos, styles handle it.
                // Reconciling the two approaches:
                // Video layers use full container size and transform origin for positioning.
                // Image layers currently use the "lower middle" default logic in the code below.
                // To support consistent resize handles, we need a consistent container.
              }}
              onMouseDown={(e) => handleLayerMouseDown(e, layer)}
            >
              {content}

              {/* Selection/Hover indicator */}
              {(isSelected || isDragging || isResizing) && (
                <>
                  <div className="absolute inset-0 ring-2 ring-brand-500 rounded-lg pointer-events-none" />

                  {/* Resize Handle - Bottom Right */}
                  <div
                    className="absolute -bottom-2 -right-2 w-6 h-6 bg-brand-500 rounded-full cursor-nwse-resize flex items-center justify-center shadow-lg z-50 hover:scale-110 transition-transform"
                    onMouseDown={(e) => handleResizeMouseDown(e, layer)}
                  >
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </>
              )}

              {/* Drag handle indicator */}
              {!isDragging && !isResizing && isSelected && (
                <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded text-white/70 pointer-events-none">
                  <Move className="w-3 h-3" />
                </div>
              )}
            </div>
          );
        };

        if (layer.type === 'video') {
          // For video overlays, we need to wrap differently because the video tag handles styles
          // But to add handles, we need a wrapper
          // Current implementation applies styles directly to video tag.
          // Let's wrap it for consistency if it's an overlay

          if (isOverlay) {
             // For overlay videos, use a wrapper div for positioning/transform
             // Remove styles from video and apply to wrapper

             // Video inside should fill the wrapper
             return renderHandles(
               <video
                 ref={(el) => {
                   if (el) overlayVideoRefs.current.set(layer.id, el);
                   else overlayVideoRefs.current.delete(layer.id);
                 }}
                 src={layer.url}
                 className="w-full h-full object-cover rounded-lg shadow-lg pointer-events-none"
                 playsInline
                 preload="auto"
                 muted
                 onLoadedData={(e) => {
                   const video = e.currentTarget;
                   if (layer.clipTime !== undefined) video.currentTime = layer.clipTime;
                   if (isPlaying) video.play().catch(() => {});
                 }}
               />
             );
          }

          return (
            <video
              key={`${layer.id}-${layer.url}`}
              ref={(el) => {
                if (el) {
                  overlayVideoRefs.current.set(layer.id, el);
                } else {
                  overlayVideoRefs.current.delete(layer.id);
                }
              }}
              src={layer.url}
              className={`absolute inset-0 w-full h-full ${videoFitClass} cursor-grab active:cursor-grabbing ${
                isSelected ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-black' : ''
              }`}
              style={styles}
              playsInline
              preload="auto"
              muted
              onLoadedData={(e) => {
                // Seek to correct time when loaded
                const video = e.currentTarget;
                if (layer.clipTime !== undefined) {
                  video.currentTime = layer.clipTime;
                }
                // Auto-play if timeline is playing
                if (isPlaying) {
                  video.play().catch(() => {});
                }
              }}
              onMouseDown={(e) => handleLayerMouseDown(e, layer)}
            />
          );
        }

        if (layer.type === 'image') {
          // For overlay images (V2, V3), use explicit sizing instead of fill-then-scale
          if (isOverlay) {
            // Re-calculate positioning logic to match what was there before
            // but now wrapped in renderHandles which applies the styles

            // The previous logic for image overlays:
            const scale = layer.transform?.scale || 0.2;
            const xOffset = layer.transform?.x || 0;
            const yOffset = layer.transform?.y || 0;
            const baseZIndex = (styles.zIndex as number) || 0;

            // We need to construct a style object that matches the previous behavior
            // but allows our wrapper to work.
            // Previous: width % based on scale, absolute positioning with calc()

            return (
              <div
                key={layer.id}
                className="absolute cursor-grab active:cursor-grabbing group/layer"
                style={{
                  width: `${scale * 100}%`,
                  top: `calc(70% + ${yOffset}px)`,
                  left: `calc(50% + ${xOffset}px)`,
                  transform: 'translateX(-50%)',
                  zIndex: baseZIndex + 100,
                  opacity: layer.transform?.opacity ?? 1,
                }}
                onMouseDown={(e) => handleLayerMouseDown(e, layer)}
              >
                <img
                  src={layer.url}
                  alt="Layer"
                  className="w-full h-auto rounded-lg shadow-lg pointer-events-none"
                  draggable={false}
                />

                {/* Selection indicator & Handles */}
                {(isSelected || isDragging || isResizing) && (
                  <>
                    <div className="absolute inset-0 ring-2 ring-brand-500 rounded-lg pointer-events-none" />

                    {/* Resize Handle */}
                    <div
                      className="absolute -bottom-2 -right-2 w-6 h-6 bg-brand-500 rounded-full cursor-nwse-resize flex items-center justify-center shadow-lg z-50 hover:scale-110 transition-transform"
                      onMouseDown={(e) => handleResizeMouseDown(e, layer)}
                    >
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </>
                )}

                {/* Drag handle indicator */}
                {!isDragging && !isResizing && isSelected && (
                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded text-white/70 pointer-events-none">
                    <Move className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          }

          // For V1 images (full background), use the original fill approach
          return (
            <div
              key={layer.id}
              className="absolute inset-0 w-full h-full"
              style={{ ...styles, pointerEvents: 'none' }}
            >
              <img
                src={layer.url}
                alt="Layer"
                className="w-full h-full object-contain pointer-events-none"
                draggable={false}
              />
            </div>
          );
        }

        if (layer.type === 'caption' && layer.captionWords && layer.captionStyle) {
          return (
            <CaptionRenderer
              key={layer.id}
              words={layer.captionWords}
              style={layer.captionStyle}
              currentTime={layer.clipTime}
            />
          );
        }

        // Audio layers - invisible but play audio synced to timeline
        if (layer.type === 'audio') {
          return (
            <audio
              key={`audio-${layer.id}`}
              ref={(el) => {
                if (el) {
                  overlayVideoRefs.current.set(layer.id, el as unknown as HTMLVideoElement);
                } else {
                  overlayVideoRefs.current.delete(layer.id);
                }
              }}
              src={layer.url}
              preload="auto"
              onLoadedData={(e) => {
                const audio = e.currentTarget;
                if (layer.clipTime !== undefined) {
                  audio.currentTime = layer.clipTime;
                }
                if (isPlaying) {
                  audio.play().catch(() => {});
                }
              }}
              style={{ display: 'none' }}
            />
          );
        }

        return null;
      })}

      {/* Layer count indicator */}
      {layers.length > 1 && (
        <div className="absolute top-3 left-3 text-xs text-white/60 bg-black/50 px-2 py-1 rounded flex items-center gap-1 z-50">
          <Layers className="w-3 h-3" />
          <span>{layers.length} layers</span>
        </div>
      )}

      {/* Type indicator */}
      <div className="absolute bottom-3 right-3 text-xs text-white/60 bg-black/50 px-2 py-1 rounded flex items-center gap-1 z-50">
        {baseVideoLayer ? <Play className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
        <span>{baseVideoLayer ? 'video' : layers[0]?.type}</span>
      </div>

      {/* Dragging/Resizing indicator */}
      {(draggingLayer || resizingLayer) && (
        <div className="absolute bottom-3 left-3 text-xs text-brand-400 bg-black/70 px-2 py-1 rounded z-50">
          {draggingLayer ? 'Dragging...' : 'Resizing...'}
        </div>
      )}
    </div>
  );
});

export default VideoPreview;
