"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function HistoricalDropdown({ availableDates }: { availableDates: string[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentDate = searchParams.get("date");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (date: string | null) => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (date) {
      params.set("date", date);
    } else {
      params.delete("date");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
      >
        <span>Histórico</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50 overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            <button
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${!currentDate ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}
            >
              Hoy (Datos en Vivo)
            </button>
            <div className="border-t border-gray-100"></div>
            {availableDates.length > 0 ? (
              availableDates.map((date) => (
                <button
                  key={date}
                  onClick={() => handleSelect(date)}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition-colors ${currentDate === date ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700"}`}
                >
                  {date}
                </button>
              ))
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500 italic">No hay historial</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
