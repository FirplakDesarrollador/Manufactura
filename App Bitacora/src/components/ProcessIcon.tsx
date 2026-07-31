import React from "react";
import { Factory } from "lucide-react";

interface ProcessIconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ProcessIcon: React.FC<ProcessIconProps> = ({
  name,
  size = 32,
  className = "",
  style = {},
}) => {
  const normName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Render SVG icons with modern glassmorphic/gradient styling
  
  // 1. Mármol Sintético (Sink bowl with dropping water)
  if (normName.includes("marmol") || normName === "ms") {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <rect x="6" y="18" width="52" height="34" rx="6" fill="url(#ms-counter)" stroke="var(--accent)" strokeWidth="2.5" />
        <ellipse cx="32" cy="34" rx="18" ry="10" fill="url(#ms-basin)" stroke="var(--accent)" strokeWidth="2" />
        <ellipse cx="32" cy="36" rx="4" ry="2" fill="#4b5563" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M20 34 C24 38 40 38 44 34" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1.5" />
        <path d="M32 18 V8 A3 3 0 0 1 35 5 H39" stroke="var(--accent)" strokeWidth="2.5" />
        <path d="M32 12 H35" stroke="var(--primary)" strokeWidth="2" />
        <path d="M39 10 C39 12 37 14 37 14 C37 14 35 12 35 10 C35 8.5 37 6 37 6 C37 6 39 8.5 39 10 Z" fill="var(--primary)" stroke="none" />
        <defs>
          <linearGradient id="ms-counter" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f9fafb" />
            <stop offset="50%" stopColor="#f3f4f6" />
            <stop offset="100%" stopColor="#e5e7eb" />
          </linearGradient>
          <linearGradient id="ms-basin" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#769598" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.6" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 2. Fibra de Vidrio (Jacuzzi bathtub with ripples and bubbles)
  if (normName.includes("fibra") || normName === "fv") {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <path d="M16 48 L13 54 M48 48 L51 54" stroke="var(--accent)" strokeWidth="3" />
        <path d="M8 22 H56 C56 22 54 44 48 46 H16 C10 44 8 22 8 22 Z" fill="url(#fv-tub)" stroke="var(--accent)" strokeWidth="2.5" />
        <rect x="6" y="18" width="52" height="4" rx="2" fill="var(--primary)" stroke="var(--accent)" strokeWidth="2" />
        <path d="M50 18 V9 A3 3 0 0 0 47 6 H44" stroke="var(--accent)" strokeWidth="2.5" />
        <circle cx="43" cy="10" r="1.5" fill="var(--primary)" stroke="none" />
        <circle cx="41" cy="14" r="1" fill="var(--primary)" stroke="none" />
        <path d="M12 30 C18 28 22 32 28 30 C34 28 38 32 44 30 C50 28 52 30 52 30" stroke="var(--primary)" strokeWidth="2" fill="none" />
        <path d="M14 36 C20 34 24 38 30 36 C36 34 40 38 46 36 C48 35 50 36 50 36" stroke="var(--primary)" strokeWidth="1.5" opacity="0.6" fill="none" />
        <circle cx="18" cy="26" r="2" fill="rgba(255,255,255,0.8)" stroke="var(--primary)" strokeWidth="1" />
        <circle cx="34" cy="25" r="1.5" fill="rgba(255,255,255,0.8)" stroke="var(--primary)" strokeWidth="1" />
        <circle cx="46" cy="27" r="2.5" fill="rgba(255,255,255,0.8)" stroke="var(--primary)" strokeWidth="1" />
        <defs>
          <linearGradient id="fv-tub" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#f3f4f6" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 3. Muebles (Bathroom vanity washbasin cabinet)
  if (normName.includes("mueble") || normName === "mbl" || normName === "muebles") {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <rect x="10" y="24" width="44" height="34" rx="4" fill="url(#mbl-grad)" stroke="var(--accent)" strokeWidth="2.5" />
        <line x1="10" y1="41" x2="54" y2="41" stroke="var(--accent)" strokeWidth="2.5" />
        <line x1="32" y1="41" x2="32" y2="58" stroke="var(--accent)" strokeWidth="2" />
        <rect x="18" y="31" width="8" height="3" rx="1.5" fill="var(--primary)" stroke="var(--accent)" strokeWidth="1.5" />
        <rect x="38" y="31" width="8" height="3" rx="1.5" fill="var(--primary)" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="17" y1="49" x2="25" y2="49" stroke="var(--primary)" strokeWidth="3" />
        <line x1="39" y1="49" x2="47" y2="49" stroke="var(--primary)" strokeWidth="3" />
        <path d="M12 24 C12 24 16 13 32 13 C48 13 52 24 52 24 Z" fill="url(#mbl-sink-grad)" stroke="var(--accent)" strokeWidth="2.5" />
        <path d="M32 13 V7 A2 2 0 0 1 34 5 H38" stroke="var(--accent)" strokeWidth="2.5" fill="none" />
        <path d="M38 5 V8" stroke="var(--primary)" strokeWidth="2" />
        <circle cx="32" cy="10" r="1.5" fill="var(--primary)" />
        <defs>
          <linearGradient id="mbl-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#769598" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="mbl-sink-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e5e7eb" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 4. CEFI (Kitchen Countertop and cabinet drawer)
  if (normName.includes("cefi")) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <rect x="8" y="26" width="48" height="32" rx="4" fill="url(#cefi-grad)" stroke="var(--accent)" strokeWidth="2.5" />
        <rect x="6" y="22" width="52" height="4" rx="1" fill="#f3f4f6" stroke="var(--accent)" strokeWidth="2" />
        <rect x="12" y="6" width="40" height="8" rx="2" fill="none" stroke="var(--accent)" strokeWidth="2" />
        <line x1="32" y1="6" x2="32" y2="14" stroke="var(--accent)" strokeWidth="1.5" />
        <ellipse cx="20" cy="22" rx="6" ry="1.5" fill="#374151" stroke="var(--accent)" strokeWidth="1.5" />
        <ellipse cx="44" cy="22" rx="6" ry="1.5" fill="#374151" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="8" y1="42" x2="56" y2="42" stroke="var(--accent)" strokeWidth="2.5" />
        <line x1="32" y1="42" x2="32" y2="58" stroke="var(--accent)" strokeWidth="2" />
        <line x1="16" y1="34" x2="22" y2="34" stroke="var(--primary)" strokeWidth="3" />
        <line x1="42" y1="34" x2="48" y2="34" stroke="var(--primary)" strokeWidth="3" />
        <line x1="16" y1="50" x2="22" y2="50" stroke="var(--primary)" strokeWidth="3" />
        <line x1="42" y1="50" x2="48" y2="50" stroke="var(--primary)" strokeWidth="3" />
        <defs>
          <linearGradient id="cefi-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#769598" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 5. Calidad (Quality Badge / Seal / Shield with check)
  if (normName.includes("calidad")) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <path d="M12 10 L32 4 L52 10 V28 C52 42 41 53 32 58 C23 53 12 42 12 28 Z" fill="url(#cal-grad)" stroke="var(--accent)" strokeWidth="2.5" />
        <path d="M22 30 L29 37 L43 23" stroke="#16a34a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M48 6 L50 10 L54 11 L50 12 L48 16 L46 12 L42 11 L46 10 Z" fill="#eab308" stroke="none" />
        <path d="M14 46 L15 48 L17 49 L15 50 L14 52 L13 50 L11 49 L13 48 Z" fill="#eab308" stroke="none" />
        <defs>
          <linearGradient id="cal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00334a" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#00334a" stopOpacity="0.85" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 6. Ingeniería (Engineering - Drafting triangle and gear)
  if (normName.includes("ingenier")) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <path d="M6 50 L48 8 L54 14 L12 56 Z" fill="url(#ing-ruler)" stroke="var(--accent)" strokeWidth="2" />
        <line x1="16" y1="40" x2="20" y2="44" stroke="var(--accent)" />
        <line x1="23" y1="33" x2="27" y2="37" stroke="var(--accent)" />
        <line x1="30" y1="26" x2="34" y2="30" stroke="var(--accent)" />
        <line x1="37" y1="19" x2="41" y2="23" stroke="var(--accent)" />
        <path d="M50 42 A10 10 0 1 0 34 54 A10 10 0 1 0 50 42 Z" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        <circle cx="42" cy="48" r="4" fill="var(--primary)" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M42 36 V38 M42 58 V56 M30 48 H32 M54 48 H52 M34 40 L36 42 M50 56 L48 54 M34 56 L36 54 M50 40 L48 42" stroke="var(--accent)" strokeWidth="2.5" />
        <defs>
          <linearGradient id="ing-ruler" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.4" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 7. Logística (Logistics / Cargo Truck)
  if (normName.includes("logist")) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <path d="M40 20 H48 L56 28 V46 H40 Z" fill="url(#log-cab)" stroke="var(--accent)" strokeWidth="2" />
        <path d="M46 24 H50 L53 29 H46 Z" fill="white" stroke="var(--accent)" strokeWidth="1.5" />
        <rect x="8" y="16" width="32" height="30" rx="3" fill="var(--primary)" stroke="var(--accent)" strokeWidth="2.5" />
        <line x1="16" y1="16" x2="16" y2="46" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="24" y1="16" x2="24" y2="46" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="32" y1="16" x2="32" y2="46" stroke="var(--accent)" strokeWidth="1.5" />
        <circle cx="18" cy="49" r="6" fill="#1f2937" stroke="var(--accent)" strokeWidth="2" />
        <circle cx="18" cy="49" r="2" fill="white" />
        <circle cx="46" cy="49" r="6" fill="#1f2937" stroke="var(--accent)" strokeWidth="2" />
        <circle cx="46" cy="49" r="2" fill="white" />
        <defs>
          <linearGradient id="log-cab" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e5e7eb" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 8. Servicios (Services / Wrench and gear)
  if (normName.includes("servicio")) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <circle cx="26" cy="38" r="10" fill="url(#ser-gear)" stroke="var(--accent)" strokeWidth="2" />
        <path d="M48 10 C52 14 52 18 48 22 L24 46 L14 48 L16 38 L40 14 C44 10 44 10 48 10 Z" fill="url(#ser-wrench)" stroke="var(--accent)" strokeWidth="2" />
        <path d="M44 14 L50 20" stroke="var(--accent)" strokeWidth="2" />
        <circle cx="19" cy="43" r="2" fill="white" stroke="var(--accent)" strokeWidth="1.5" />
        <defs>
          <linearGradient id="ser-gear" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
          <linearGradient id="ser-wrench" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#769598" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.9" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 9. Almacén (Warehouse storage shelves with boxes)
  if (normName.includes("almacen")) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <rect x="8" y="10" width="48" height="44" rx="2" fill="none" stroke="var(--accent)" strokeWidth="2.5" />
        <line x1="8" y1="26" x2="56" y2="26" stroke="var(--accent)" strokeWidth="2.5" />
        <line x1="8" y1="40" x2="56" y2="40" stroke="var(--accent)" strokeWidth="2.5" />
        <rect x="14" y="14" width="10" height="9" rx="1" fill="url(#box-grad)" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="14" y1="18.5" x2="24" y2="18.5" stroke="var(--accent)" strokeWidth="1" />
        <rect x="28" y="14" width="8" height="9" rx="1" fill="url(#box-grad)" stroke="var(--accent)" strokeWidth="1.5" />
        <rect x="20" y="29" width="12" height="9" rx="1" fill="url(#box-grad)" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="20" y1="33.5" x2="32" y2="33.5" stroke="var(--accent)" strokeWidth="1" />
        <rect x="36" y="29" width="14" height="9" rx="1" fill="url(#box-grad)" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="36" y1="33.5" x2="50" y2="33.5" stroke="var(--accent)" strokeWidth="1" />
        <rect x="12" y="43" width="16" height="9" rx="1" fill="url(#box-grad)" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="12" y1="47.5" x2="28" y2="47.5" stroke="var(--accent)" strokeWidth="1" />
        <rect x="32" y="43" width="10" height="9" rx="1" fill="url(#box-grad)" stroke="var(--accent)" strokeWidth="1.5" />
        <defs>
          <linearGradient id="box-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#769598" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 10. Split view for MS_FV (Mármol Sintético + Fibra de Vidrio)
  if (normName.includes("ms_fv") || normName.includes("ms y fv") || normName.includes("marmol y fibra")) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <line x1="32" y1="8" x2="32" y2="56" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" strokeDasharray="3 3" />
        
        {/* Left Side: Sink (Mármol Sintético) */}
        <path d="M6 26 H28 C28 26 26 40 22 42 H12 C8 40 6 26 6 26 Z" fill="url(#ms-split)" stroke="var(--accent)" strokeWidth="2" />
        <ellipse cx="17" cy="34" rx="7" ry="4" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
        <path d="M17 26 V20 A2 2 0 0 1 19 18 H21" stroke="var(--accent)" strokeWidth="1.5" />

        {/* Right Side: Bathtub (Fibra de Vidrio) */}
        <path d="M36 28 H58 C58 28 56 46 52 48 H42 C38 46 36 28 36 28 Z" fill="url(#fv-split)" stroke="var(--accent)" strokeWidth="2" />
        <path d="M38 34 C42 32 44 36 48 34 C52 32 54 36 56 34" stroke="var(--primary)" strokeWidth="1.5" fill="none" />
        <circle cx="41" cy="30" r="1.5" fill="var(--primary)" stroke="none" />

        <defs>
          <linearGradient id="ms-split" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#d1d5db" />
          </linearGradient>
          <linearGradient id="fv-split" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#769598" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // 11. Split view for MBL_CEFI (Muebles + CEFI)
  if (normName.includes("mbl_cefi") || normName.includes("mbl y cefi") || normName.includes("muebles y cefi")) {
    return (
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        style={style}
      >
        <line x1="32" y1="8" x2="32" y2="56" stroke="rgba(0,0,0,0.15)" strokeWidth="1.5" strokeDasharray="3 3" />
        
        {/* Left Side: Bathroom vanity (Muebles) */}
        <rect x="6" y="24" width="22" height="26" rx="2" fill="url(#mbl-split-l)" stroke="var(--accent)" strokeWidth="2" />
        <line x1="6" y1="36" x2="28" y2="36" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="12" y1="30" x2="16" y2="30" stroke="var(--primary)" strokeWidth="2.5" />
        <path d="M8 24 C8 24 10 18 17 18 C24 18 26 24 26 24 Z" fill="white" stroke="var(--accent)" strokeWidth="2" />

        {/* Right Side: Kitchen cabinet (CEFI) */}
        <rect x="36" y="24" width="22" height="26" rx="2" fill="url(#cefi-split-r)" stroke="var(--accent)" strokeWidth="2" />
        <rect x="34" y="21" width="26" height="3" rx="0.5" fill="#f3f4f6" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="36" y1="36" x2="58" y2="36" stroke="var(--accent)" strokeWidth="1.5" />
        <line x1="47" y1="36" x2="47" y2="50" stroke="var(--accent)" strokeWidth="1.5" />
        <ellipse cx="47" cy="21" rx="5" ry="1" fill="#4b5563" stroke="var(--accent)" strokeWidth="1" />

        <defs>
          <linearGradient id="mbl-split-l" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#769598" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="cefi-split-r" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#769598" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#769598" stopOpacity="0.8" />
          </linearGradient>
        </defs>
      </svg>
    );
  }

  // Default Fallback: Sleek modern factory icon
  return <Factory size={size} className={className} style={style} />;
};
