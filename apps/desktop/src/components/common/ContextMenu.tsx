import React from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  dividerBefore?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ isOpen, position, items, onClose }) => {
  if (!isOpen) return null;

  const top = Math.min(position.y, window.innerHeight - 280);
  const left = Math.min(position.x, window.innerWidth - 220);

  return (
    <>
      {/* Backdrop to close on click outside */}
      <div className="fixed inset-0 z-50" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-50 py-1 rounded-xl overflow-hidden"
        style={{
          top,
          left,
          minWidth: 180,
          background: '#ffffff',
          border: '1px solid #e0e0e0',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.08)',
        }}
      >
        {items.map((item, i) => (
          <React.Fragment key={i}>
            {(item.dividerBefore || item.separator) && (
              <div style={{ borderTop: '1px solid #e8e8e8', margin: '4px 0' }} />
            )}
            <button
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 14px',
                fontSize: 13,
                color: item.danger ? '#D93025' : item.disabled ? '#999999' : '#1a1a1a',
                cursor: item.disabled || !item.onClick ? 'default' : 'pointer',
                background: 'transparent',
                opacity: item.disabled ? 0.4 : 1,
              }}
              className="hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2"
              onClick={() => {
                if (!item.disabled && item.onClick) {
                  item.onClick();
                  onClose();
                }
              }}
            >
              {item.icon && <span className="w-4 text-center">{item.icon}</span>}
              {item.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </>
  );
};

export default ContextMenu;