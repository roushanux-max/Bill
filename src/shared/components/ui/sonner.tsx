'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground group-[.toaster]:border-primary group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-primary-foreground/90',
          actionButton: 'group-[.toast]:bg-primary-foreground group-[.toast]:text-primary',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success:
            'group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground group-[.toaster]:border-primary',
          error:
            'group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground group-[.toaster]:border-primary',
          warning:
            'group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground group-[.toaster]:border-primary',
          info: 'group-[.toaster]:bg-primary group-[.toaster]:text-primary-foreground group-[.toaster]:border-primary',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
