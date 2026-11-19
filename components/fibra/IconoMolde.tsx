// Ícono de Moldes FV: la pieza (cúpula, la bañera en negativo) sentada sobre la placa base del molde.
// Se usa en el menú lateral y en el título del módulo Moldes para que sean iguales.
export default function IconoMolde({ className = 'w-4 h-4' }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15.5c0-4 3-6.5 7-6.5s7 2.5 7 6.5z" />
            <rect x="2.5" y="17.5" width="19" height="3" rx="1" strokeWidth={2} />
        </svg>
    )
}
