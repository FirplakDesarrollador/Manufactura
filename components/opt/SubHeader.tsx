'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { History, Plus, BarChart3, BookOpen, ClipboardCheck } from 'lucide-react';

export default function SubHeader() {
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Historial',
      href: '/observations/opt',
      icon: <History size={16} />,
      visible: true
    },
    {
      label: 'Nuevo',
      href: '/observations/opt/new',
      icon: <Plus size={16} />,
      visible: true
    },
    {
      label: 'Indicadores',
      href: '/observations/opt/statistics',
      icon: <BarChart3 size={16} />,
      visible: true
    },
    {
      label: 'Guía',
      href: '/opt/guia',
      icon: <BookOpen size={16} />,
      visible: true
    },
    {
      label: 'Criterios de Calificación',
      href: '/opt/criterios',
      icon: <ClipboardCheck size={16} />,
      visible: true
    }
  ];

  return (
    <div className="bg-white border-b border-[#e2ded5] px-3 shadow-2xs relative z-30 w-full font-sans py-1.5 xl:py-0 xl:h-10 flex items-center">
      <div className="max-w-7xl mx-auto flex flex-row w-full flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
        {menuItems.filter(item => item.visible).map((item, idx) => {
          // Precise active match
          const isHistorial = item.href === '/observations/opt';
          const isActive = isHistorial
            ? pathname === '/observations/opt' || (pathname.startsWith('/observations/opt/') && !pathname.startsWith('/observations/opt/new') && !pathname.startsWith('/observations/opt/statistics'))
            : pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/observations/opt');

          return (
            <Link key={idx} href={item.href} style={{ textDecoration: 'none' }} className="flex-shrink-0">
              <button
                className={`flex items-center gap-1.5 h-7 px-3 rounded-lg font-bold transition-all text-[11px] sm:text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
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
