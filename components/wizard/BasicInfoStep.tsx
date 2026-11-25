"use client";

import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { ArrowRight, Info } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { createExternalClient, isExternalConfigured } from "@/lib/supabase/external";
import { createClient } from "@/lib/supabase/client";

const PROCESOS_POR_PLANTA: Record<string, string[]> = {
    "MS": ["ACABADO", "DESMOLDE", "EMPAQUE", "PINTURA", "PULIDO", "VACIADO"],
    "FV": ["PINTURA", "VACIADO", "DESMOLDE", "HERRAJES", "PULIDO", "ACABADO", "ENSAMBLE", "ENSAYO", "EMPAQUE"],
    "RTM": ["PINTURA", "INYECCION", "DESMOLDE", "PULIDO", "ACABADO", "EMPAQUE", "ACABADO QZ", "PERFORADO QZ"],
    "MBL": ["CORTE", "ENCHAPE", "RANURADO", "PERFORADO", "EMPAQUE", "CAJAS"],
    "CEFI": ["CORTE", "ENCHAPE", "RANURADO", "PERFORADO", "EMPAQUE", "CAJAS", "MECANIZADO"],
    // Moldes: RMOLD = Reparación de Moldes y MOLD = Fabricación de Moldes (códigos de Configuración → Nomenclatura de plantas)
    "RMOLD": ["REPARACION", "PULIDO", "ENCERADO"],
    "MOLD": ["FABRICACION", "LAMINADO", "PULIDO", "ACABADO"],
    // CALID = Calidad (código de Configuración → Nomenclatura de plantas)
    "CALID": ["INSPECCION", "AUDITORIA", "LIBERACION"],
};

// Tiempo de ciclo teórico recomendado por planta, en segundos (dato de Manufactura; se puede corregir en el formulario)
// MOLD y CALID no tienen tiempo recomendado
const TIEMPO_RECOMENDADO_SEG: Record<string, number> = {
    MS: 60,        // 1 min
    FV: 1020,      // 17 min
    RTM: 2520,     // 42 min
    MBL: 25.26,    // 0,421 min
    CEFI: 25.26,   // 0,421 min
    RMOLD: 1320,   // 22 min
<<<<<<< HEAD
};
const fmtMin = (seg: number) => (seg / 60).toLocaleString("es-CO", { maximumFractionDigits: 3 });
=======
}
const fmtMin = (seg: number) => (seg / 60).toLocaleString("es-CO", { maximumFractionDigits: 3 })
>>>>>>> origin/main

// FV: el tiempo de ciclo depende del tipo de bañera
const TIPOS_BANERA_FV: { tipo: string; seg: number; ejemplo: string }[] = [
    { tipo: "Sencilla", seg: 1020, ejemplo: "17 min" },
    { tipo: "Hidromasaje", seg: 2040, ejemplo: "34 min" },
    { tipo: "Multipersonal", seg: 3060, ejemplo: "51 min" },
];

// Planta del formulario → nombre(s) de la planta en Talento Humano (para listar sus operarios)
const PLANTA_TALENTO_HUMANO: Record<string, string[]> = {
    MS: ["marmol sintetico", "marmol (calidad)"],
    FV: ["fibra de vidrio", "fibra (calidad)"],
    RTM: ["quarzstone"],
    MBL: ["muebles", "muebles (calidad)"],
    CEFI: ["cefi"],
    RMOLD: ["rr moldes"],
    MOLD: ["moldes"],
    CALID: ["calidad", "marmol (calidad)", "muebles (calidad)", "fibra (calidad)"],
};
// Nombres de Talento Humano sin espacios sobrantes (algunos traen dobles o al final y no se encontraban al buscar)
const limpiarNombre = (n: string) => String(n || "").replace(/\s+/g, " ").trim();
const sinTildes = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export default function BasicInfoStep({ onNext }: { onNext: () => void }) {
    const { evaluacionActual, iniciarEvaluacion, actualizarEvaluacion } = useStore();
    const [operarios, setOperarios] = useState<string[]>([]);
    // Operarios con su planta: el campo Operario sugiere primero los de la planta elegida y debajo todo el personal
    const [empleados, setEmpleados] = useState<{ nombre: string; planta: string }[]>([]);
    const [puestos, setPuestos] = useState<string[]>([]);
    const [activePopup, setActivePopup] = useState<boolean>(false);
    const [currentUserName, setCurrentUserName] = useState<string>("");
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

    useEffect(() => {
        async function fetchEmpleados() {
            let loadedOperarios: string[] = [];
            let loadedPuestos: string[] = [];

            try {
                // 1. Fetch from Talento Humano external Supabase if configured
                if (isExternalConfigured()) {
                    try {
                        const externalSupabase = createExternalClient();

                        const { data: dataOp, error: errOp } = await externalSupabase
                            .from('empleados')
                            .select('nombreCompleto, planta')
                            .eq('activo', true)
                            .order('nombreCompleto', { ascending: true });

                        if (errOp) {
                            console.warn('Talento Humano (empleados) no disponible:', errOp.message || errOp);
                        } else if (dataOp && dataOp.length > 0) {
                            loadedOperarios = [...new Set(dataOp.map(d => limpiarNombre(d.nombreCompleto)))];
                            setEmpleados(dataOp.map(d => ({ nombre: limpiarNombre(d.nombreCompleto), planta: sinTildes(d.planta) })));
                        }

                        const { data: dataCargos, error: errCargos } = await externalSupabase
                            .from('cargos')
                            .select('cargo')
                            .order('cargo', { ascending: true });

                        if (errCargos) {
                            console.warn('Talento Humano (cargos) no disponible:', errCargos.message || errCargos);
                        } else if (dataCargos && dataCargos.length > 0) {
                            loadedPuestos = dataCargos.map(d => d.cargo).filter(Boolean);
                        }
                    } catch (extErr) {
                        console.warn('Error consultando base externa:', extErr);
                    }
                }

                // 2. Fallback: fetch operarios from local usuarios table
                const supabase = createClient();
                if (loadedOperarios.length === 0) {
                    try {
                        const { data: uData } = await supabase
                            .from('usuarios')
                            .select('nombre')
                            .order('nombre', { ascending: true });
                        if (uData && uData.length > 0) {
                            loadedOperarios = uData.map(u => u.nombre).filter(Boolean);
                        }
                    } catch (uErr) {
                        console.warn('No se pudieron obtener usuarios locales:', uErr);
                    }
                }

                // 3. Fallback: default puestos from plant processes
                if (loadedPuestos.length === 0) {
                    const defaultPuestos = Array.from(new Set(Object.values(PROCESOS_POR_PLANTA).flat())).sort();
                    loadedPuestos = defaultPuestos;
                }

                if (loadedOperarios.length > 0) setOperarios(loadedOperarios);
                if (loadedPuestos.length > 0) setPuestos(loadedPuestos);

            } catch (err) {
                console.warn('Error general obteniendo lista de operarios/puestos:', err);
            }
        }
        fetchEmpleados();

        // Fetch current logged-in user and their name from usuarios table
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data }) => {
            if (data?.user) {
                const email = data.user.email || "";
                setCurrentUserEmail(email);

                // Try main DB first, then external
                let nombre = "";
                try {
                    const { data: u1 } = await supabase
                        .from('usuarios')
                        .select('nombre')
                        .eq('correo', email)
                        .single();
                    if (u1?.nombre) nombre = u1.nombre;
                } catch { /* ignore */ }

                if (!nombre && isExternalConfigured()) {
                    try {
                        const ext = createExternalClient();
                        const { data: u2 } = await ext
                            .from('usuarios')
                            .select('nombre')
                            .eq('correo', email)
                            .single();
                        if (u2?.nombre) nombre = u2.nombre;
                    } catch { /* ignore */ }
                }

                setCurrentUserName(nombre || email);
                // Pre-fill realizadoPor if empty
                setFormData(prev => ({
                    ...prev,
                    realizadoPor: prev.realizadoPor || nombre || email
                }));
            }
        });
    }, []);

    const [formData, setFormData] = useState({
        planta: evaluacionActual?.planta || "",
        puesto: evaluacionActual?.puesto || "",
        operario: evaluacionActual?.operario || "",
        realizadoPor: evaluacionActual?.realizadoPor || "",
        tiempoCicloTeorico: evaluacionActual?.tiempoCicloTeorico?.toString() || "",
        tipoProducto: evaluacionActual?.tipoProducto || "",
        descripcionProducto: evaluacionActual?.descripcionProducto || "",
    });
    const esFV = formData.planta === "FV";

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelect = (name: string, value: string) => {
        if (name === "planta") {
            const actual = formData.tiempoCicloTeorico.trim();
            const eraRecomendado = !actual || Object.values(TIEMPO_RECOMENDADO_SEG).some(t => Number(actual) === t);
            const eraDeBanera = TIPOS_BANERA_FV.some(t => Number(actual) === t.seg);
            const rec = TIEMPO_RECOMENDADO_SEG[value];
            const cambiar = eraRecomendado || eraDeBanera;
            // FV: el tiempo lo define el tipo de bañera, se limpia hasta que se elija
            setFormData({
                ...formData, planta: value,
                tiempoCicloTeorico: value === "FV" ? (cambiar ? "" : formData.tiempoCicloTeorico) : (cambiar ? (rec ? String(rec) : "") : formData.tiempoCicloTeorico),
                tipoProducto: value === "FV" ? formData.tipoProducto : "",
                descripcionProducto: value === "FV" ? formData.descripcionProducto : "",
            });
            return;
        }
        if (name === "tipoProducto") {
            const t = TIPOS_BANERA_FV.find(x => x.tipo === value);
            setFormData({ ...formData, tipoProducto: value, tiempoCicloTeorico: t ? String(t.seg) : formData.tiempoCicloTeorico });
            return;
        }
        setFormData({ ...formData, [name]: value });
    };

    const tipoBanera = TIPOS_BANERA_FV.find(t => t.tipo === formData.tipoProducto);
    const tiempoRecomendado = esFV ? tipoBanera?.seg : TIEMPO_RECOMENDADO_SEG[formData.planta];

    const { tipoProducto, descripcionProducto, ...basicos } = formData;
    const isFormValid = Object.values(basicos).every(val => val.trim() !== "") && Number(formData.tiempoCicloTeorico) > 0
        && (!esFV || (tipoProducto.trim() !== "" && descripcionProducto.trim() !== ""));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        const data = {
            ...formData,
            tiempoCicloTeorico: Number(formData.tiempoCicloTeorico),
            tipoProducto: esFV ? formData.tipoProducto : "",
            descripcionProducto: esFV ? formData.descripcionProducto.trim() : "",
            creadoPor: currentUserName,
            creadoPorEmail: currentUserEmail,
            realizadoPor: formData.realizadoPor || currentUserName,
        };

        if (evaluacionActual) {
            actualizarEvaluacion(data);
        } else {
            iniciarEvaluacion(data);
        }
        onNext();
    };

    // Sugeridos: personal de la planta elegida según Talento Humano. Se puede elegir cualquier persona de Firplak
    // (pudo ser trasladada sin que la cambiaran en el Gestor de Personal)
    const plantasTH = PLANTA_TALENTO_HUMANO[formData.planta] || [];
    const delaPlanta = [...new Set(empleados.filter(e => plantasTH.includes(e.planta)).map(e => e.nombre))].sort((a, b) => a.localeCompare(b, "es"));

    return (
        <Card className="shadow-lg border-t-4 border-t-primary animate-in slide-in-from-bottom-4 fade-in duration-500 overflow-visible">
            <CardHeader>
                <CardTitle className="text-2xl text-slate-800">Datos Generales</CardTitle>
                <CardDescription>
                    Ingrese la información básica de la evaluación. Estos datos son obligatorios.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="space-y-2">
                            <Label htmlFor="fecha">Fecha</Label>
                            <Input id="fecha" value={evaluacionActual?.fecha || new Date().toISOString().split('T')[0]} disabled className="bg-slate-100 font-medium" />
                        </div>

                        <div className="space-y-0">
                            <SearchableSelect 
                                name="realizadoPor" 
                                label="Realizado por" 
                                options={operarios} 
                                placeholder="Seleccione persona que realiza" 
                                required={true}
                                defaultValue={formData.realizadoPor}
                                onValueChange={(val) => handleSelect("realizadoPor", val)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="planta">Planta</Label>
                            <Select value={formData.planta} onValueChange={(val) => val !== null && handleSelect("planta", val)}>
                                <SelectTrigger id="planta" className={`border-slate-300 ${!formData.planta && 'text-slate-500'}`}>
                                    <SelectValue placeholder="Seleccionar planta" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.keys(PROCESOS_POR_PLANTA).map(planta => (
                                        <SelectItem key={planta} value={planta}>{planta}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-0">
                            <SearchableSelect 
                                name="puesto" 
                                label="Puesto" 
                                options={puestos} 
                                placeholder="Seleccione un puesto" 
                                required={true}
                                defaultValue={formData.puesto}
                                onValueChange={(val) => handleSelect("puesto", val)}
                            />
                        </div>

                        <div className="space-y-0">
                            <SearchableSelect 
                                name="operario" 
                                label="Operario" 
                                options={operarios}
                                destacados={delaPlanta}
                                tituloDestacados={`Sugeridos · personal de ${formData.planta} en Talento Humano`}
                                tituloResto="Todo el personal de Firplak (trasladados o préstamos)"
                                placeholder="Seleccione un operario"
                                required={true}
                                defaultValue={formData.operario}
                                onValueChange={(val) => handleSelect("operario", val)}
                            />
                        </div>

                        {esFV && (
                            <div className="space-y-2">
                                <Label htmlFor="tipoProducto">Tipo de bañera</Label>
                                <Select value={formData.tipoProducto} onValueChange={(val) => val !== null && handleSelect("tipoProducto", val)}>
                                    <SelectTrigger id="tipoProducto" className={`border-slate-300 ${!formData.tipoProducto && 'text-slate-500'}`}>
                                        <SelectValue placeholder="Seleccionar tipo de bañera" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {TIPOS_BANERA_FV.map(t => (
                                            <SelectItem key={t.tipo} value={t.tipo}>{t.tipo} · {t.ejemplo}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-slate-500">El tipo define el tiempo de ciclo teórico.</p>
                            </div>
                        )}

                        {esFV && (
                            <div className="space-y-2">
                                <Label htmlFor="descripcionProducto">Descripción de la bañera</Label>
                                <Input id="descripcionProducto" name="descripcionProducto" value={formData.descripcionProducto} onChange={handleChange}
                                    placeholder="Ej. Tahití, Honolulu, Cataluña..." className="border-slate-300" required />
                                <p className="text-xs text-slate-500">Referencia de la bañera que se evalúa.</p>
                            </div>
                        )}

                        <div className="space-y-2 relative">
                            <div className="flex items-center gap-2 relative">
                                <Label htmlFor="tiempo">Tiempo Ciclo Teórico (segundos)</Label>
                                <button type="button" onClick={() => setActivePopup(!activePopup)} onBlur={() => setTimeout(() => setActivePopup(false), 200)} className="text-slate-400 hover:text-primary transition-colors">
                                    <Info size={16} />
                                </button>
                                {activePopup && (
                                    <div className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 p-4 bg-white border border-slate-200 rounded-lg shadow-xl z-50 text-xs text-slate-700 animate-in fade-in zoom-in-95">
                                        <p className="font-bold mb-1 text-sm text-primary">¿Qué es el tiempo de ciclo?</p>
                                        <p className="mb-3 text-slate-500 leading-relaxed">Es el tiempo promedio que se tarda en completar una sola pieza o unidad desde que inicia hasta que termina su proceso de manufactura.</p>
                                        <p className="font-bold mb-1 text-slate-700">Ejemplos de referencia:</p>
                                        <ul className="list-disc pl-4 space-y-1 text-slate-500 font-medium">
                                            <li><span className="text-slate-700 font-bold">MS:</span> 60 segundos</li>
                                            <li><span className="text-slate-700 font-bold">FV:</span> sencilla 17 min (1020 segs), hidromasaje 34 min (2040 segs), multipersonal 51 min (3060 segs)</li>
                                            <li><span className="text-slate-700 font-bold">RTM:</span> 42 minutos (2520 segs)</li>
                                            <li><span className="text-slate-700 font-bold">MBL:</span> 0,421 min/pieza (25,26 segs)</li>
                                            <li><span className="text-slate-700 font-bold">CEFI:</span> 0,421 min/pieza (25,26 segs)</li>
                                            <li><span className="text-slate-700 font-bold">RMOLD:</span> 22 minutos (1320 segs)</li>
                                            <li><span className="text-slate-700 font-bold">MOLD:</span> sin tiempo recomendado</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <Input id="tiempo" name="tiempoCicloTeorico" type="number" onWheel={(e) => e.currentTarget.blur()} min="1" step="any" placeholder="Ej. 60" value={formData.tiempoCicloTeorico} onChange={handleChange} className="pl-16 font-bold text-lg border-primary/20 focus:border-primary" required />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-medium">
                                    segs
                                </div>
                            </div>
                            {Number(formData.tiempoCicloTeorico) > 0 && (
                                <p className="text-sm font-medium text-slate-500 mt-1 animate-in fade-in">
                                    Equivale a: <span className="font-bold text-primary">{(Number(formData.tiempoCicloTeorico) / 60).toFixed(2)} minutos</span>
                                </p>
                            )}
                            {formData.planta && (esFV && !tipoBanera ? (
                                <p className="text-sm font-semibold text-[#d14747] mt-1">
                                    Seleccione el tipo de bañera para asignar el tiempo de ciclo teórico.
                                </p>
                            ) : tiempoRecomendado ? (
                                <p className="text-sm font-semibold text-[#d14747] mt-1">
                                    Este es el tiempo recomendado {esFV ? `para bañera ${tipoBanera?.tipo.toLowerCase()}` : `de la planta ${formData.planta}`} ({fmtMin(tiempoRecomendado)} min = {tiempoRecomendado.toLocaleString("es-CO")} segs), verifícalo y corrígelo.
                                    {Number(formData.tiempoCicloTeorico) !== tiempoRecomendado && (
                                        <button type="button" onClick={() => setFormData({ ...formData, tiempoCicloTeorico: String(tiempoRecomendado) })} className="ml-1 underline font-bold hover:text-[#a83636]">Usar el recomendado</button>
                                    )}
                                </p>
                            ) : (
                                <p className="text-sm font-semibold text-[#d14747] mt-1">
                                    La planta {formData.planta} no tiene tiempo recomendado: ingresa el tiempo de ciclo teórico.
                                </p>
                            ))}
                        </div>

                    </div>

                    <div className="pt-6 flex justify-end">
                        <Button type="submit" size="lg" disabled={!isFormValid} className="w-full md:w-auto bg-primary hover:bg-primary/90 text-white shadow-md">
                            Comenzar Hora-Hora <ArrowRight className="ml-2" size={20} />
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
