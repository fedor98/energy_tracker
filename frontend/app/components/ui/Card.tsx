import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div 
      className={`card bg-white rounded-lg shadow-md p-6 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
