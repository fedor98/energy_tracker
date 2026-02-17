/**
 * useToast Hook - Convenient access to toast notifications
 * 
 * Usage:
 * const toast = useToast();
 * toast.success('Operation completed successfully');
 * toast.error('Something went wrong');
 * toast.info('Here is some information');
 */

import { useToastContext } from '../components/toast';

export function useToast() {
  return useToastContext();
}
