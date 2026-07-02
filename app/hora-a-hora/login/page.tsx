import { login, signup } from './actions'

export default function LoginPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-white px-4 font-sans">
            <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.08)] border border-slate-100 text-black">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-primary">Bienvenido</h1>
                    <p className="mt-2 text-sm text-slate-500">Inicia sesión en tu cuenta</p>
                </div>

                <form className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                                Correo Electrónico
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-primary focus:border-primary outline-none transition-all"
                                placeholder="tu@email.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                                Contraseña
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="mt-1 block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-primary focus:border-primary outline-none transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            formAction={login}
                            className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-primary hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            formAction={signup}
                            className="w-full py-3 px-4 border border-slate-200 rounded-xl shadow-sm text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
                        >
                            Registrarse
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
