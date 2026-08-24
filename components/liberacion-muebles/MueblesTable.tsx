"use client";

import React, { useState, useEffect } from "react";

export default function MueblesTable({ muebles, selectedDate }: { muebles: any[], selectedDate?: string }) {
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [sapInventory, setSapInventory] = useState<Record<string, { mp04: number, mp01: number } | null>>({});
  const [loadingSap, setLoadingSap] = useState(false);

  const toggleRow = (idx: number) => {
    if (expandedRow === idx) {
      setExpandedRow(null);
    } else {
      setExpandedRow(idx);
    }
  };

  const renderComponentes = (mueble: any) => {
    try {
      let componentes: any[] = [];
      if (typeof mueble.componentes === 'string') {
        componentes = JSON.parse(mueble.componentes);
      } else if (Array.isArray(mueble.componentes)) {
        componentes = mueble.componentes;
      }
      if (!Array.isArray(componentes)) return null;

      return (
        <div className="p-4 bg-white border border-blue-100 rounded-lg shadow-inner my-2">
          {mueble.productos_agrupados && mueble.productos_agrupados.length > 1 && (
            <div className="mb-4 p-3 bg-blue-50/50 rounded-md border border-blue-100">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Productos agrupados en esta fila:</h4>
              <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                {mueble.productos_agrupados.map((prod: any, i: number) => (
                  <li key={i}>
                    <strong>{prod.sku}</strong> - {prod.descripcion} <span className="text-gray-500">({prod.cantidad} unid. | Orden: {prod.orden})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <h4 className="text-sm font-semibold text-blue-900 mb-3">Componentes de este grupo:</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium text-gray-500">SKU</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Componente</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-500">Cantidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {componentes.map((comp: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-700 font-medium">{comp.sku}</td>
                    <td className="px-3 py-2 text-gray-700">{comp.componente}</td>
                    <td className="px-3 py-2 text-gray-700">{comp.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } catch (e) {
      return <div className="p-2 text-red-500 text-sm">Error al cargar componentes</div>;
    }
  };

  const groupedMuebles = React.useMemo(() => {
    const map = new Map();

    muebles.forEach((mueble) => {
      let key = mueble.producto_sku;
      let parsedComponentes: any[] = [];
      
      if (mueble.componentes) {
        if (typeof mueble.componentes === 'string') {
          try {
            parsedComponentes = JSON.parse(mueble.componentes);
          } catch (e) {}
        } else if (Array.isArray(mueble.componentes)) {
          parsedComponentes = mueble.componentes;
        }

        const cantosAndTableros = parsedComponentes
          .filter((c: any) => c.componente.toUpperCase().startsWith("CANTO") || c.componente.toUpperCase().startsWith("TABLERO"))
          .map((c: any) => c.sku)
          .sort();
        if (cantosAndTableros.length > 0) {
          key = cantosAndTableros.join("|");
        }
      }

      if (!map.has(key)) {
        map.set(key, {
          ...mueble,
          ordenes_fabricacion: [mueble.orden_fabricacion],
          clientes: new Set([mueble.cliente]),
          skus: new Set([mueble.producto_sku]),
          descripciones: new Set([mueble.producto_descripcion]),
          componentes_parsed: [...parsedComponentes],
          productos_agrupados: [{ sku: mueble.producto_sku, descripcion: mueble.producto_descripcion, cantidad: mueble.cantidad, orden: mueble.orden_fabricacion }]
        });
      } else {
        const group = map.get(key);
        group.ordenes_fabricacion.push(mueble.orden_fabricacion);
        group.cantidad += mueble.cantidad;
        group.clientes.add(mueble.cliente);
        group.skus.add(mueble.producto_sku);
        group.descripciones.add(mueble.producto_descripcion);
        group.productos_agrupados.push({ sku: mueble.producto_sku, descripcion: mueble.producto_descripcion, cantidad: mueble.cantidad, orden: mueble.orden_fabricacion });

        parsedComponentes.forEach((newComp: any) => {
          const existingComp = group.componentes_parsed.find((c: any) => c.sku === newComp.sku);
          if (existingComp) {
            existingComp.cantidad += newComp.cantidad;
          } else {
            group.componentes_parsed.push({...newComp});
          }
        });
      }
    });

    return Array.from(map.values()).map(group => {
      const isMixed = group.skus.size > 1;
      return {
        ...group,
        orden_fabricacion: group.ordenes_fabricacion.join(', '),
        cliente: Array.from(group.clientes).join(' | '),
        producto_sku: isMixed ? 'Múltiples SKUs' : Array.from(group.skus)[0],
        producto_descripcion: isMixed ? 'Varios productos (Mismos cantos y tableros)' : Array.from(group.descripciones)[0],
        componentes: JSON.stringify(group.componentes_parsed)
      };
    });
  }, [muebles]);

  const totalComponentes = React.useMemo(() => {
    const map = new Map();
    muebles.forEach((mueble) => {
      if (mueble.componentes) {
        try {
          let comps: any[] = [];
          if (typeof mueble.componentes === 'string') {
            comps = JSON.parse(mueble.componentes);
          } else if (Array.isArray(mueble.componentes)) {
            comps = mueble.componentes;
          }
          comps.forEach((comp: any) => {
            const isCantoOrTablero = comp.componente.toUpperCase().startsWith("CANTO") || comp.componente.toUpperCase().startsWith("TABLERO");
            if (isCantoOrTablero) {
              if (map.has(comp.sku)) {
                map.get(comp.sku).cantidad += comp.cantidad;
              } else {
                map.set(comp.sku, { ...comp });
              }
            }
          });
        } catch(e) {}
      }
    });
    return Array.from(map.values()).sort((a, b) => a.componente.localeCompare(b.componente));
  }, [muebles]);

  useEffect(() => {
    if (totalComponentes.length > 0) {
      setLoadingSap(true);
      const skus = totalComponentes.map(comp => comp.sku);
      
      fetch('/api/sap/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus, date: selectedDate })
      })
      .then(res => res.json())
      .then(data => {
        if (data.inventory) {
          setSapInventory(data.inventory);
        }
      })
      .catch(err => console.error("Error fetching SAP inventory:", err))
      .finally(() => setLoadingSap(false));
    }
  }, [totalComponentes, selectedDate]);

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto bg-white rounded-xl border border-blue-100">
        <table className="min-w-full divide-y divide-blue-100 text-sm">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-blue-900">Ordenes</th>
            <th className="px-4 py-3 text-left font-semibold text-blue-900">SKU</th>
            <th className="px-4 py-3 text-left font-semibold text-blue-900">Descripción</th>
            <th className="px-4 py-3 text-left font-semibold text-blue-900">Cant. Total</th>
            <th className="px-4 py-3 text-left font-semibold text-blue-900">Cliente(s)</th>
            <th className="px-4 py-3 text-left font-semibold text-blue-900">Entrega Estimada</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">
          {groupedMuebles.map((mueble: any, idx: number) => (
            <React.Fragment key={idx}>
              <tr 
                onClick={() => toggleRow(idx)}
                className={`hover:bg-blue-50 transition-colors cursor-pointer group ${expandedRow === idx ? 'bg-blue-50/50' : ''}`}
                title="Haz clic para ver componentes"
              >
                <td className="px-4 py-3 font-medium text-blue-900 group-hover:text-blue-700">
                  <div className="flex items-center gap-2">
                    <span className={`text-blue-400 text-xs transition-transform ${expandedRow === idx ? 'rotate-90' : ''}`}>▶</span>
                    {mueble.orden_fabricacion}
                  </div>
                </td>
                <td className="px-4 py-3 text-blue-700">{mueble.producto_sku}</td>
                <td className="px-4 py-3 text-blue-700">{mueble.producto_descripcion}</td>
                <td className="px-4 py-3 text-blue-700">{mueble.cantidad}</td>
                <td className="px-4 py-3 text-blue-700">{mueble.cliente}</td>
                <td className="px-4 py-3 text-blue-700">
                  {new Date(mueble.fecha_entrega_estimada).toLocaleDateString()}
                </td>
              </tr>
              {expandedRow === idx && (
                <tr className="bg-blue-50/20">
                  <td colSpan={6} className="px-4 py-2 border-b border-blue-100">
                    {mueble.componentes ? renderComponentes(mueble) : <div className="p-4 text-sm text-gray-500">No hay componentes</div>}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          {muebles.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-blue-500">
                No se encontraron datos o hubo un error al consultar la API.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {totalComponentes.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          <div className="px-6 py-6 border-b border-blue-100 bg-blue-50/50">
            <h3 className="text-lg font-bold text-blue-900">
              Resumen Total de Consumo (Cantos y Tableros)
            </h3>
            <p className="text-sm text-blue-700">Sumatoria total requerida para toda la programación mostrada</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-blue-100 text-sm">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left font-semibold text-blue-900">Componente</th>
                  <th className="px-6 py-3 text-right font-semibold text-blue-900">Cantidad Total Requerida</th>
                  <th className="px-6 py-3 text-center font-semibold text-blue-900">En Stock SAP (Bodega mp04)</th>
                  <th className="px-6 py-3 text-right font-semibold text-blue-900">Material Disponible</th>
                  <th className="px-6 py-3 text-center font-semibold text-blue-900">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {totalComponentes.map((comp: any, idx: number) => {
                  const disp = sapInventory[comp.sku];
                  const isLoading = loadingSap && typeof disp === 'undefined';
                  
                  let statusColor = "text-gray-500 italic"; // Default loading/not found style
                  let dispText = "No encontrado";
                  let materialDisponibleText = "-";
                  let observacionText = "-";
                  let observacionColor = "text-gray-500";

                  if (isLoading) {
                    dispText = "Consultando...";
                  } else if (disp && typeof disp === 'object') {
                    dispText = disp.mp04.toFixed(2);
                    statusColor = "text-blue-900 font-bold";
                    
                    const matDisp = disp.mp04 - comp.cantidad;
                    materialDisponibleText = matDisp.toFixed(2);
                    
                    if (disp.mp04 >= comp.cantidad) {
                      observacionText = "Material en Planta";
                      observacionColor = "text-green-700 font-bold bg-green-50 rounded-md px-2 py-1";
                    } else if (disp.mp01 >= comp.cantidad) {
                      observacionText = "Material en Almacén";
                      observacionColor = "text-blue-700 font-bold bg-blue-50 rounded-md px-2 py-1";
                    } else {
                      observacionText = "Faltante";
                      observacionColor = "text-red-700 font-bold bg-red-50 rounded-md px-2 py-1";
                    }
                  }

                  return (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-6 py-3 text-blue-700">
                        <span className="font-medium text-blue-800 mr-2">{comp.sku}</span>
                        {comp.componente}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-blue-700">{comp.cantidad.toFixed(2)}</td>
                      <td className={`px-6 py-3 text-center ${statusColor}`}>
                        {dispText}
                      </td>
                      <td className="px-6 py-3 text-right font-bold text-blue-700">
                        {materialDisponibleText}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-block ${observacionColor}`}>
                          {observacionText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
