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

    const inlineStyle: React.CSSProperties = {
        // Redefinimos las variables CSS para que las clases CSS utilitarias las usen si son provistas
        ...(hasHeader ? { "--header-height": headerHeight } : {}),
        ...(hasFooter ? { "--footer-height": footerHeight } : {}),
        
        // Flexbox layout fluido (quitamos flex: 1 1 0% para evitar restricción de scroll)
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        width: "100%",
        ...style
    } as React.CSSProperties;

    const headerClass = hasHeader ? "page-container-header" : "page-container-no-header";
    const footerClass = hasFooter ? "page-container-footer" : "page-container-no-footer";

    return (
        <Component 
            style={inlineStyle} 
            className={`page-container ${headerClass} ${footerClass} ${className}`}
            {...props}
        >
            {children}
        </Component>
    );
}
