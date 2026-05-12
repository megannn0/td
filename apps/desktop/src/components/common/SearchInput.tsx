import React, { useRef } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onClick={() => inputRef.current?.focus()}
      className="flex items-center rounded-lg px-2.5 py-1.5"
      style={{
        background: 'var(--db-bg-secondary)',
        border: '1px solid var(--db-border)',
        minWidth: 200,
      }}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--db-text-tertiary)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mr-2 flex-shrink-0"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        placeholder="Search files…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent border-none outline-none text-sm w-full"
        style={{ color: 'var(--db-text-primary)' }}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="p-0.5 rounded flex-shrink-0 hover:bg-black/10 dark:hover:bg-white/10 transition"
          style={{ color: 'var(--db-text-tertiary)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SearchInput;