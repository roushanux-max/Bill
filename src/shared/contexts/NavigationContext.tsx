import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';

interface NavigationContextType {
  previousPath: string | null;
  smartBack: (fallbackPath?: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const historyStack = useRef<string[]>([]);
  const lastPathRef = useRef<string | null>(null);

  // Initialize from sessionStorage to survive refreshes
  useEffect(() => {
    const savedStack = sessionStorage.getItem('bill_nav_history');
    if (savedStack) {
      try {
        historyStack.current = JSON.parse(savedStack);
      } catch (e) {
        historyStack.current = [];
      }
    }
    // Set initial lastPath
    lastPathRef.current = window.location.pathname + window.location.search;
  }, []);

  // Persist stack to sessionStorage
  const saveStack = () => {
    sessionStorage.setItem('bill_nav_history', JSON.stringify(historyStack.current));
  };

  const isNavigatingBack = useRef(false);

  useEffect(() => {
    const currentPath = location.pathname + location.search;

    if (navigationType === 'PUSH') {
      if (lastPathRef.current && lastPathRef.current !== currentPath) {
        if (isNavigatingBack.current) {
          isNavigatingBack.current = false;
        } else {
          // Avoid pushing duplicates or redundant entries
          if (historyStack.current[historyStack.current.length - 1] !== lastPathRef.current) {
            historyStack.current.push(lastPathRef.current);
            if (historyStack.current.length > 20) {
              historyStack.current.shift();
            }
            saveStack();
          }
        }
      }
    } else if (navigationType === 'REPLACE') {
        // When replacing, we don't push anything to the stack
        isNavigatingBack.current = false; 
    } else if (navigationType === 'POP') {
        // POP means we've gone back (or forward) via browser history
        const prev = historyStack.current[historyStack.current.length - 1];
        if (prev === currentPath) {
            historyStack.current.pop();
            saveStack();
        }
    }

    lastPathRef.current = currentPath;
  }, [location.pathname, location.search, navigationType]);

  const smartBack = (fallbackPath: string = '/dashboard') => {
    const stack = [...historyStack.current];
    const prev = stack.pop();

    if (prev) {
      historyStack.current = stack;
      saveStack();
      isNavigatingBack.current = true;
      navigate(prev);
    } else {
      navigate(fallbackPath);
    }
  };

  return (
    <NavigationContext.Provider value={{ 
      previousPath: historyStack.current[historyStack.current.length - 1] || null,
      smartBack 
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
