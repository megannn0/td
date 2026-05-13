import React from 'react';
import ReactDOM from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Generic modal component rendered via a portal so it always appears
 * centered on the viewport regardless of parent stacking contexts.
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
}) => {
  if (!isOpen) return null;
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        className="rounded-xl shadow-2xl max-w-lg w-full mx-4"
        style={{ background: 'var(--fluent-bg-card, #fff)', border: '1px solid var(--fluent-border, #e0e0e0)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--fluent-border, #e0e0e0)' }}
        >
          <h3 className="text-base font-semibold" style={{ color: 'var(--fluent-text, #111)' }}>{title}</h3>
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition"
            style={{ width: 28, height: 28, color: 'var(--fluent-text, #111)' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
        {actions && (
          <div
            className="px-4 py-3 flex justify-end space-x-2"
            style={{ borderTop: '1px solid var(--fluent-border, #e0e0e0)' }}
          >
            {actions}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
