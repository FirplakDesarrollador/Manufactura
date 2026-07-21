'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { History, Plus, BarChart3, BookOpen, ClipboardCheck } from 'lucide-react';

export default function SubHeader() {
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Historial',
      href: '/hora-a-hora/historico',
      icon: <History size={16} />,
      visible: true
    },
    {
      label: 'Nuevo',
      href: '/hora-a-hora/nueva-evaluacion',
      icon: <Plus size={16} />,
      visible: true
    },
    {
      label: 'Indicadores',
      href: '/hora-a-hora/estadisticas',
      icon: <BarChart3 size={16} />,
      visible: true
    },
    {
      label: 'Guía',
      href: '/hora-a-hora/guia',
      icon: <BookOpen size={16} />,
      visible: true
    },
    {
      label: 'Criterios de Calificación',
      href: '/hora-a-hora/criterios',
      icon: <ClipboardCheck size={16} />,
      visible: true
    }
  ];

  return (
    <div className="bg-white border-b border-[#e2ded5] py-1.5 px-3 shadow-sm relative z-30 w-full font-sans">
      <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
        {menuItems.filter(item => item.visible).map((item, idx) => {
          // Exact match or sub-paths (except for sub-paths that map to other items)
          const isActive = pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/hora-a-hora');
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
