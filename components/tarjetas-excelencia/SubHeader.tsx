'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { categorias, tarjetas } from '@/lib/tarjetas-excelencia/data';

// Helper to render dynamic icons safely
const IconComponent = ({ name, size = 16, className = "" }: { name: string; size?: number; className?: string }) => {
  const Icon = (Icons as any)[name] || Icons.HelpCircle;
  return <Icon size={size} className={className} />;
};

export default function SubHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Resolve active category
  let activeCategoryId = 1;
  const catParam = searchParams.get('cat');
  
  if (catParam) {
    activeCategoryId = parseInt(catParam);
  } else if (pathname.startsWith('/tarjetas-excelencia/tarjetas/')) {
    const parts = pathname.split('/');
    const cardIdStr = parts[parts.length - 1];
    const cardId = parseInt(cardIdStr);
    const card = tarjetas.find(t => t.id === cardId);
    if (card) {
      activeCategoryId = card.categoria_id;
    }
  }

  return (
    <div className="bg-white border-b border-[#e2ded5] py-1.5 px-3 shadow-sm relative z-30 w-full font-sans">
      <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-2 justify-start overflow-x-auto scrollbar-hide py-0.5">
        {categorias.map((cat) => {
          const isActive = activeCategoryId === cat.id;
          return (
            <Link 
              key={cat.id} 
              href={`/tarjetas-excelencia?cat=${cat.id}`}
              style={{ textDecoration: 'none' }}
              className="flex-shrink-0"
            >
              <button
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold transition-all text-xs cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  isActive
                    ? 'bg-[#324354] text-white shadow-md'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <IconComponent name={cat.icon} size={14} />
                <span>{cat.nombre}</span>
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
