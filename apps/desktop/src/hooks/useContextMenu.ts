import { useState, useCallback, useEffect } from "react";
import type React from "react";

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ visible: true, x: e.clientX, y: e.clientY });
  }, []);

  const close = useCallback(() => {
    setMenu((m) => ({ ...m, visible: false }));
  }, []);

  useEffect(() => {
    if (!menu.visible) return;
    const onDown = () => close();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    const onScroll = () => close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, [menu.visible, close]);

  return { menu, open, close };
}
