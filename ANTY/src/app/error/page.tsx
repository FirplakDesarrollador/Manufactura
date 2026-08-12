'use client'

import Link from 'next/link'

export default function ErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl text-center">
                <h2 className="text-3xl font-extrabold text-red-600">¡Algo salió mal!</h2>
                <p className="mt-2 text-sm text-gray-600">
                    Hubo un problema al intentar iniciar sesión. Por favor, verifica tus credenciales e inténtalo de nuevo.
                </p>
                <div className="mt-6">
                    <Link
                        href="/login"
                        className="text-indigo-600 hover:text-indigo-500 font-medium"
                    >
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    )
}
