/**
 * TableActionsMenu Component
 *
 * A dropdown menu component for table row actions using React Portal
 * and Floating UI for robust positioning.
 * Displays a vertical three dots button that opens a popup menu
 * with Edit and Delete options when clicked.
 *
 * Features:
 * - Click outside to close
 * - Smart flip and shift positioning with Floating UI
 * - Smooth scale animation
 * - Accessible keyboard navigation
 * - Portal-based rendering (always on top)
 */

import React, { useState } from 'react';
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  flip,
  shift,
  offset,
  FloatingFocusManager,
  FloatingPortal,
} from '@floating-ui/react';
import { autoUpdate } from '@floating-ui/dom';
import { MoreVertical, Edit2, Trash2 } from 'lucide-react';

interface TableActionsMenuProps {
  date: string;
  onEdit: (date: string) => void;
  onDelete: (date: string) => void;
}

export function TableActionsMenu({ date, onEdit, onDelete }: TableActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-end',
    middleware: [
      offset(4),
      flip({
        fallbackAxisSideDirection: 'end',
        padding: 8,
      }),
      shift({ padding: 8 }),
    ],
    whileElementsMounted: (reference, floating, update) => {
      const cleanup = autoUpdate(reference, floating, update);
      return cleanup;
    },
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const handleEdit = () => {
    setIsOpen(false);
    onEdit(date);
  };

  const handleDelete = () => {
    setIsOpen(false);
    onDelete(date);
  };

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Open actions menu"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      
      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={{
                ...floatingStyles,
                zIndex: 9999,
              }}
              {...getFloatingProps()}
              className="w-32 rounded-md shadow-lg bg-white ring-1 ring-gray-200 will-change-transform origin-top-right"
            >
              <div className="py-1 px-1" role="none">
                <button
                  onClick={handleEdit}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-md"
                  role="menuitem"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors rounded-md"
                  role="menuitem"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
}
