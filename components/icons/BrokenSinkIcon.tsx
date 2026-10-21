import React from 'react'

interface BrokenSinkIconProps extends React.SVGProps<SVGSVGElement> {
    className?: string
    size?: number | string
    variant?: 'parallel' | 'shifted' | 'lightning'
}

/**
 * Icono de Bacha / Semicírculo Quebrado exclusivo para FIRPLAK S.A.
 * Representa piezas no conformes, saldos y scrap/destrucción.
 * Diseñado con el medio círculo del lavamanos partido, separación física y línea divisoria roja.
 */
export const BrokenSinkIcon: React.FC<BrokenSinkIconProps> = ({
    className = "w-5 h-5",
    size,
    variant = 'parallel',
    ...props
}) => {
    if (variant === 'shifted') {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                width={size}
                height={size}
                {...props}
            >
                {/* Mitad Izquierda (Firme) */}
                <path d="M3 8h8" stroke="currentColor" />
                <path d="M3 8c0 5.5 3.5 10 8 10.5" stroke="currentColor" />
                {/* Cara de rotura izquierda */}
                <path d="M11 8l-2 3.5 2 3-1.5 4" stroke="#EF4444" strokeWidth="2.3" />
                
                {/* Mitad Derecha (Caída/Desplazada 2px) */}
                <g transform="translate(2, 2)">
                    <path d="M11 8h7" stroke="currentColor" opacity="0.85" />
                    <path d="M18 8c0 5-3 9-7 9.5" stroke="currentColor" opacity="0.85" />
                    <path d="M11 8l-2 3.5 2 3-1.5 4" stroke="#EF4444" strokeWidth="2.3" />
                </g>
            </svg>
        )
    }

    if (variant === 'lightning') {
        return (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={className}
                width={size}
                height={size}
                {...props}
            >
                <path d="M2.5 8h8" stroke="currentColor" />
                <path d="M2.5 8c0 6 4 10.5 8 11" stroke="currentColor" />
                <path d="M13.5 8H21.5" stroke="currentColor" />
                <path d="M21.5 8c0 6-4 10.5-8 11" stroke="currentColor" />
                <path d="M12 7l-2.5 4 3 3-2 5" stroke="#EF4444" strokeWidth="2.6" />
            </svg>
        )
    }

    // Default: 'parallel' (Brecha limpia semicircular simétrica con línea divisoria roja)
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            width={size}
            height={size}
            {...props}
        >
            {/* Mitad Izquierda (Cuerpo en currentColor / contraste) */}
            <path d="M3 8h7.5" stroke="currentColor" />
            <path d="M3 8c0 5.5 3.5 10 7.5 10.5" stroke="currentColor" />
            {/* Fisura Izquierda (Rojo vivo) */}
            <path d="M10.5 8l-2 3.5 2 3-1.5 4" stroke="#EF4444" strokeWidth="2.3" />
            
            {/* Mitad Derecha (Cuerpo en currentColor / contraste) */}
            <path d="M13.5 8H21" stroke="currentColor" />
            <path d="M21 8c0 5.5-3.5 10-7.5 10.5" stroke="currentColor" />
            {/* Fisura Derecha (Rojo vivo) */}
            <path d="M13.5 8l-2 3.5 2 3-1.5 4" stroke="#EF4444" strokeWidth="2.3" />
        </svg>
    )
}
