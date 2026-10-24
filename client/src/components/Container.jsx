import React from 'react';

/**
 * Reusable layout Container component for Collections by Chandni
 * Enforces responsive spatial padding and max-width boundaries.
 */
export default function Container({
  children,
  className = '',
  size = 'default',
  as: Component = 'div',
  ...props
}) {
  const sizeClasses = {
    narrow: 'max-w-4xl',
    default: 'max-w-7xl',
    wide: 'max-w-[1440px]',
    full: 'max-w-full',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.default;

  return (
    <Component
      className={`w-full mx-auto px-4 sm:px-6 lg:px-8 ${selectedSize} ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}
