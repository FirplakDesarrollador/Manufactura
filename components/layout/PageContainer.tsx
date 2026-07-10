import React from 'react'

interface PageContainerProps extends React.HTMLAttributes<HTMLElement> {
    children: React.ReactNode;
    hasHeader?: boolean;
    hasFooter?: boolean;
    headerHeight?: string; // e.g. "80px" or "var(--header-height)"
    footerHeight?: string; // e.g. "80px" or "var(--footer-height)"
    className?: string;
    as?: 'main' | 'div' | 'section';
}

export default function PageContainer({
    children,
    hasHeader = true,
    hasFooter = false,
    headerHeight = "var(--header-height, 80px)",
    footerHeight = "var(--footer-height, 80px)",
    className = "",
    as = "main",
    style,
    ...props
}: PageContainerProps) {
    const Component = as;

    const containerStyle: React.CSSProperties = {
        // Variables locales para el cálculo dinámico en cascada
        "--header-height": hasHeader ? headerHeight : "0px",
        "--footer-height": hasFooter ? footerHeight : "0px",
        
        // Compensaciones de padding considerando Safe Area (notch y barras de sistema de iOS/Android)
        paddingTop: hasHeader 
            ? "calc(var(--header-height) + env(safe-area-inset-top, 0px))" 
            : "env(safe-area-inset-top, 0px)",
            
        paddingBottom: hasFooter 
            ? "calc(var(--footer-height) + env(safe-area-inset-bottom, 16px) + 24px)" 
            : "calc(env(safe-area-inset-bottom, 16px) + 24px)",
            
        // Flexbox layout fluido
        display: "flex",
        flexDirection: "column",
        flex: "1 1 0%",
        width: "100%",
        ...style
    } as React.CSSProperties;

    return (
        <Component 
            style={containerStyle} 
            className={`page-container ${className}`}
            {...props}
        >
            {children}
        </Component>
    );
}
