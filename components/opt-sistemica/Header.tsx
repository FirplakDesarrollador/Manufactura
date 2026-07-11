'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface HeaderProps {
  title: string;
  subtitle: string;
  backUrl?: string; // Mantener propiedad por compatibilidad de tipos
  onBack?: () => void; // Mantener propiedad por compatibilidad de tipos
  userEmail?: string;
  actionButton?: React.ReactNode;
  showLogout?: boolean;
  onLogout?: () => void;
}

export default function Header({
  title,
  subtitle,
  userEmail,
  actionButton,
  showLogout = true,
  onLogout
}: HeaderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  // Estado para controlar qué acordeones de submenús están abiertos
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    'Control de Piso': false,
    'Calidad': false,
    'Sistema de Producción': false,
    'Mantenimiento': false
  });

  const toggleMenu = (menuKey: string) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuKey]: !prev[menuKey]
    }));
  };

  // Función para obtener la primera palabra del nombre del usuario a partir de su correo y capitalizarla
  const getFirstName = (email: string) => {
    if (!email) return '';
    const part = email.split('@')[0]; // Toma la parte previa al @ (ej. hector.chinchilla)
    const firstName = part.split('.')[0].split('-')[0]; // Toma el primer nombre antes de un punto o guion (ej. hector)
    return firstName.charAt(0).toUpperCase() + firstName.slice(1); // Capitaliza (ej. Hector)
  };

  return (
    <header className="relative z-50 bg-[#324354] border-b border-[#324354] shadow-md sticky top-0 font-sans w-full">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between relative">
        
        {/* Left Side: Navigation Menu Button & Title/Subtitle */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => setIsOpen(true)}
            className="group flex items-center justify-center w-10 h-10 text-white hover:text-slate-300 transition-colors cursor-pointer"
            title="Menú de Navegación"
          >
            <svg className="w-8 h-8 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-light text-white tracking-widest uppercase leading-none mb-1">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-[#F6F3EE]/70 font-medium tracking-wide leading-none">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Center: Firplak Logo */}
        <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 pointer-events-none hidden md:block">
          <img 
            src="/logo-firplak-clean.png" 
            alt="Firplak" 
            className="h-13 w-auto object-contain" 
          />
        </div>

        {/* Right Side: Welcome User (First Name only) */}
        <div className="flex items-center space-x-6 min-w-0 shrink-0">
          {actionButton && (
            <div className="shrink-0">
              {actionButton}
            </div>
          )}
          
          {userEmail && (
            <div className="text-right max-w-[200px] lg:max-w-[300px] min-w-0">
              <p className="text-xl sm:text-2xl font-semibold text-white truncate tracking-wide leading-none mb-1" title={userEmail}>
                {getFirstName(userEmail)}
              </p>
              <p className="text-xs sm:text-sm italic text-[#7B8E90] tracking-wider leading-none">
                Usuario
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Drawer Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer Container (Google Drive Style but Firplak branded) */}
      <div className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-[#1e293b] text-white z-50 shadow-2xl transform transition-transform duration-300 ease-out flex flex-col font-sans ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-700/60 flex items-center justify-between shrink-0">
          <div className="flex flex-col items-start gap-0">
            {/* Logo de Firplak nuevo (sin eslogan) */}
            <img 
              src="/logo-firplak-clean.png" 
              alt="Firplak" 
              className="h-9 w-auto object-contain -ml-[2px]" 
            />
            <span className="text-[10px] text-slate-400 tracking-[0.25em] uppercase font-bold leading-none ml-[2px]">
              Manufactura
            </span>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white cursor-pointer"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer Menu Items */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
          {[
            { label: 'Inicio', path: '/home', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            )},
            { 
              label: 'Control de Piso', 
              path: '/home/selection', 
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              ),
              subItems: [
                { label: 'Mármol Sintético', path: '/marmol' },
                { label: 'Muebles', path: '/muebles' },
                { label: 'Fibra de Vidrio', path: '/fibra' }
              ]
            },
            { 
              label: 'Calidad', 
              path: '/calidad', 
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
              subItems: [
                { label: 'Calidad MS', path: '/calidad/ms' },
                { label: 'Respuesta Rápida Calidad RRC', path: '/ficha-rcc' },
                { label: 'Criterios de Calidad', path: '/calidad/criterios' },
                { label: 'Plan de Vigilancia', path: '/calidad/vigilancia' },
                { label: 'QRQC Quick Response Quality Control', path: '/calidad/qrqc' }
              ]
            },
            { 
              label: 'Sistema de Producción', 
              path: '/sistema-produccion', 
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              ),
              subItems: [
                { label: 'HDT', path: '/hdt' },
                { label: 'Hora a Hora', path: '/hora-a-hora' },
                { label: 'OPT Operativa', path: '/opt' },
                { label: 'OPT Sistémica', path: '/opt-sistemica' },
                { label: 'Estadísticas del Sistema', path: '/estadisticas-produccion' },
                { label: 'Tarjetas Excelencia', path: '/tarjetas-excelencia' },
                { label: 'Bitácora', path: '/sistema-produccion/bitacora' },
                { label: 'Auditorías', path: '/sistema-produccion/auditorias' }
              ]
            },
            { 
              label: 'Mantenimiento', 
              path: '/mtto-autonomo', 
              icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
              ),
              subItems: [
                { label: 'Puestas a Punto', path: '/mtto-autonomo/puestas-a-punto' },
                { label: 'Tarjetas de Anomalías', path: '/mtto-autonomo/tarjetas-falla' },
                { label: 'Gestión de Mantenimiento', path: '#' },
                { label: 'Mantenimiento Autónomo LILAC', path: '/mtto-autonomo/lilac' },
                { label: 'Controles Visuales', path: '#' },
                { label: 'Lecciones LUP', path: '#' },
                { label: 'Principio de Máquina', path: '#' }
              ]
            },
            { label: 'Indicadores Productividad', path: '/indicadores-productividad', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            )},
            { label: 'Asistencia', path: '/asistencia', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            )},
            { label: 'Cultura', path: '/cultura', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )},
            { label: 'Inventarios', path: '/inventarios', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-14L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            )},
            { label: 'Consulta SAP', path: '/consulta-sap', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            )},
            { label: 'Configuración', path: '/configuracion', icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          ].map((item, idx) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedMenus[item.label] || false;

            return (
              <div key={idx} className="w-full">
                <div className="w-full flex items-stretch rounded-xl hover:bg-white/10 transition-all duration-300 text-slate-200 hover:text-white group">
                  {/* Zona Izquierda: Clic para Navegar al Módulo */}
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      router.push(item.path);
                    }}
                    className="flex-1 flex items-center gap-4 px-4 py-3 text-left font-medium text-sm cursor-pointer group-hover:text-white"
                  >
                    <div className="text-slate-400 group-hover:text-white transition-colors">
                      {item.icon}
                    </div>
                    <span>{item.label}</span>
                  </button>

                  {/* Zona Derecha: Flecha para desplegar submenú */}
                  {hasSubItems && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(item.label);
                      }}
                      className="px-4 hover:bg-white/20 rounded-r-xl transition-colors cursor-pointer shrink-0 flex items-center justify-center border-l border-white/5"
                      title={isExpanded ? "Colapsar submenú" : "Expandir submenú"}
                    >
                      <svg 
                        className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Submenu rendering */}
                {hasSubItems && isExpanded && (
                  <div className="pl-6 border-l border-slate-700/40 ml-6 mt-1 space-y-1 animate-slide-down">
                    {item.subItems!.map((sub, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => {
                          setIsOpen(false);
                          router.push(sub.path);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-all duration-300 text-slate-300 hover:text-white font-medium text-xs text-left cursor-pointer"
                      >
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Drawer Footer (User Info & Logout) */}
        {userEmail && (
          <div className="p-6 border-t border-slate-700/60 bg-slate-900/40 space-y-4 shrink-0">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Sesión Activa</span>
              <span className="text-xs font-semibold text-slate-300 truncate" title={userEmail}>
                {userEmail}
              </span>
            </div>
            {showLogout && onLogout && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 bg-[#7B8E90] hover:bg-[#6c7d7f] text-white rounded-xl transition font-semibold text-xs text-center cursor-pointer shadow-sm hover:shadow-md"
              >
                Cerrar Sesión
              </button>
            )}
          </div>
        )}
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #475569;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #475569 transparent;
        }
      `}</style>
    </header>
  );
}
