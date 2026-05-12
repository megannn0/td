import React from 'react';

/**
 * A simple spinner using Tailwind's animate-spin utility. Use this
 * component to indicate loading states.
 */
const Spinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={`animate-spin h-5 w-5 text-blue-600 ${className || ''}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    ></path>
  </svg>
);

export default Spinner;
