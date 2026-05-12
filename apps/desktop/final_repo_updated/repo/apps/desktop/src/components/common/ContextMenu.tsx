import React, { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
}

interface ContextMenuProps {
  /** Whether the menu is visible */
  isOpen: boolean;
  /** Screen coordinates where the menu should appear */
  position: { x: number; y: number };
  /** List of actions to display */
  items: ContextMenuItem[];
  /** Called when the menu should be closed */
  onClose: () => void;
}

/**
 * A simple context menu that appears at an absolute position with a
 * list of clickable actions. Clicking outside the menu or pressing
 * Escape will close it.  The menu does not attempt to scroll the
 * viewport; callers should ensure the position keeps the menu onscreen.
 */
const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, position, items, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    top: position.y,
    left: position.x,
  };

  return (
    <div
      ref={menuRef}
      style={style}
      className="bg-white border rounded shadow-md py-1 text-sm z-50"
    >
      {items.map((item, idx) => (
        <button
          key={idx}
          onClick={() => {
            onClose();
            item.onClick();
          }}
          className="block w-full text-left px-4 py-1 hover:bg-gray-100"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
};

export default ContextMenu;