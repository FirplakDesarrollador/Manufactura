import React from 'react';

interface IconProps {
    className?: string;
    size?: number;
    color?: string;
}

// 1. Marmol Sintético: Marco con cubo/placa en perspectiva
export function MarmolSinteticoIcon({ className = '', size = 72, color = '#0099e5' }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Marco exterior */}
            <rect
                x="12"
                y="18"
                width="76"
                height="64"
                rx="6"
                stroke={color}
                strokeWidth="7"
                fill="none"
            />
            {/* Rectángulo interior inclinado / pileta */}
            <path
                d="M30 32L72 26L64 68L22 62Z"
                fill={color}
            />
        </svg>
    );
}

// 2. Fibra de Vidrio: Tina / Bañera con grifería
export function FibraDeVidrioIcon({ className = '', size = 72, color = '#0099e5' }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Grifería con chorro */}
            <path
                d="M26 42V20C26 15 32 15 36 17L44 26C45 27 44 30 41 30H34V42"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M37 23L47 34"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
            />
            {/* Tina / Cuerpo de la bañera */}
            <rect
                x="14"
                y="43"
                width="72"
                height="8"
                rx="4"
                fill={color}
            />
            <path
                d="M18 51H82V59C82 72 71 80 50 80C29 80 18 72 18 59V51Z"
                fill={color}
            />
            {/* Patas de la bañera */}
            <path
                d="M26 80L23 88M74 80L77 88"
                stroke={color}
                strokeWidth="6"
                strokeLinecap="round"
            />
        </svg>
    );
}

// 3. Muebles: Mesa / Banco de trabajo de 4 patas
export function MueblesIcon({ className = '', size = 72, color = '#0099e5' }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Tablero superior con perspectiva */}
            <path
                d="M18 28H82L76 43H24L18 28Z"
                fill={color}
            />
            {/* Patas delanteras */}
            <path
                d="M27 43L20 74H28L34 43"
                fill={color}
            />
            <path
                d="M73 43L80 74H72L66 43"
                fill={color}
            />
            {/* Travesaño de refuerzo */}
            <rect
                x="28"
                y="58"
                width="44"
                height="5"
                rx="2"
                fill={color}
            />
        </svg>
    );
}

// 4. CEFI: Fábrica industrial con chimenea y ventanas
export function CefiIcon({ className = '', size = 72, color = '#0099e5' }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Silueta de fábrica */}
            <path
                d="M18 78V48L38 60V48L58 60V34H68V78H18Z"
                fill={color}
            />
            {/* Chimenea alta derecha */}
            <path
                d="M72 78V24H82V78H72Z"
                fill={color}
            />
            {/* Ventanas */}
            <rect x="26" y="65" width="6" height="6" rx="1" fill="white" />
            <rect x="42" y="65" width="6" height="6" rx="1" fill="white" />
            <rect x="58" y="65" width="6" height="6" rx="1" fill="white" />
        </svg>
    );
}

// 5. RTM: Círculo con red molecular / nodo de inyección
export function RtmIcon({ className = '', size = 72, color = '#0099e5' }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Círculo contenedor exterior */}
            <circle cx="50" cy="50" r="38" fill={color} />
            {/* Canales y nodos internos en blanco */}
            <path
                d="M50 22V44M50 44L34 66M50 44L66 66"
                stroke="white"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="50" cy="22" r="5" fill="white" />
            <circle cx="50" cy="46" r="6" fill="white" />
            <circle cx="33" cy="67" r="5" fill="white" />
            <circle cx="67" cy="67" r="5" fill="white" />
            {/* Refuerzo de nodos inferiores */}
            <path
                d="M33 67V78M67 78V67"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
            />
        </svg>
    );
}

// 6. Moldes: Bloque de molde de inyección / matriz
export function MoldesIcon({ className = '', size = 72, color = '#0099e5' }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Molde superior */}
            <path
                d="M20 25H80V42H66V33H34V42H20V25Z"
                fill={color}
            />
            {/* Molde inferior */}
            <path
                d="M20 58H34V67H66V58H80V75H20V58Z"
                fill={color}
            />
            {/* Cavidad / Núcleo central del molde */}
            <rect
                x="38"
                y="45"
                width="24"
                height="10"
                rx="3"
                fill={color}
            />
            {/* Guías de alineación / pines */}
            <rect x="23" y="42" width="4" height="16" rx="2" fill={color} />
            <rect x="73" y="42" width="4" height="16" rx="2" fill={color} />
        </svg>
    );
}

// 7. Pintura FV: Rodillo de pintura (Paint Roller)
export function PaintRollerIcon({ className = '', size = 72, color = '#0099e5' }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Rodillo horizontal con esquinas redondeadas */}
            <rect x="20" y="24" width="50" height="20" rx="5" fill={color} />
            {/* Brazo metálico derecho */}
            <path
                d="M70 34H78C81.3 34 84 36.7 84 40V48C84 51.3 81.3 54 78 54H42C38.7 54 36 56.7 36 60V64"
                stroke={color}
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            {/* Mango vertical */}
            <rect x="31" y="64" width="10" height="24" rx="3" fill={color} />
        </svg>
    );
}

// 8. Vaciado FV: Pistola de aspersión con spray
export function SprayGunIcon({ className = '', size = 72, color = '#0099e5' }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Cuerpo y boquilla de la pistola */}
            <path
                d="M26 28C26 23.6 29.6 20 34 20H56C60.4 20 64 23.6 64 28V36C64 39.5 61.5 42.4 58.2 43.5L46 48V76C46 80.4 42.4 84 38 84C33.6 84 30 80.4 30 76L26 50C26 48 27 46 28 44L26 36V28Z"
                fill={color}
            />
            {/* Gatillo */}
            <path
                d="M48 50C52 52 54 56 52 60"
                stroke={color}
                strokeWidth="5"
                strokeLinecap="round"
            />
            {/* Rayos de spray */}
            <rect x="70" y="23" width="8" height="4" rx="2" fill={color} transform="rotate(-20 70 23)" />
            <rect x="73" y="36" width="9" height="4" rx="2" fill={color} />
            <rect x="70" y="47" width="8" height="4" rx="2" fill={color} transform="rotate(20 70 47)" />
        </svg>
    );
}

// 9. Inspección FV: Tabla de verificación con lupa
export function ClipboardSearchIcon({ className = '', size = 72, color = '#0099e5' }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Clip superior */}
            <rect x="38" y="16" width="24" height="10" rx="3" fill={color} />
            {/* Marco de la tabla de notas */}
            <rect
                x="20"
                y="22"
                width="60"
                height="62"
                rx="8"
                stroke={color}
                strokeWidth="7"
                fill="none"
            />
            {/* Lupa (círculo y mango) */}
            <circle cx="56" cy="56" r="14" stroke={color} strokeWidth="6" fill="white" />
            <path
                d="M66 66L80 80"
                stroke={color}
                strokeWidth="7"
                strokeLinecap="round"
            />
        </svg>
    );
}

