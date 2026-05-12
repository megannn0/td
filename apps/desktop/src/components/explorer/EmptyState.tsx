import React from 'react';

interface EmptyStateProps {
  message: string;
  children?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message, children }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4" style={{ background: 'var(--db-bg)' }}>
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--db-text-tertiary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
      <div className="text-sm font-medium" style={{ color: 'var(--db-text-secondary)' }}>{message}</div>
      {children && <div>{children}</div>}
    </div>
  );
};

export default EmptyState;