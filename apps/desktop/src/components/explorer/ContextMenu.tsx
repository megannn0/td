import React from "react";

export interface ContextMenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  disabled?: boolean;
  dividerBefore?: boolean;
  onClick?: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, items, onClose }) => {
  const top = Math.min(y, window.innerHeight - 280);
  const left = Math.min(x, window.innerWidth - 200);

  return (
    <div
      style={{ position: "fixed", top, left, zIndex: 9999 }}
      className="bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px] text-sm"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {item.dividerBefore && <div className="border-t border-gray-100 my-1" />}
          <button
            className={[
              "w-full text-left px-3 py-1.5 flex items-center gap-2",
              item.disabled || !item.onClick
                ? "text-gray-300 cursor-default"
                : item.danger
                ? "text-red-600 hover:bg-red-50"
                : "text-gray-700 hover:bg-gray-100",
            ].join(" ")}
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
  );
};

export default ContextMenu;
