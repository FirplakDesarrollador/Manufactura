'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Eye, Plus, BarChart3, Trash2 } from 'lucide-react';
import { Suspense } from 'react';

function SubHeaderContent() {
  const pathname = usePathname();

  const menuItems = [
    {
      // Ver y editar en un solo botón: la HDT abre en lectura y quien tiene permiso usa "Editar" dentro de ella
      label: 'Ver / Editar HDT',
      href: '/hdt/plants?action=view',
      isActive: ['/hdt/plants', '/hdt/list', '/hdt/view', '/hdt/edit'].some(r => pathname.includes(r)),
      icon: <Eye size={16} />
    },
    {
      label: 'Crear HDT',
      href: '/hdt/create',
      isActive: pathname.includes('/hdt/create'),
      icon: <Plus size={16} />
    },
    {
      label: 'Estadísticas',
      href: '/hdt/statistics',
      isActive: pathname.includes('/hdt/statistics'),
      icon: <BarChart3 size={16} />
    },
    {
      label: 'Papelera',
      href: '/hdt/papelera',
      isActive: pathname.includes('/hdt/papelera'),
      icon: <Trash2 size={16} />
    }
  ];

  return (
    <div className="bg-white border-b border-[#e2ded5] px-3 shadow-2xs relative z-30 w-full font-sans py-1.5 xl:py-0 xl:h-10 flex items-center">
      <div className="max-w-7xl mx-auto flex flex-row w-full flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
        {menuItems.map((item, idx) => (
          <Link key={idx} href={item.href} style={{ textDecoration: 'none' }} className="flex-shrink-0">
            <button
              className={`flex items-center gap-1.5 h-7 px-3 rounded-lg font-bold transition-all text-[11px] sm:text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
                item.isActive
                  ? 'bg-[#324354] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          </Link>
        ))}
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

export default function SubHeader() {
  return (
    <Suspense fallback={<div className="h-10 w-full bg-white border-b border-[#e2ded5]"></div>}>
      <SubHeaderContent />
    </Suspense>
  );
}
