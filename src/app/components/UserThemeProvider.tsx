import { useEffect } from 'react';

export default function UserThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        document.documentElement.classList.add('user-theme');
        return () => {
            document.documentElement.classList.remove('user-theme');
        };
    }, []);

    return <>{children}</>;
}
