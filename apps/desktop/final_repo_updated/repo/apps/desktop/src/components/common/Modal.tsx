import React from 'react';
import clsx from 'clsx';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

/**
 * Generic modal component with a title and content area. When
 * `isOpen` is false nothing is rendered. Clicking outside the modal
 * content or on the close button will invoke `onClose`.
 */
const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
}) => {
  if (!isOpen) return null;
  return (
    <div
      className={clsx(
        'fixed inset-0 z-40 flex items-center justify-center',
        'bg-black/30 backdrop-blur-sm',
      )}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-md shadow-lg max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <Button variant="ghost" onClick={onClose} className="p-0 text-gray-500">
            ×
          </Button>
        </div>
        <div className="p-4 space-y-4">{children}</div>
        {actions && (
          <div className="px-4 py-2 border-t flex justify-end space-x-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
