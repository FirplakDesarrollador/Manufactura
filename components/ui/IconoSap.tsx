// Ícono de Consulta SAP: silueta del logo de SAP (trapecio con las letras) en un solo color. Usa currentColor,
// así toma el color de la app (azul Firplak en las tarjetas, blanco en el menú y al pasar el mouse).
export default function IconoSap({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            {/* Trapecio: arriba completo, el lado derecho baja en diagonal (como el logo) */}
            <path d="M1.5 5.5h21L13 18.5H1.5z" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
            <text x="2.9" y="14.6" fill="currentColor" stroke="none" fontSize="7.2" fontWeight={900}
                fontFamily="Montserrat, Arial, sans-serif" letterSpacing="-0.3">SAP</text>
        </svg>
    )
}
