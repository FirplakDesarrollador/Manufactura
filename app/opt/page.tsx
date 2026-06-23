import Link from 'next/link'
import Image from 'next/image'
import { FolderClock, CirclePlus, BarChart3, RotateCw } from 'lucide-react'

export default function OptMenuPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-4xl mx-auto p-6">

        {/* Logo OPT Area */}
        <div className="flex justify-center mb-0">
          <Image
            src="/LOGO OPT.png"
            alt="OPT Logo"
            width={280}
            height={100}
            className="w-full max-w-[320px] h-auto object-contain"
          />
        </div>

        {/* Navigation Cards Section */}
        <div className="w-full flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-4">
          
          {/* Histórico */}
          <Link
            href="/observations/opt"
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-50 flex flex-col items-center gap-4 w-full max-w-[160px] aspect-square transition-all hover:scale-105 active:scale-95 group hover:border-[#254153]"
          >
            <div className="flex-1 flex items-center justify-center">
              <FolderClock size={52} className="text-[#254153] group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-gray-500 font-medium text-sm">Histórico</span>
          </Link>

          {/* Nuevo */}
          <Link
            href="/observations/opt/new"
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-50 flex flex-col items-center gap-4 w-full max-w-[160px] aspect-square transition-all hover:scale-105 active:scale-95 group hover:border-[#254153]"
          >
            <div className="flex-1 flex items-center justify-center">
              <CirclePlus size={52} className="text-[#254153] group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-gray-500 font-medium text-sm">Nuevo</span>
          </Link>

          {/* Estadísticas */}
          <Link
            href="/observations/opt/statistics"
            className="bg-white p-6 rounded-2xl shadow-lg border border-gray-50 flex flex-col items-center gap-4 w-full max-w-[160px] aspect-square transition-all hover:scale-105 active:scale-95 group hover:border-[#254153]"
          >
            <div className="flex-1 flex items-center justify-center">
              <BarChart3 size={52} className="text-[#254153] group-hover:text-blue-600 transition-colors" strokeWidth={1.5} />
            </div>
            <span className="text-gray-500 font-medium text-sm">Estadísticas</span>
          </Link>

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full flex justify-between items-end p-8 text-[#254153]">
        <div className="w-10" /> {/* Symmetry spacer */}
        <Link href="/home" className="transition-all hover:rotate-180 duration-700 active:scale-90 text-[#254153]/80 hover:text-[#254153]">
          <RotateCw size={44} strokeWidth={2.5} />
        </Link>
      </footer>
    </main>
  )
}
