import { useState, useCallback } from 'react';
import type { File } from '../types/file';

type ClipboardMode = 'copy' | 'cut' | null;

interface ClipboardItem {
  file: File;
  mode: ClipboardMode;
}

let clipboardState: ClipboardItem | null = null;
let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function getClipboard(): ClipboardItem | null {
  return clipboardState;
}

export function useClipboard() {
  const [, setTick] = useState(0);

  const subscribe = useCallback(() => {
    const handler = () => setTick(t => t + 1);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter(h => h !== handler);
    };
  }, []);

  // Subscribe on mount
  useState(() => { subscribe(); });

  const copyToClipboard = useCallback((file: File, mode: ClipboardMode) => {
    clipboardState = { file, mode };
    notifyListeners();
  }, []);

  const clearClipboard = useCallback(() => {
    clipboardState = null;
    notifyListeners();
  }, []);

  return {
    clipboard: clipboardState,
    copyToClipboard,
    clearClipboard,
  };
}