import { lazy, ComponentType } from 'react';

/**
 * A wrapper around React.lazy that attempts to reload the page if the chunk fails to load.
 * This is particularly useful after a new deployment when the browser might still have
 * references to old (now non-existent) asset hashes.
 */
export function lazyWithRetry(componentImport: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      console.error('Lazy loading failed, attempting to reload the page:', error);

      // Check if we've already tried to reload to avoid infinite loops
      const hasReloaded = window.sessionStorage.getItem('lazy_retry_reloaded');

      if (!hasReloaded) {
        window.sessionStorage.setItem('lazy_retry_reloaded', 'true');
        window.location.reload();
        // Return a promise that never resolves to keep the UI in a loading state while the page refreshes
        return new Promise(() => {});
      }

      // If we already reloaded and it still fails, throw the error
      throw error;
    }
  });
}

// Clear the flag when the component finally loads successfully
export function clearLazyRetryFlag() {
  window.sessionStorage.removeItem('lazy_retry_reloaded');
}
