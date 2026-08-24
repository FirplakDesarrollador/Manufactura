"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import MueblesTable from "./MueblesTable";
import HistoricalDropdown from "./HistoricalDropdown";
import { Loader2 } from "lucide-react";

export default function LiberacionMueblesView() {
  const searchParams = useSearchParams();
  const selectedDate = searchParams.get("date") || undefined;
  
  const [muebles, setMuebles] = useState<any[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [rawText, setRawText] = useState("");

  const today = new Date().toISOString().split('T')[0];
  const isHistorical = selectedDate && selectedDate < today;

  useEffect(() => {
    async function fetchDates() {
      const { data: datesData } = await supabase
        .from('liberacion_muebles_historial')
        .select('fecha_consulta');
        
      if (datesData) {
        const datesSet = new Set<string>();
        datesData.forEach(d => {
          if (d.fecha_consulta) {
            datesSet.add(d.fecha_consulta.split('T')[0]);
          }
        });
        setAvailableDates(Array.from(datesSet).sort().reverse());
      }
    }
    fetchDates();
  }, []);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setErrorText("");
      setRawText("");
      setMuebles([]);

      try {
        if (isHistorical) {
          const { data, error } = await supabase
            .from('liberacion_muebles_historial')
            .select('*')
            .gte('fecha_consulta', `${selectedDate}T00:00:00.000Z`)
            .lt('fecha_consulta', `${selectedDate}T23:59:59.999Z`);
            
          if (error) {
            setErrorText('Error Supabase: ' + error.message);
          } else {
            setMuebles(data || []);
            setRawText(JSON.stringify(data));
          }
        } else {
          const res = await fetch('/api/sap/liberacion-muebles');
          
          const text = await res.text();
          setRawText(text);
          
          if (res.ok) {
              try {
                const data = JSON.parse(text);
                if (Array.isArray(data)) {
                  setMuebles(data);
                } else if (data && Array.isArray(data.response)) {
                  setMuebles(data.response);
                } else if (data && Array.isArray(data.data)) {
                  setMuebles(data.data);
                } else {
                  setMuebles([]);
                }
              } catch (e) {
                console.error("Failed to parse API response as JSON:", e);
                setErrorText("Failed to parse API response.");
              }
            } else {
            try {
              const errData = JSON.parse(text);
              setErrorText(`API Error: ${errData.error || res.statusText}`);
            } catch {
              setErrorText(`API Error: ${res.status} ${res.statusText}`);
            }
          }
        }
      } catch (error: any) {
        setErrorText('Fetch error: ' + error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isHistorical, selectedDate]);

  return (
    <div className="flex-1 bg-white border border-[#a3a3a3] shadow-inner p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#324354]">
          Liberación de Muebles {isHistorical && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded ml-2">Modo Histórico: {selectedDate}</span>}
        </h2>
        <div className="flex gap-4">
          <HistoricalDropdown availableDates={availableDates} />
        </div>
      </div>
      
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Cargando datos...</p>
        </div>
      ) : (
        <>
            <MueblesTable muebles={muebles} selectedDate={selectedDate} />
            
            {(errorText || (muebles.length === 0 && rawText)) && (
            <div className="mt-8 p-4 bg-gray-100 rounded text-xs text-gray-800 whitespace-pre-wrap break-all overflow-x-auto border border-gray-300">
                {errorText && <div className="text-red-600 font-bold mb-2">{errorText}</div>}
                <strong>Debug API Response:</strong><br/>
                {rawText}
            </div>
            )}
        </>
      )}
    </div>
  );
}
