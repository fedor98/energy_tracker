import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'default' | 'small';
}

export function Button({ 
  variant = 'primary', 
  size = 'default',
  className = '', 
  children, 
  ...props 
}: ButtonProps) {
  const baseClasses = 'btn inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variantClasses = {
    primary: 'btn-primary bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'btn-secondary bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500',
    danger: 'btn-danger bg-red-600 hover:bg-red-700 text-white focus:ring-red-500'
  };
  
  const sizeClasses = {
    default: 'px-4 py-2 rounded',
    small: 'px-2 py-1 text-sm rounded'
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
