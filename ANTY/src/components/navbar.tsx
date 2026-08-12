'use client'

export default function Navbar() {
    return (
        <nav className="bg-[#0f172a] border-b border-white/5 fixed w-full z-40 top-0 shadow-xl backdrop-blur-md">
            <div className="px-4 py-4 lg:px-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img
                            src="https://www.firplak.com/wp-content/uploads/2023/09/logo-firplak-blanco.webp"
                            alt="Firplak Logo"
                            className="h-8 md:h-10 w-auto object-contain"
                        />
                        <div className="h-6 w-[1px] bg-white/20 mx-2 hidden sm:block"></div>
                        <span className="hidden sm:block text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase">
                            Maintenance System
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Anty Intelligence</span>
                            <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                <span className="text-white text-xs font-medium">Online</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}
