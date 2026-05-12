import React from 'react';

interface VideoPlayerProps {
  /** URL of the video stream to play. */
  src: string;
  /** Unique identifier of the file for localStorage position persistence. */
  fileId: number;
  /** Callback fired when 95% of the video has been watched. */
  onWatched?: () => void;
}

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

/**
 * A video player with custom controls for selecting playback speed and
 * persisting playback position across sessions. This component wraps
 * the native `<video>` element and exposes a playback speed selector.
 */
const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, fileId, onWatched }) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [speed, setSpeed] = React.useState<number>(1);
  // Track whether metadata has been loaded and whether an error has
  // occurred.  These flags control fallback rendering when streaming
  // fails or takes too long.
  const [metadataLoaded, setMetadataLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<boolean>(false);
  // Timeout for detecting failed metadata load
  const timeoutRef = React.useRef<NodeJS.Timeout | number | null>(null);

  // Ref to track whether the `onWatched` callback has already been invoked.
  // This ensures the callback fires only once when 95% of the video
  // has been viewed and avoids mutating the `onWatched` prop.
  const watchedRef = React.useRef<boolean>(false);

  // When the src changes, reset state and set a timeout to mark an
  // error if metadata does not load within a few seconds.  Also
  // attach listeners for loadedmetadata and error events.
  React.useEffect(() => {
    setMetadataLoaded(false);
    setLoadError(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current as any);
    }
    // Fallback after 5 seconds if metadata does not load
    timeoutRef.current = setTimeout(() => {
      setLoadError(true);
    }, 5000);

    const vid = videoRef.current;
    if (!vid) return;
    const handleLoadedMetadata = () => {
      setMetadataLoaded(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as any);
      }
      // Restore saved position when metadata is loaded
      try {
        const saved = localStorage.getItem(`videoPosition_${fileId}`);
        if (saved) {
          const pos = parseFloat(saved);
          if (!isNaN(pos)) {
            vid.currentTime = pos;
          }
        }
      } catch {
        // ignore
      }
    };
    const handleError = () => {
      setLoadError(true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as any);
      }
    };
    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    vid.addEventListener('error', handleError);
    return () => {
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
      vid.removeEventListener('error', handleError);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current as any);
      }
    };
  }, [src, fileId]);

  // Save playback position periodically and fire the `onWatched` callback
  // exactly once when 95% of the video has been viewed. We use a
  // ref to track whether the callback has been invoked rather than
  // mutating the prop.
  React.useEffect(() => {
    const handleTimeUpdate = () => {
      if (!videoRef.current) return;
      const pos = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      if (duration > 0) {
        // Invoke callback once when the video has been watched beyond 95%.
        if (onWatched && !watchedRef.current && pos / duration >= 0.95) {
          watchedRef.current = true;
          try {
            onWatched();
          } catch {
            // ignore callback errors
          }
        }
      }
      try {
        localStorage.setItem(`videoPosition_${fileId}`, pos.toString());
      } catch {
        // ignore storage errors
      }
    };
    const vid = videoRef.current;
    if (vid) {
      vid.addEventListener('timeupdate', handleTimeUpdate);
      return () => vid.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [fileId, onWatched]);

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = parseFloat(e.target.value);
    setSpeed(value);
    if (videoRef.current) {
      videoRef.current.playbackRate = value;
    }
  };

  // Render fallback if metadata fails to load or an error occurred
  if (loadError) {
    return (
      <div className="p-4 text-center text-sm text-red-500">
        Unable to preview this video. Download to view.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <video
        ref={videoRef}
        src={src}
        controls
        className="w-full h-auto rounded-md"
      />
      <div className="flex items-center space-x-2 text-sm">
        <span>Speed:</span>
        <select
          className="border rounded px-1 py-0.5 text-sm"
          value={speed}
          onChange={handleSpeedChange}
        >
          {playbackRates.map((rate) => (
            <option key={rate} value={rate}>
              {rate}x
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default VideoPlayer;