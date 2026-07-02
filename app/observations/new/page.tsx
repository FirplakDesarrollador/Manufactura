import Link from 'next/link'

export default function NewObservationPage() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 dark:bg-gray-900">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col gap-8 text-center">
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                    Nueva Observación
                </h1>
                <p className="text-xl text-gray-500 dark:text-gray-400">
                    Esta es la página para crear una nueva observación (Placeholder).
                </p>
                <Link
                    href="/"
                    className="rounded-full border border-solid border-gray-300 transition-colors flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-sm sm:text-base h-10 sm:h-12 px-8 py-2 font-medium"
                >
                    Volver al Inicio
                </Link>
            </div>
        </main>
    )
}
