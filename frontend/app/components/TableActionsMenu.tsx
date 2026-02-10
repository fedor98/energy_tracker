/**
 * TableActionsMenu Component
 *
 * A dropdown menu component for table row actions.
 * Displays a vertical three dots button that opens a popup menu
 * with Edit and Delete options when clicked.
 *
 * Features:
 * - Click outside to close
 * - Smooth animations
 * - Accessible keyboard navigation
 */

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface TableActionsMenuProps {
  date: string;
  onEdit: (date: string) => void;
  onDelete: (date: string) => void;
}

export function TableActionsMenu({ date, onEdit, onDelete }: TableActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  const handleEdit = () => {
    setIsOpen(false);
    onEdit(date);
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete(date);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Open actions menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 z-50 mt-1 w-32 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 origin-top-right animate-in fade-in duration-100"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="actions-menu"
        >
          <div className="py-1" role="none">
            <button
              onClick={handleEdit}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              role="menuitem"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
              role="menuitem"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
