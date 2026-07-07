'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function MttoHomePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setLoading(false)
    }
    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
      </div>
    )
  }

  const modules = [
    { 
      title: "Puestas a Punto", 
      path: "/mtto-autonomo/puestas-a-punto", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M228.87,83.14a28,28,0,0,0-12-16.05L202,57.17a36,36,0,0,0-62.83-9.59l-19,25.32a36,36,0,0,0-10,34.4l-64.8,64.8a28,28,0,0,0,0,39.6l10.61,10.61a28,28,0,0,0,39.6,0l64.8-64.8a36,36,0,0,0,34.4-10l25.32-19A36,36,0,0,0,228.87,83.14ZM92.11,205.51a12,12,0,0,1-17,0l-10.6-10.61a12,12,0,0,1,0-17L129.28,113a36,36,0,0,0,30.68,30.69ZM215.42,112.5l-25.31,19c-.3.23-.62.44-.94.65l-26.6-26.6a8,8,0,0,0-11.31,11.31l26.6,26.6q-.31.47-.65.94l-19,25.31a20,20,0,0,1-32.93-9c-2.48-9.88,1-20.15,8.81-26L143,124a8,8,0,0,0,0-11.32L116,85.64a8,8,0,0,0-11.31,0L95.8,94.5a20,20,0,0,1-26-8.81,20,20,0,0,1,9-32.93l25.32-19a20,20,0,0,1,34.89,5.32L148.89,59a28,28,0,0,0,12,16.05A20,20,0,0,1,215.42,112.5Z"></path>
        </svg>
      )
    },
    { 
      title: "Tarjetas de Anomalías", 
      path: "/mtto-autonomo/tarjetas-falla", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M236.8,188.09,149.35,36.22h0a24.76,24.76,0,0,0-42.7,0L19.2,188.09a23.51,23.51,0,0,0,0,23.72A24.35,24.35,0,0,0,40.55,224h174.9a24.35,24.35,0,0,0,21.33-12.19A23.51,23.51,0,0,0,236.8,188.09ZM222.93,203.8a8.5,8.5,0,0,1-7.48,4.2H40.55a8.5,8.5,0,0,1-7.48-4.2,7.59,7.59,0,0,1,0-7.72L120.52,44.21a8.75,8.75,0,0,1,15,0l87.45,151.87A7.59,7.59,0,0,1,222.93,203.8ZM120,104v40a8,8,0,0,0,16,0V104a8,8,0,0,0-16,0Zm20,80a12,12,0,1,1-12-12A12,12,0,0,1,140,184Z"></path>
        </svg>
      )
    },
    {
      title: "Gestión de Mantenimiento",
      path: "#",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M224,96H192V88a24,24,0,0,0-24-24H88A24,24,0,0,0,64,88v8H32a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V112A16,16,0,0,0,224,96ZM80,88a8,8,0,0,1,8-8h80a8,8,0,0,1,8,8v8H80ZM224,208H32V112H224V208Z" />
        </svg>
      )
    },
    { 
      title: "Mantenimiento Autónomo", 
      subTitle: "LILAC",
      path: "/mtto-autonomo/lilac", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M168,144a8,8,0,0,1-8,8H120a8,8,0,0,1,0-16h40A8,8,0,0,1,168,144Zm-48,40h16a8,8,0,0,0,0-16H120a8,8,0,0,0,0,16ZM216,40V216a24,24,0,0,1-24,24H64a24,24,0,0,1-24-24V40A24,24,0,0,1,64,16H192A24,24,0,0,1,216,40Zm-16,0a8,8,0,0,0-8-8H64a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H192a8,8,0,0,0,8-8ZM96,96a12,12,0,1,1-12-12A12,12,0,0,1,96,96Zm0,48a12,12,0,1,1-12-12A12,12,0,0,1,96,144Zm0,48a12,12,0,1,1-12-12A12,12,0,0,1,96,192Zm72-104H120a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"></path>
        </svg>
      )
    },
    { 
      title: "Controles Visuales", 
      path: "#", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M247.31,124.76c-.35-.79-8.59-19.18-26.78-36.63C200.75,69,168.1,56,128,56S55.25,69,35.47,88.13C17.28,105.58,9,124,8.69,124.76a8,8,0,0,0,0,6.48c.35.79,8.59,19.18,26.78,36.63C55.25,187,87.9,200,128,200s72.75-13,92.53-32.13c18.19-17.45,26.43-35.84,26.78-36.63A8,8,0,0,0,247.31,124.76ZM128,184c-35.35,0-63.5-10.9-80.66-26.4C33.31,144.91,26.4,131.7,24.3,128c2.1-3.7,9-16.91,23.04-29.6C64.5,82.9,92.65,72,128,72s63.5,10.9,80.66,26.4C222.69,111.09,229.6,124.3,231.7,128c-2.1,3.7-9,16.91-23.04,29.6C191.5,173.1,163.35,184,128,184Zm0-94a38,38,0,1,0,38,38A38.05,38.05,0,0,0,128,90Zm0,60a22,22,0,1,1,22-22A22,22,0,0,1,128,150Z"></path>
        </svg>
      )
    },
    { 
      title: "Lecciones LUP", 
      path: "#", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Zm0,192a87.87,87.87,0,0,1-44.06-11.81,8,8,0,0,0-5.39-1l-36.14,12L54.46,180a8,8,0,0,0-1-5.39A88,88,0,1,1,128,216ZM144,112a16,16,0,1,1-16-16A16,16,0,0,1,144,112Z"></path>
        </svg>
      )
    },
    { 
      title: "Principio de Máquina", 
      path: "#", 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256">
          <path d="M226.71,137.45h0l-31.54,9.66a72,72,0,0,1,0,17.78l31.54,9.66a8,8,0,0,1,5.32,9.86l-13.66,42a8,8,0,0,1-9.42,5.55l-32.55-6A72.16,72.16,0,0,1,161,236.44l-6,32.55a8,8,0,0,1-5.55,6.42l-42-13.66a8,8,0,0,1-5-9.86v0l9.66-31.54a72,72,0,0,1-17.78,0L84.69,251.89a8,8,0,0,1-9.86,5.32l-42-13.66A8,8,0,0,1,27.3,234.13l6-32.55A72.16,72.16,0,0,1,18,186.1l-32.55,6a8,8,0,0,1-6.42-5.55l-13.66-42a8,8,0,0,1,5-9.86v0l31.54-9.66a72,72,0,0,1,0-17.78l-31.54-9.66a8,8,0,0,1-5.32-9.86l13.66-42A8,8,0,0,1-6.72,40L25.83,46a72.16,72.16,0,0,1,15.42-15.42l-6-32.55A8,8,0,0,1,40.8-8.38l42,13.66a8,8,0,0,1,5,9.86v0l-9.66,31.54a72,72,0,0,1,17.78,0l9.66-31.54a8,8,0,0,1,9.86-5.32l42,13.66a8,8,0,0,1,6.42,9.42l-6,32.55A72.16,72.16,0,0,1,173.28,81.3l32.55-6a8,8,0,0,1,6.42,5.55l13.66,42A8,8,0,0,1,226.71,137.45ZM128,88a40,40,0,1,0,40,40A40,40,0,0,0,128,88Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,152Z"></path>
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] selection:bg-[#324354] selection:text-white">
      {/* Header */}
      <header className="relative z-50 bg-[#324354] border-b border-[#324354] shadow-md sticky top-0">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/home')}
              className="group flex items-center justify-center w-11 h-11 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 rounded-xl transition-all duration-300 shadow-sm"
              title="Volver al Inicio"
            >
              <svg className="w-5 h-5 text-[#F6F3EE] group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-light text-white tracking-widest uppercase">
                Mantenimiento
              </h1>
              <p className="text-xs sm:text-sm text-[#F6F3EE]/70 font-medium tracking-wide">Módulo Operativo</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 md:p-12 lg:p-16">
        <div className="w-full max-w-[1600px] flex flex-wrap justify-center gap-6 md:gap-8">
          {modules.map((mod, index) => (
             <button
                 key={index}
                 onClick={() => mod.path !== '#' && router.push(mod.path)}
                 className="relative w-full max-w-[260px] aspect-[4/3] flex flex-col items-center justify-center p-6 bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] hover:shadow-[0_20px_40px_-15px_rgba(50,67,84,0.12)] hover:border-[#324354]/20 hover:-translate-y-2 transition-all duration-500 group overflow-hidden"
             >
                 <div className="absolute -top-12 -right-12 w-32 h-32 bg-slate-50 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                 
                 <div className="relative z-10 w-16 h-16 bg-[#F6F3EE] border border-[#e2ded5] rounded-2xl flex items-center justify-center mb-5 group-hover:bg-[#324354] group-hover:border-[#324354] group-hover:scale-110 transition-all duration-500 shadow-sm group-hover:shadow-lg">
                     <div className="text-[#324354] group-hover:text-white transition-colors duration-500">
                         {mod.icon}
                     </div>
                 </div>
                 <span className="relative z-10 text-lg font-bold text-gray-700 group-hover:text-[#324354] transition-colors duration-300 text-center leading-tight">
                     {mod.title}
                     {mod.subTitle && (
                         <span className="block text-xs md:text-sm font-normal italic text-gray-400 group-hover:text-gray-500 mt-1 transition-colors duration-300">{mod.subTitle}</span>
                     )}
                 </span>
             </button>
          ))}
        </div>
      </main>
    </div>
  )
}
