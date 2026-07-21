'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/ficha-rcc/supabaseClient';
import Link from 'next/link';
import { History, Plus, ShieldAlert, Users, BarChart3, Settings } from 'lucide-react';

export default function SubHeader() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContingenciasAuth, setIsContingenciasAuth] = useState(false);
  const [isAsistenciaAuth, setIsAsistenciaAuth] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermisos = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userEmail = session.user.email?.toLowerCase() || '';
      const { data: userData } = await supabase
        .from('usuarios')
        .select('permisos')
        .eq('correo', userEmail)
        .single();

      const permisos = userData?.permisos || {};
      const fichaPermisos = permisos.ficha_rcc;

      if (typeof fichaPermisos === 'object' && fichaPermisos !== null) {
        setIsAdmin(fichaPermisos.administrador === true);
        setIsContingenciasAuth(fichaPermisos.contingencias === true);
        setIsAsistenciaAuth(fichaPermisos.asistencia === true);
      }
      setLoading(false);
    };
    fetchPermisos();
  }, []);

  if (loading) {
    return <div style={{ height: '57px', background: '#ffffff', borderBottom: '1px solid #e2ded5' }}></div>;
  }

  const menuItems = [
    {
      label: 'Historial de Fichas',
      href: '/ficha-rcc/historial',
      icon: <History size={16} />,
      visible: true
    },
    {
      label: 'Nueva Ficha',
      href: '/ficha-rcc/fichas/crear',
      icon: <Plus size={16} />,
      visible: true
    },
    {
      label: 'Contingencias',
      href: '/ficha-rcc/contingencias',
      icon: <ShieldAlert size={16} />,
      visible: isContingenciasAuth
    },
    {
      label: 'Asistencia Diaria',
      href: '/ficha-rcc/asistencia',
      icon: <Users size={16} />,
      visible: isAsistenciaAuth
    },
    {
      label: 'Indicadores',
      href: '/ficha-rcc/asistencia/indicadores',
      icon: <BarChart3 size={16} />,
      visible: isAsistenciaAuth
    },
    {
      label: 'Administrador',
      href: '/ficha-rcc/admin',
      icon: <Settings size={16} />,
      visible: isAdmin
    }
  ];

  return (
    <div className="bg-white border-b border-[#e2ded5] py-1.5 px-3 shadow-sm relative z-30 w-full font-sans">
      <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
        {menuItems.filter(item => item.visible).map((item, idx) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/ficha-rcc/asistencia');
          return (
            <Link key={idx} href={item.href} style={{ textDecoration: 'none' }} className="flex-shrink-0">
              <button
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-[#324354] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            </Link>
          );
        })}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
