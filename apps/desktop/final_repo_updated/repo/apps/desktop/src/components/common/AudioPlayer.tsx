import React from 'react';
import type { Playlist, PlaylistItem } from '../../types/playlist';
import { getStreamUrl } from '../../api/files';

interface AudioPlayerProps {
  /** Playlist to play. The player will iterate through this list. */
  playlist: Playlist;
  /** Index of the item to start playback from. */
  startIndex?: number;
  /** Called when the playlist finishes and there is no repeat. */
  onFinish?: () => void;
}

/**
 * A basic audio player component supporting play/pause, next/prev,
 * shuffle, and repeat modes. This player does not render a complex
 * waveform; it simply wraps the native `<audio>` element and
 * exposes common transport controls. The playlist prop allows
 * sequential playback of multiple tracks.
 */
const AudioPlayer: React.FC<AudioPlayerProps> = ({ playlist, startIndex = 0, onFinish }) => {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [index, setIndex] = React.useState<number>(startIndex);
  const [isPlaying, setIsPlaying] = React.useState<boolean>(false);
  const [shuffle, setShuffle] = React.useState<boolean>(false);
  const [repeat, setRepeat] = React.useState<'none' | 'one' | 'all'>('none');
  const items: PlaylistItem[] = playlist.items || [];

  // Derive current item
  const currentItem = items[index];
  const currentSrc = currentItem ? getStreamUrl(currentItem.file_id) : '';

  // Play or pause when isPlaying changes
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, index]);

  // Handle end of track
  const handleEnded = () => {
    if (repeat === 'one') {
      // Restart current track
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        void audioRef.current.play().catch(() => {});
      }
      return;
    }
    // Determine next index
    let nextIndex: number | null = null;
    if (shuffle) {
      if (items.length > 1) {
        // Pick a random index different from current
        const pool = items.map((_, i) => i).filter((i) => i !== index);
        nextIndex = pool[Math.floor(Math.random() * pool.length)];
      } else {
        nextIndex = 0;
      }
    } else {
      if (index < items.length - 1) {
        nextIndex = index + 1;
      } else if (repeat === 'all') {
        nextIndex = 0;
      }
    }
    if (nextIndex !== null) {
      setIndex(nextIndex);
      setIsPlaying(true);
    } else {
      // End of playlist
      setIsPlaying(false);
      if (onFinish) onFinish();
    }
  };

  const playPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const next = () => {
    if (items.length === 0) return;
    let nextIndex = index + 1;
    if (nextIndex >= items.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        // no more items
        return;
      }
    }
    setIndex(nextIndex);
    setIsPlaying(true);
  };

  const prev = () => {
    if (items.length === 0) return;
    let prevIndex = index - 1;
    if (prevIndex < 0) {
      if (repeat === 'all') {
        prevIndex = items.length - 1;
      } else {
        return;
      }
    }
    setIndex(prevIndex);
    setIsPlaying(true);
  };

  // Update audio element source when index changes
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.load();
    if (isPlaying) {
      void audio.play().catch(() => {});
    }
  }, [currentSrc]);

  return (
    <div className="w-full bg-gray-50 p-2 border-t flex items-center space-x-2">
      <button
        onClick={prev}
        disabled={items.length === 0}
        className="px-2 py-1 text-sm bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
      >
        ◀
      </button>
      <button
        onClick={playPause}
        disabled={items.length === 0}
        className="px-2 py-1 text-sm bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <button
        onClick={next}
        disabled={items.length === 0}
        className="px-2 py-1 text-sm bg-white border rounded hover:bg-gray-100 disabled:opacity-50"
      >
        ▶
      </button>
      <button
        onClick={() => setShuffle((s) => !s)}
        className={`px-2 py-1 text-sm border rounded ${shuffle ? 'bg-blue-100' : 'bg-white'} hover:bg-gray-100`}
      >
        🔀
      </button>
      <button
        onClick={() =>
          setRepeat((r) => (r === 'none' ? 'one' : r === 'one' ? 'all' : 'none'))
        }
        className={`px-2 py-1 text-sm border rounded ${repeat !== 'none' ? 'bg-blue-100' : 'bg-white'} hover:bg-gray-100`}
      >
        {repeat === 'none' ? '⏹' : repeat === 'one' ? '🔁1' : '🔁'}
      </button>
      {/* Display current track name */}
      <div className="flex-1 truncate text-sm text-gray-700">
        {currentItem?.file?.name || ''}
      </div>
      <audio
        ref={audioRef}
        src={currentSrc}
        onEnded={handleEnded}
        className="hidden"
      />
    </div>
  );
};

export default AudioPlayer;