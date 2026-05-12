import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
}) => {
  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: 500,
    borderRadius: '8px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: '#0061FF',
      color: 'white',
    },
    secondary: {
      background: 'transparent',
      color: 'var(--db-text-primary)',
      border: '1px solid var(--db-border)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--db-text-secondary)',
    },
    danger: {
      background: '#D93025',
      color: 'white',
    },
  };

  const style: React.CSSProperties = {
    ...baseStyle,
    ...variants[variant],
  };

  return (
    <button
      type={type}
      style={style}
      disabled={disabled}
      onClick={onClick}
      className={className}
    >
      {children}
    </button>
  );
};

export default Button;