import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Reusable Button component for Collections by Chandni
 * Variants: primary (editorial dark stone), secondary (outline), ghost, accent (warm amber/ochre)
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  href,
  className = '',
  disabled = false,
  type = 'button',
  onClick,
  ...props
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const sizeClasses = {
    sm: 'text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-sm',
    md: 'text-sm uppercase tracking-wider px-6 py-2.5 rounded-sm',
    lg: 'text-base uppercase tracking-widest px-8 py-3.5 rounded-sm',
  };

  const variantClasses = {
    primary:
      'bg-stone-900 text-stone-50 hover:bg-stone-800 active:bg-stone-950 shadow-sm',
    secondary:
      'border border-stone-800 text-stone-900 bg-transparent hover:bg-stone-100 active:bg-stone-200',
    outline:
      'border border-stone-300 text-stone-700 bg-white hover:bg-stone-50 active:bg-stone-100',
    ghost:
      'text-stone-700 hover:text-stone-900 hover:bg-stone-100/70',
    accent:
      'bg-amber-700 text-white hover:bg-amber-800 active:bg-amber-900 shadow-sm',
  };

  const combinedClasses = `${baseClasses} ${sizeClasses[size] || sizeClasses.md} ${
    variantClasses[variant] || variantClasses.primary
  } ${className}`;

  if (to) {
    return (
      <Link to={to} className={combinedClasses} {...props}>
        {children}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={combinedClasses} {...props}>
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      className={combinedClasses}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
