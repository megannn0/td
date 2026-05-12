import React from 'react';

interface EmptyStateProps {
  message?: string;
  children?: React.ReactNode;
}

/**
 * A placeholder shown when no files or folders are present. Accepts
 * optional message and custom content (children) for more complex
 * empty states. Uses a neutral icon to indicate emptiness.
 */
const EmptyState: React.FC<EmptyStateProps> = ({ message, children }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <div className="text-5xl mb-2">📂</div>
      <div className="text-sm mb-2">{message || 'No items found'}</div>
      {children}
    </div>
  );
};

export default EmptyState;
