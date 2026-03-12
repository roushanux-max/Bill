import { useEffect } from 'react';
import { useBranding } from '../contexts/BrandingContext';

export default function UserThemeProvider({ children }: { children: React.ReactNode }) {
    const { settings } = useBranding();

    useEffect(() => {
        document.documentElement.classList.add('user-theme');
        return () => {
            document.documentElement.classList.remove('user-theme');
        };
    }, []);

    useEffect(() => {
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }

        metaThemeColor.setAttribute('content', settings.primaryColor);

        return () => {
            // Revert to Youtube Red default
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', '#FF0000');
            }
        };
    }, [settings.primaryColor]);

    return <>{children}</>;
}
