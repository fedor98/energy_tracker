/**
 * AccordionSection Component
 *
 * A reusable accordion section that can be expanded/collapsed with smooth animations.
 * Used in the Setup Wizard to organize meter configuration by type
 * (Electricity, Water, Gas). Only one section should be open at a time.
 */

import React, { useRef, useEffect, useState } from 'react';

interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  badge?: number; // Shows count of configured meters
}

export function AccordionSection({
  title,
  icon,
  isOpen,
  onToggle,
  children,
  badge
}: AccordionSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(0);

  // Measure content height when it changes
  useEffect(() => {
    if (contentRef.current) {
      setHeight(contentRef.current.scrollHeight);
    }
  }, [children]);

  return (
    <div className={`border rounded-lg overflow-hidden mb-4 transition-all duration-300 ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}>
      {/* Accordion Header - Click to toggle */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-4 text-left transition-colors duration-300 ${
          isOpen ? 'bg-blue-50' : 'bg-white hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className={`font-semibold transition-colors duration-300 ${isOpen ? 'text-blue-900' : 'text-gray-700'}`}>
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <span className={`text-gray-400 text-xl transition-transform duration-500 ease-out ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          ▼
        </span>
      </button>

      {/* Accordion Content with smooth height transition */}
      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{
          maxHeight: isOpen ? `${height}px` : '0px',
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="p-4 bg-white border-t border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}
