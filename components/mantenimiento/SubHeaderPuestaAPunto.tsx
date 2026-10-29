'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Eye, Plus, CheckCircle, ClipboardList } from 'lucide-react';
import { Suspense } from 'react';

interface SubHeaderPuestaAPuntoProps {
  basePath: string;
}

function SubHeaderContent({ basePath }: SubHeaderPuestaAPuntoProps) {
  const pathname = usePathname();

  const menuItems = [
    {
      label: 'Ver / Editar',
      href: `${basePath}/ver`,
      isActive:
        pathname.startsWith(`${basePath}/ver`) ||
        pathname.startsWith(`${basePath}/modificar`),
      icon: <Eye size={16} />,
    },
    {
      label: 'Crear',
      href: `${basePath}/crear`,
      isActive: pathname.startsWith(`${basePath}/crear`),
      icon: <Plus size={16} />,
    },
    {
      label: 'Realizar',
      href: `${basePath}/realizar`,
      isActive: pathname.startsWith(`${basePath}/realizar`),
      icon: <CheckCircle size={16} />,
    },
    {
      label: 'Auditoría',
      href: `${basePath}/auditoria`,
      isActive: pathname.startsWith(`${basePath}/auditoria`),
      icon: <ClipboardList size={16} />,
    },
  ];

  return (
    <div className="no-print print:hidden bg-white border-b border-[#e2ded5] px-3 shadow-2xs relative z-30 w-full font-sans py-1.5 xl:py-0 xl:h-10 flex items-center">
      <div className="max-w-7xl mx-auto flex flex-row w-full flex-nowrap gap-2 justify-start md:justify-center overflow-x-auto scrollbar-hide py-0.5">
        {menuItems.map((item, idx) => (
          <Link key={idx} href={item.href} style={{ textDecoration: 'none' }} className="flex-shrink-0">
            <button
              className={`flex items-center gap-1.5 h-7 px-3 rounded-lg font-bold transition-all text-[11px] sm:text-xs cursor-pointer whitespace-nowrap flex-shrink-0 active:scale-95 ${
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
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}

export default function SubHeaderPuestaAPunto({ basePath }: SubHeaderPuestaAPuntoProps) {
  return (
    <Suspense fallback={<div className="no-print print:hidden h-10 w-full bg-white border-b border-[#e2ded5]" />}>
      <SubHeaderContent basePath={basePath} />
    </Suspense>
  );
}
