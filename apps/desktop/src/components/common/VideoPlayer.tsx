import React from 'react';

interface VideoPlayerProps {
  src: string;
  fileId: number;
  onWatched?: () => void;
}

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, fileId, onWatched }) => {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [speed, setSpeed] = React.useState<number>(1);
  const [metadataLoaded, setMetadataLoaded] = React.useState<boolean>(false);
  const [loadError, setLoadError] = React.useState<boolean>(false);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [canPlayThrough, setCanPlayThrough] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const watchedRef = React.useRef<boolean>(false);
  const metadataLoadedRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    setMetadataLoaded(false);
    setLoadError(false);
    setLoading(true);
    setCanPlayThrough(false);
    watchedRef.current = false;
    metadataLoadedRef.current = false;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!metadataLoadedRef.current) {
        setLoading(false);
        setLoadError(true);
      }
    }, 300000);

    const vid = videoRef.current;
    if (!vid) return;

    const handleLoadedMetadata = () => {
      metadataLoadedRef.current = true;
      setMetadataLoaded(true);
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      try {
        const saved = localStorage.getItem(`videoPosition_${fileId}`);
        if (saved) {
          const pos = parseFloat(saved);
          if (!isNaN(pos)) vid.currentTime = pos;
        }
      } catch {
        // ignore
      }
    };

    const handleCanPlayThrough = () => {
      setCanPlayThrough(true);
      setLoading(false);
    };

    const handleError = () => {
      setLoadError(true);
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };

    vid.addEventListener('loadedmetadata', handleLoadedMetadata);
    vid.addEventListener('canplaythrough', handleCanPlayThrough);
    vid.addEventListener('error', handleError);
    return () => {
      vid.removeEventListener('loadedmetadata', handleLoadedMetadata);
      vid.removeEventListener('canplaythrough', handleCanPlayThrough);
      vid.removeEventListener('error', handleError);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [src, fileId]);

  React.useEffect(() => {
    const handleTimeUpdate = () => {
      if (!videoRef.current) return;
      const pos = videoRef.current.currentTime;
      const duration = videoRef.current.duration;
      if (duration > 0 && onWatched && !watchedRef.current && pos / duration >= 0.95) {
        watchedRef.current = true;
        try { onWatched(); } catch { /* ignore */ }
      }
      try {
        localStorage.setItem(`videoPosition_${fileId}`, pos.toString());
      } catch { /* ignore */ }
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
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

  const handleRetry = () => {
    setLoadError(false);
    setLoading(true);
    setMetadataLoaded(false);
    setCanPlayThrough(false);
    metadataLoadedRef.current = false;
    const vid = videoRef.current;
    if (vid) {
      vid.load();
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (!metadataLoadedRef.current) {
        setLoading(false);
        setLoadError(true);
      }
    }, 300000);
  };

  const handleBrowserDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loadError) {
    return (
      <div className="p-4 text-center text-sm text-red-500 space-y-3">
        <div>Unable to preview this video.</div>
        <div className="flex justify-center gap-3">
          <button
            onClick={handleRetry}
            className="text-blue-600 hover:underline text-xs"
          >
            Retry
          </button>
          <button
            onClick={handleBrowserDownload}
            className="text-blue-600 hover:underline text-xs"
          >
            Download to view
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {loading && !metadataLoaded && (
        <div className="flex items-center justify-center p-4 text-sm text-gray-500">
          <svg className="animate-spin h-5 w-5 mr-2 text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading video…
        </div>
      )}
      <video
        ref={videoRef}
        src={src}
        controls
        preload="metadata"
        className={`w-full h-auto rounded-md ${loading && !metadataLoaded ? 'hidden' : ''}`}
      />
      {metadataLoaded && (
        <div className="flex items-center space-x-2 text-xs text-gray-700">
          <label htmlFor="speed-select">Speed:</label>
          <select
            id="speed-select"
            value={speed}
            onChange={handleSpeedChange}
            className="border rounded px-1"
          >
            {playbackRates.map((r) => (
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
