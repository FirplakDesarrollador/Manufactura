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
import { createExternalClient } from "@/lib/supabase/external";
import { createClient } from "@/lib/supabase/client";

const PROCESOS_POR_PLANTA: Record<string, string[]> = {
    "MS": ["ACABADO", "DESMOLDE", "EMPAQUE", "PINTURA", "PULIDO", "VACIADO"],
    "FV": ["PINTURA", "VACIADO", "DESMOLDE", "HERRAJES", "PULIDO", "ACABADO", "ENSAMBLE", "ENSAYO", "EMPAQUE"],
    "RTM": ["PINTURA", "INYECCION", "DESMOLDE", "PULIDO", "ACABADO", "EMPAQUE", "ACABADO QZ", "PERFORADO QZ"],
    "MBL": ["CORTE", "ENCHAPE", "RANURADO", "PERFORADO", "EMPAQUE", "CAJAS"],
    "CEFI": ["CORTE", "ENCHAPE", "RANURADO", "PERFORADO", "EMPAQUE", "CAJAS", "MECANIZADO"],
};

export default function BasicInfoStep({ onNext }: { onNext: () => void }) {
    const { evaluacionActual, iniciarEvaluacion, actualizarEvaluacion } = useStore();
    const [operarios, setOperarios] = useState<string[]>([]);
    const [puestos, setPuestos] = useState<string[]>([]);
    const [activePopup, setActivePopup] = useState<boolean>(false);
    const [currentUserName, setCurrentUserName] = useState<string>("");
    const [currentUserEmail, setCurrentUserEmail] = useState<string>("");

    useEffect(() => {
        async function fetchEmpleados() {
            try {
                const externalSupabase = createExternalClient();

                // Fetch Operarios (todos los activos)
                const { data: dataOp, error: errOp } = await externalSupabase
                    .from('empleados')
                    .select('nombreCompleto')
                    .eq('activo', true)
                    .order('nombreCompleto', { ascending: true });
                
                if (errOp) {
                    console.error('Error fetching operarios:', errOp);
                } else if (dataOp) {
                    setOperarios(dataOp.map(d => d.nombreCompleto));
                }

                // Fetch Puestos (cargos)
                const { data: dataCargos, error: errCargos } = await externalSupabase
                    .from('cargos')
                    .select('cargo')
                    .order('cargo', { ascending: true });
                
                if (errCargos) {
                    console.error('Error fetching cargos:', errCargos);
                } else if (dataCargos) {
                    setPuestos(dataCargos.map(d => d.cargo));
                }
            } catch (err) {
                console.error('Error general fetching data:', err);
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

                if (!nombre) {
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
            }
        });
    }, []);

    const [formData, setFormData] = useState({
        planta: evaluacionActual?.planta || "",
        puesto: evaluacionActual?.puesto || "",
        operario: evaluacionActual?.operario || "",
        tiempoCicloTeorico: evaluacionActual?.tiempoCicloTeorico?.toString() || "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelect = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const isFormValid = Object.values(formData).every(val => val.trim() !== "") && Number(formData.tiempoCicloTeorico) > 0;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isFormValid) return;

        const data = {
            ...formData,
            tiempoCicloTeorico: Number(formData.tiempoCicloTeorico),
            creadoPor: currentUserName,
            creadoPorEmail: currentUserEmail,
        };

        if (evaluacionActual) {
            actualizarEvaluacion(data);
        } else {
            iniciarEvaluacion(data);
        }
        onNext();
    };

    return (
        <Card className="shadow-lg border-t-4 border-t-primary animate-in slide-in-from-bottom-4 fade-in duration-500">
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
                                placeholder="Seleccione un operario" 
                                required={true}
                                defaultValue={formData.operario}
                                onValueChange={(val) => handleSelect("operario", val)}
                            />
                        </div>

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
                                            <li><span className="text-slate-700 font-bold">FV:</span> 17 minutos (1020 segs)</li>
                                            <li><span className="text-slate-700 font-bold">RTM:</span> 40 minutos (2400 segs)</li>
                                            <li><span className="text-slate-700 font-bold">MBL:</span> 0.42 min/pieza (25.2 segs)</li>
                                            <li><span className="text-slate-700 font-bold">CEFI:</span> 0.42 min/pieza (25.2 segs)</li>
                                        </ul>
                                    </div>
                                )}
                            </div>
                            <div className="relative">
                                <Input id="tiempo" name="tiempoCicloTeorico" type="number" min="1" step="0.1" placeholder="Ej. 60" value={formData.tiempoCicloTeorico} onChange={handleChange} className="pl-16 font-bold text-lg border-primary/20 focus:border-primary" required />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-medium">
                                    segs
                                </div>
                            </div>
                            {Number(formData.tiempoCicloTeorico) > 0 && (
                                <p className="text-sm font-medium text-slate-500 mt-1 animate-in fade-in">
                                    Equivale a: <span className="font-bold text-primary">{(Number(formData.tiempoCicloTeorico) / 60).toFixed(2)} minutos</span>
                                </p>
                            )}
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
