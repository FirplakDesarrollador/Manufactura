'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, ComposedChart, PieChart, Pie, Cell, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts'
import { Calendar, Filter, User } from 'lucide-react'

// Define the shape of our data from Supabase
interface OPTRecord {
    ID: number
    Título: string
    Operario: string
    Puesto: string
    "Created By": string
    Create_at: string
    Planta: string
    Calificación: number
    "Elementos de seguridad": boolean
    "Puesto con ergonomía": boolean
    "Puesto ordenado y aseado": boolean
    "Cumple HDT": boolean
    "Cumple puesta a punto / plan de control": boolean
    "Cumple 5S": boolean
    "Producto conforme": boolean
    "Herramientas en buen estado": boolean
    "Operario conoce los defectos de calidad": boolean
    "Operario conoce sus indicadores": boolean
    VA: string
    NVA: string
}

interface StatisticsDashboardProps {
    data: OPTRecord[]
    empleados: { nombreCompleto: string }[]
}

const COLORS = ['#254153', '#749094', '#60A5FA', '#34D399', '#FBBF24', '#F472B6', '#A78BFA']

const getStartOfWeek = (dateStr: string | Date): string => {
    let date: Date;
    if (typeof dateStr === 'string') {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        } else {
            date = new Date(dateStr);
        }
    } else {
        date = new Date(dateStr);
    }
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    
    const yyyy = monday.getFullYear();
    const mm = String(monday.getMonth() + 1).padStart(2, '0');
    const dd = String(monday.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

const getISOWeekAndYear = (dateStr: string): string => {
    const parts = dateStr.split('-');
    let date: Date;
    if (parts.length === 3) {
        date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
        date = new Date(dateStr);
    }
    const day = date.getDay();
    const dayNum = day === 0 ? 7 : day;
    const tempDate = new Date(date.getTime());
    tempDate.setDate(date.getDate() + 4 - dayNum);
    
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    const diff = tempDate.getTime() - yearStart.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    const weekNo = Math.ceil(dayOfYear / 7);
    
    return `S${weekNo}/${tempDate.getFullYear()}`;
}

export function StatisticsDashboard({ data, empleados }: StatisticsDashboardProps) {
    // 1. DATES FILTERING STATE
    // By default, last 30 days
    const [startDate, setStartDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const [selectedPerson, setSelectedPerson] = useState<string>('')
    const [selectedWeek, setSelectedWeek] = useState<string>('')

    // 2. FILTERING LOGIC
    const filteredData = useMemo(() => {
        return data.filter(record => {
            if (!record.Create_at) return false;
            const recordDate = new Date(record.Create_at).toISOString().split('T')[0];
            const matchesDate = recordDate >= startDate && recordDate <= endDate;
            const matchesPerson = !selectedPerson || record["Created By"] === selectedPerson;
            const matchesWeek = !selectedWeek || getStartOfWeek(recordDate) === selectedWeek;
            return matchesDate && matchesPerson && matchesWeek;
        });
    }, [data, startDate, endDate, selectedPerson, selectedWeek]);

    // 3. KPIs
    const totalOPTs = filteredData.length;
    const avgQuality = totalOPTs > 0 
        ? Math.round(filteredData.reduce((acc, curr) => acc + (curr.Calificación || 0), 0) / totalOPTs) 
        : 0;

    // 4. DATA PROCESSING FOR CHARTS
    
    // A. OPTs por Persona
    const optsPerPerson = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.forEach(r => {
            const person = r["Created By"] || 'Desconocido';
            counts[person] = (counts[person] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, 'Cantidad de OPTs': count }))
            .sort((a, b) => b['Cantidad de OPTs'] - a['Cantidad de OPTs']);
    }, [filteredData]);

    // B. Calidad Promedio por Persona
    const qualityPerPerson = useMemo(() => {
        const stats: Record<string, { total: number, count: number }> = {};
        filteredData.forEach(r => {
            const person = r["Created By"] || 'Desconocido';
            if (!stats[person]) stats[person] = { total: 0, count: 0 };
            stats[person].total += (r.Calificación || 0);
            stats[person].count += 1;
        });
        return Object.entries(stats)
            .map(([name, data]) => ({ 
                name, 
                'Calidad Promedio (%)': Math.round(data.total / data.count) 
            }))
            .sort((a, b) => b['Calidad Promedio (%)'] - a['Calidad Promedio (%)']);
    }, [filteredData]);

    // C. Timeline (Agrupado por día)
    const timelineData = useMemo(() => {
        const stats: Record<string, { count: number, totalQuality: number }> = {};
        
        // Ensure we sort chronologically
        const sorted = [...filteredData].sort((a, b) => new Date(a.Create_at).getTime() - new Date(b.Create_at).getTime());
        
        sorted.forEach(r => {
            const date = new Date(r.Create_at).toLocaleDateString();
            if (!stats[date]) stats[date] = { count: 0, totalQuality: 0 };
            stats[date].count += 1;
            stats[date].totalQuality += (r.Calificación || 0);
        });

        return Object.entries(stats).map(([date, data]) => ({
            date,
            'Cantidad OPTs': data.count,
            'Calidad Promedio': Math.round(data.totalQuality / data.count)
        }));
    }, [filteredData]);

    // D. Distribución por Planta
    const plantDistribution = useMemo(() => {
        const counts: Record<string, number> = {};
        filteredData.forEach(r => {
            const plant = r.Planta || 'Desconocida';
            counts[plant] = (counts[plant] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredData]);

    // E. Cumplimiento de Parámetros Clave (Radar)
    const parameterCompliance = useMemo(() => {
        if (totalOPTs === 0) return [];
        
        let seg = 0, erg = 0, ord = 0, hdt = 0, pc = 0, s5 = 0, prod = 0, herr = 0, def = 0, ind = 0;
        
        filteredData.forEach(r => {
            if (r["Elementos de seguridad"]) seg++;
            if (r["Puesto con ergonomía"]) erg++;
            if (r["Puesto ordenado y aseado"]) ord++;
            if (r["Cumple HDT"]) hdt++;
            if (r["Cumple puesta a punto / plan de control"]) pc++;
            if (r["Cumple 5S"]) s5++;
            if (r["Producto conforme"]) prod++;
            if (r["Herramientas en buen estado"]) herr++;
            if (r["Operario conoce los defectos de calidad"]) def++;
            if (r["Operario conoce sus indicadores"]) ind++;
        });

        // Calculate percentages
        return [
            { parameter: 'Seguridad', score: Math.round((seg / totalOPTs) * 100) },
            { parameter: 'Ergonomía', score: Math.round((erg / totalOPTs) * 100) },
            { parameter: 'Orden y Aseo', score: Math.round((ord / totalOPTs) * 100) },
            { parameter: 'HDT', score: Math.round((hdt / totalOPTs) * 100) },
            { parameter: 'Plan de Control', score: Math.round((pc / totalOPTs) * 100) },
            { parameter: '5S', score: Math.round((s5 / totalOPTs) * 100) },
            { parameter: 'Prod Conform.', score: Math.round((prod / totalOPTs) * 100) },
            { parameter: 'Herramientas', score: Math.round((herr / totalOPTs) * 100) },
            { parameter: 'Defectos Calidad', score: Math.round((def / totalOPTs) * 100) },
            { parameter: 'Indicadores', score: Math.round((ind / totalOPTs) * 100) },
        ];
    }, [filteredData, totalOPTs]);

    // WEEKLY COMPLIANCE CALCULATION LOGIC
    const getWeeksInRange = (start: string, end: string): string[] => {
        const weeks: string[] = []
        let currentStr = getStartOfWeek(start)
        const lastStr = getStartOfWeek(end)
        
        let [cy, cm, cd] = currentStr.split('-').map(Number)
        let current = new Date(cy, cm - 1, cd)
        
        let [ly, lm, ld] = lastStr.split('-').map(Number)
        const last = new Date(ly, lm - 1, ld)
        
        while (current <= last) {
            const yyyy = current.getFullYear();
            const mm = String(current.getMonth() + 1).padStart(2, '0');
            const dd = String(current.getDate()).padStart(2, '0');
            weeks.push(`${yyyy}-${mm}-${dd}`)
            current.setDate(current.getDate() + 7)
        }
        return weeks
    }

    const weeksInRange = useMemo(() => {
        if (!startDate || !endDate) return [];
        return getWeeksInRange(startDate, endDate);
    }, [startDate, endDate]);

    const weeksOptions = useMemo(() => {
        return weeksInRange.map(weekStart => {
            return {
                value: weekStart,
                label: getISOWeekAndYear(weekStart)
            };
        });
    }, [weeksInRange]);

    // Reset selectedWeek if it is no longer in range when date boundaries change
    useEffect(() => {
        if (selectedWeek && !weeksInRange.includes(selectedWeek)) {
            setSelectedWeek('');
        }
    }, [weeksInRange, selectedWeek]);

    const weeklyComplianceData = useMemo(() => {
        if (weeksInRange.length === 0) return [];

        if (selectedPerson) {
            const recordsForPerson = data.filter(r => r["Created By"] === selectedPerson);
            return weeksInRange.map(weekStart => {
                const optsInWeek = recordsForPerson.filter(r => {
                    if (!r.Create_at) return false;
                    const recordDate = r.Create_at.split('T')[0];
                    return getStartOfWeek(recordDate) === weekStart;
                }).length;
                
                return {
                    weekStart,
                    name: getISOWeekAndYear(weekStart),
                    'OPTs Realizadas': optsInWeek,
                    'Estado': optsInWeek >= 1 ? 100 : 0
                };
            });
        } else {
            return empleados.map(emp => {
                const name = emp.nombreCompleto;
                const recordsForPerson = data.filter(r => r["Created By"] === name);
                
                let weeksComplied = 0;
                weeksInRange.forEach(weekStart => {
                    const hasOpt = recordsForPerson.some(r => {
                        if (!r.Create_at) return false;
                        const recordDate = r.Create_at.split('T')[0];
                        return getStartOfWeek(recordDate) === weekStart;
                    });
                    if (hasOpt) weeksComplied++;
                });

                const pct = weeksInRange.length > 0 ? Math.round((weeksComplied / weeksInRange.length) * 100) : 0;
                return {
                    name,
                    'Cumplimiento (%)': pct,
                    'Semanas Cumplidas': weeksComplied,
                    'Total Semanas': weeksInRange.length
                };
            }).sort((a, b) => b['Cumplimiento (%)'] - a['Cumplimiento (%)']);
        }
    }, [data, empleados, selectedPerson, weeksInRange]);

    const selectedPersonCompliance = useMemo(() => {
        if (!selectedPerson || weeksInRange.length === 0) return 0;
        const compliedWeeks = weeklyComplianceData.filter(w => w.Estado === 100).length;
        return Math.round((compliedWeeks / weeksInRange.length) * 100);
    }, [selectedPerson, weeklyComplianceData, weeksInRange]);


    return (
        <div className="space-y-8 animate-fade-in">
            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end justify-between">
                <div className="flex flex-col md:flex-row gap-4 items-end w-full md:w-auto">
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <Calendar size={16} /> Fecha de Inicio
                        </label>
                        <input 
                            type="date" 
                            className="w-full md:w-auto p-2 border-2 border-[#254153] rounded-md focus:outline-none focus:ring-2 focus:ring-[#749094]"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <Calendar size={16} /> Fecha de Fin
                        </label>
                        <input 
                            type="date" 
                            className="w-full md:w-auto p-2 border-2 border-[#254153] rounded-md focus:outline-none focus:ring-2 focus:ring-[#749094]"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <User size={16} /> Filtrar por Persona
                        </label>
                        <select 
                            className="w-full md:w-56 p-2 border-2 border-[#254153] rounded-md focus:outline-none focus:ring-2 focus:ring-[#749094] bg-white text-gray-700 font-medium"
                            value={selectedPerson}
                            onChange={(e) => setSelectedPerson(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {empleados.map(emp => (
                                <option key={emp.nombreCompleto} value={emp.nombreCompleto}>
                                    {emp.nombreCompleto}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                            <Calendar size={16} /> Filtrar por Semana
                        </label>
                        <select 
                            className="w-full md:w-48 p-2 border-2 border-[#254153] rounded-md focus:outline-none focus:ring-2 focus:ring-[#749094] bg-white text-gray-700 font-medium"
                            value={selectedWeek}
                            onChange={(e) => setSelectedWeek(e.target.value)}
                        >
                            <option value="">Todas</option>
                            {weeksOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-md border border-gray-200">
                    <Filter size={16} /> {filteredData.length} registros filtrados
                </div>
            </div>

            {/* KPIs */}
            <div className={`grid grid-cols-1 ${selectedPerson ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
                <div className="bg-primary text-white p-6 rounded-xl shadow-md border-b-4 border-secondary flex flex-col justify-center items-center">
                    <span className="text-secondary/80 font-semibold mb-2 uppercase tracking-wider text-sm">Total OPTs Realizadas</span>
                    <span className="text-5xl font-black">{totalOPTs}</span>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-[#254153] flex flex-col justify-center items-center">
                    <span className="text-gray-500 font-semibold mb-2 uppercase tracking-wider text-sm">Calidad Promedio Global</span>
                    <span className="text-5xl font-black text-[#254153]">{avgQuality}%</span>
                </div>
                {selectedPerson && (
                    <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-amber-500 flex flex-col justify-center items-center">
                        <span className="text-gray-500 font-semibold mb-2 uppercase tracking-wider text-sm">Cumplimiento Meta Semanal</span>
                        <span className="text-5xl font-black text-amber-500">{selectedPersonCompliance}%</span>
                    </div>
                )}
            </div>

            {/* Gráfica de Cumplimiento Semanal */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-[#254153]">Cumplimiento de Meta Semanal (1 OPT / Semana)</h3>
                        <p className="text-xs text-gray-500 mt-1">Meta: Cada líder debe registrar por lo menos 1 OPT por semana (de lunes a domingo)</p>
                    </div>
                    {selectedPerson && (
                        <div className="mt-2 md:mt-0 text-sm font-bold text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
                            Rango: {weeksInRange.length} semanas analizadas
                        </div>
                    )}
                </div>
                <div 
                    className="w-full"
                    style={{ height: selectedPerson ? '320px' : '450px' }}
                >
                    <ResponsiveContainer width="100%" height="100%">
                        {selectedPerson ? (
                            <ComposedChart data={weeklyComplianceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false}/>
                                <XAxis dataKey="name" tick={{fontSize: 12}} />
                                <YAxis yAxisId="left" orientation="left" stroke="#254153" allowDecimals={false} />
                                <YAxis yAxisId="right" orientation="right" stroke="#34D399" domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                <Tooltip 
                                    formatter={(value: any, name: string) => {
                                        if (name === 'Estado') return [`${value}%`, 'Cumplimiento'];
                                        return [value, name];
                                    }}
                                    contentStyle={{borderRadius: '8px'}}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="OPTs Realizadas" fill="#254153" radius={[4, 4, 0, 0]} maxBarSize={45} />
                                <Line yAxisId="right" type="monotone" dataKey="Estado" stroke="#34D399" strokeWidth={3} dot={{r: 4, fill: '#34D399', strokeWidth: 2, stroke: 'white'}} />
                            </ComposedChart>
                        ) : (
                            <BarChart data={weeklyComplianceData} margin={{ top: 10, right: 10, left: -10, bottom: 80 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false}/>
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 10, angle: -45, textAnchor: 'end' }} 
                                    interval={0}
                                    height={80}
                                />
                                <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                <Tooltip formatter={(value) => `${value}%`} contentStyle={{borderRadius: '8px'}}/>
                                <Bar dataKey="Cumplimiento (%)" radius={[4, 4, 0, 0]} maxBarSize={45}>
                                    {weeklyComplianceData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry['Cumplimiento (%)'] >= 80 ? '#34D399' : entry['Cumplimiento (%)'] >= 50 ? '#FBBF24' : '#F87171'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {totalOPTs === 0 ? (
                <div className="text-center py-20 text-gray-400 text-lg">
                    No hay datos suficientes en este rango de fechas para generar los gráficos.
                </div>
            ) : (
                <>
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {/* CHART 1: Timeline (Full width on xl too) */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 xl:col-span-2">
                            <h3 className="text-lg font-bold text-[#254153] mb-6">Evolución en el Tiempo</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={timelineData}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false}/>
                                        <XAxis dataKey="date" tick={{fontSize: 12}} tickMargin={10} minTickGap={30}/>
                                        <YAxis yAxisId="left" orientation="left" stroke="#254153" />
                                        <YAxis yAxisId="right" orientation="right" stroke="#749094" domain={[0, 100]} />
                                        <Tooltip 
                                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                                        />
                                        <Legend />
                                        <Bar yAxisId="left" dataKey="Cantidad OPTs" fill="#254153" radius={[4, 4, 0, 0]} maxBarSize={50} />
                                        <Line yAxisId="right" type="monotone" dataKey="Calidad Promedio" stroke="#749094" strokeWidth={3} dot={{r: 4, fill: '#749094', strokeWidth: 2, stroke: 'white'}} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 2: OPTs por Persona */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-[#254153] mb-6">Cantidad de OPTs por Persona</h3>
                            <div 
                                className="w-full"
                                style={{ height: `${Math.max(320, optsPerPerson.length * 35)}px` }}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={optsPerPerson} layout="vertical" margin={{ left: 50, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false}/>
                                        <XAxis type="number" />
                                        <YAxis dataKey="name" type="category" tick={{fontSize: 12}} width={120} />
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}}/>
                                        <Bar dataKey="Cantidad de OPTs" fill="#749094" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 3: Calidad por Persona */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-lg font-bold text-[#254153] mb-6">Calidad Promedio por Persona</h3>
                            <div 
                                className="w-full"
                                style={{ height: `${Math.max(320, qualityPerPerson.length * 35)}px` }}
                            >
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={qualityPerPerson} layout="vertical" margin={{ left: 50, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false}/>
                                        <XAxis type="number" domain={[0, 100]} />
                                        <YAxis dataKey="name" type="category" tick={{fontSize: 12}} width={120} />
                                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px'}}/>
                                        <Bar dataKey="Calidad Promedio (%)" fill="#254153" radius={[0, 4, 4, 0]} barSize={20}>
                                            {qualityPerPerson.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry['Calidad Promedio (%)'] >= 80 ? '#34D399' : entry['Calidad Promedio (%)'] >= 50 ? '#FBBF24' : '#F87171'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 4: Distribución por Planta */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                            <h3 className="text-lg font-bold text-[#254153] mb-2 w-full text-left">Distribución por Planta</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={plantDistribution}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({name, percent}: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                        >
                                            {plantDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{borderRadius: '8px'}}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 5: Cumplimiento Promedio de Parámetros (Radar) */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center">
                            <h3 className="text-lg font-bold text-[#254153] mb-2 w-full text-left">Frecuencia de Cumplimiento ("Sí")</h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={parameterCompliance}>
                                        <PolarGrid opacity={0.3}/>
                                        <PolarAngleAxis dataKey="parameter" tick={{fontSize: 11, fill: '#666'}}/>
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false}/>
                                        <Radar name="Aprobación (%)" dataKey="score" stroke="#749094" fill="#749094" fillOpacity={0.6} />
                                        <Tooltip contentStyle={{borderRadius: '8px'}}/>
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>
                </>
            )}
        </div>
    )
}
