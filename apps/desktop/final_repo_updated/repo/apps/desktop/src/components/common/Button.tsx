import React from 'react';
import clsx from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}

/**
 * A simple button component with a handful of variants. Uses Tailwind
 * classes for styling. Additional props are passed through to the
 * underlying button element.
 */
const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  className,
  children,
  ...rest
}) => {
  const base =
    'inline-flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed';
  const variants: Record<string, string> = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button
      className={clsx(base, variants[variant], className)}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;
