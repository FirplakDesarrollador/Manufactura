// Ícono de Desmanchado (redibujado de desmanchado-icono-gris-512.png): el molde visto de frente, el trapo que lo limpia
// y un destello de limpio. En SVG con currentColor para que cambie de color como los demás íconos del menú.
export default function IconoDesmanchado({ className = 'w-4 h-4' }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="2.5" y="5" width="14.5" height="13" rx="3.5" strokeWidth={1.9} />
            <rect x="6" y="8.5" width="7.5" height="6" rx="1.5" strokeWidth={1.9} />
            <circle cx="9.75" cy="11.5" r="1.3" fill="currentColor" stroke="none" />
            <path strokeLinecap="round" strokeWidth={1.9} d="M13.2 20.8c1-1.9 2.4-2.9 4.7-2.9h3.4" />
            <path fill="currentColor" stroke="none" d="M20.3 1c.35 2 1.05 2.7 3.2 3-2.15.3-2.85 1-3.2 3-.35-2-1.05-2.7-3.2-3 2.15-.3 2.85-1 3.2-3z" />
        </svg>
    )
}
