import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

/**
 * A basic search input with inline styling. Use this component in
 * toolbars where searching is required. It forwards value and
 * change handler to allow controlled use.
 */
const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search…',
}) => {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring focus:border-blue-300"
    />
  );
};

export default SearchInput;
