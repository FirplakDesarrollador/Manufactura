'use client';

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, Bot, User, HelpCircle, BookOpen, Clock,
  Activity, CheckCircle2, FileText, Eye, Sparkles, Wrench, BarChart2, Briefcase, Info, Network, Search, ChevronRight, ArrowRight, ExternalLink, Construction
} from "lucide-react";
import Header from "@/components/opt-sistemica/Header";
import { MODULOS, GRUPOS, FLUJO, responder, type Modulo, type Pestana } from "@/lib/asistencia/conocimiento";

const quitarTildes = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const textoModulo = (m: Modulo) => quitarTildes([m.nombre, m.que, ...(m.submodulos || []).flatMap(s => [s.nombre, s.que, ...(s.pestanas || []).flatMap(p => [p.nombre, p.que])]), ...(m.pestanas || []).flatMap(p => [p.nombre, p.que])].join(" "));

function Chip({ estado }: { estado?: 'construccion' | 'externo' }) {
  if (!estado) return null;
  return estado === 'construccion'
    ? <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1"><Construction size={10} /> En construcción</span>
    : <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 inline-flex items-center gap-1"><ExternalLink size={10} /> Externo</span>;
}

function ListaPestanas({ pestanas }: { pestanas: Pestana[] }) {
  return (
    <ul className="mt-2 space-y-1.5">
      {pestanas.map(p => (
        <li key={p.nombre} className="text-[11px] leading-snug pl-3 border-l-2 border-[#e2ded5]">
          <span className="font-bold text-[#324354]">{p.nombre}:</span> <span className="text-slate-600">{p.que}</span>
          {p.como && <div className="text-[10px] text-[#7B8E90] mt-0.5"><b>Cómo se usa:</b> {p.como}</div>}
        </li>
      ))}
    </ul>
  );
}

// El glosario y la jerarquía vienen de lib/asistencia/conocimiento.ts (módulo → submódulo → pestaña)

// Expanded Chatbot Knowledge Base
const KNOWLEDGE_BASE: Record<string, string> = {
  hola: "¡Hola! Soy tu **Asistente de Manufactura Firplak**. Estoy entrenado para ayudarte con cualquier duda sobre la jerarquía y el funcionamiento de todos los módulos y submódulos de nuestra aplicación de planta. ¿Qué módulo te gustaría consultar hoy?",
  
  "control de piso": "El módulo de **Control de Piso** permite registrar la producción diaria de piezas procesadas. \n\nCuenta con **3 submódulos**:\n* **Control de Piso Mármol:** Registro de vaciado, pulido y empaque de mármol sintético.\n* **Control de Piso Muebles:** Reporte de corte, enchape e inspección de madera.\n* **Control de Piso Fibra:** Registro de vaciado y acabado de bañeras.\n\n*Tip:* Asegúrate de verificar tu línea y operario antes de reportar la producción diaria.",
  
  calidad: "El módulo de **Calidad** se utiliza para asegurar que todos los productos cumplan los estándares exigidos antes del despacho al CEDI.\n\nCuenta con **6 submódulos**:\n1. **Indicadores Calidad:** Gráficas de rendimiento y defectos promedio.\n2. **Calidad MS:** Registro de inspección de piezas de mármol.\n3. **Ficha RRC:** Reporte de Respuesta Rápida de Calidad ante anomalías.\n4. **Criterios de Aceptación y Rechazo:** Catálogo de fallas permitidas y no permitidas por planta.\n5. **Plan de Vigilancia:** Chequeo en puntos críticos del proceso.\n6. **QRQC:** Flujo de análisis rápido de fallas graves.\n\n*Tip:* Usa la Ficha RRC de inmediato ante incidentes graves de calidad.",
  
  "sistema de produccion": "El **Sistema de Producción** gestiona la eficiencia y estandarización del proceso productivo.\n\nCuenta con **8 submódulos**:\n1. **Estadísticas del Sistema:** Historial de KPIs e indicadores.\n2. **Bitácora de Turno:** Registro de novedades y actividades programadas.\n3. **HDT Hoja División de Trabajo:** Estandarización de operaciones.\n4. **Hora a Hora:** Comparación en tiempo real de producción contra meta.\n5. **OPT Operativa:** Auditoría de seguridad y 5S a operarios.\n6. **OPT Sistémica:** Programación semanal y calendario de auditorías.\n7. **5'S:** Estándares de clasificación, orden y limpieza.\n8. **Tarjetas Excelencia:** Propuestas de mejora del personal.\n\n*Tip:* Registra el Hora a Hora al final de cada hora laboral.",
  
  mantenimiento: "El módulo de **Mantenimiento** está enfocado en cuidar la confiabilidad de las máquinas en planta y evitar paros no programados.\n\nCuenta con **10 submódulos**:\n1. **Indicadores Mantenimiento:** Tiempos de parada y KPIs de fallas.\n2. **Tarjetas de Anomalías:** Reporte de fallas detectadas en máquinas.\n3. **Gestor de Mantenimiento:** Programación de preventivos y correctivos.\n4. **Almacén:** Inventario de repuestos.\n5. **Máquinas:** Planos y manuales técnicos.\n6. **Mantenimiento Autónomo LILAC:** Limpieza, Lubricación, Ajuste e Inspección diaria.\n7. **Puestas a Punto:** Parámetros ideales para iniciar un lote.\n8. **Controles Visuales:** Ayudas visuales en las máquinas.\n9. **Lecciones LUP:** Entrenamiento rápido sobre componentes.\n10. **Principio de Máquina:** Concepto básico de funcionamiento.\n\n*Tip:* Realiza el checklist LILAC antes del inicio del turno.",
  
  "tablero de control": "El **Tablero de Control** (antes Indicadores de Productividad) permite evaluar las metas operativas.\n\nCuenta con **2 secciones**:\n* **Tablero BI:** Reporte interactivo que embebe Power BI.\n* **Tablero Manual:** Registro directo de 7 KPIs clave (Nivel Servicio, Productividad %, Productividad PZ, Productividad KG, Calidad, Presentismo, Accidentes).\n\n*Tip:* Cada número es interactivo. Haz clic en él para modificar el valor diario. Se pintará automáticamente en Verde, Amarillo o Rojo según la meta.",
  
  inventarios: "El módulo de **Inventarios** te ayuda a verificar las existencias de stock y materias primas en los distintos almacenes de la planta. Úsalo para planificar tu producción antes de iniciar el turno.",
  
  sap: "El módulo de **Consulta SAP** te permite buscar de forma rápida información sobre órdenes de fabricación de SAP y estado de entrega de materiales sin necesidad de salir del aplicativo.",
  
  "talento humano": "El módulo de **Talento Humano** redirige al portal de autogestión de Firplak para revisar desprendibles de nómina, certificados, programar vacaciones y capacitaciones vigentes.",
  
  cultura: "El módulo de **Cultura** te permite ver comunicados corporativos, los valores de Firplak, boletines y las actividades del comité de bienestar y convivencia.",
  
  asistencia: "La sección de **Asistencia** es esta misma página. Te provee un Asistente Virtual conversacional para resolver dudas operativas y un Glosario interactivo con información de todos los módulos del sistema.",
  
  configuracion: "El panel de **Configuración** sirve para gestionar usuarios y sus roles (Jefe, Supervisor, Operario, Calidad) y asignar permisos granulares a cada pantalla y submódulo."
};

interface Message {
  sender: "user" | "bot";
  text: string;
  timestamp: Date;
}

export default function AsistenciaPage() {
  const [activeTab, setActiveTab] = useState<'assistant' | 'glossary' | 'jerarquia'>('assistant');
  const [filtroGlosario, setFiltroGlosario] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: KNOWLEDGE_BASE.hola,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, activeTab]);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const newMsg: Message = {
      sender: "user",
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMsg]);
    setInputValue("");
    setIsTyping(true);

    // Process response with simulated delay
    setTimeout(() => {
      let response = "Disculpa, no logré entender la consulta sobre manufactura. Pregunta por cualquier módulo, submódulo o pestaña, por ejemplo: **Control de Piso Fibra**, **Traslados**, **Digitado**, **Parámetros**, **Calidad MS**, **Gestor de Mantenimiento**, **Informe de Turno** o **Tablero de Control**. También puedes revisar la pestaña **Jerarquía**.";
      
      const cleanText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      // Primero la base de conocimiento completa (módulo → submódulo → pestaña); el saludo sigue en la base corta
      const encontrada = /^\s*(hola|buen[oa]s)/.test(cleanText) ? null : responder(text);
      if (encontrada) response = encontrada;
      else for (const key of Object.keys(KNOWLEDGE_BASE)) {
        if (cleanText.includes(key)) {
          response = KNOWLEDGE_BASE[key];
          break;
        }
      }

      setMessages(prev => [...prev, {
        sender: "bot",
        text: response,
        timestamp: new Date()
      }]);
      setIsTyping(false);
    }, 600);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage(inputValue);
    }
  };

  // FAQ suggestion chips
  const suggestions = [
    "¿Qué es Control de Piso?",
    "¿Qué hace Traslados?",
    "¿Cómo funciona Digitado en Fibra?",
    "¿Qué submódulos tiene Calidad?",
    "¿Qué tiene el Gestor de Mantenimiento?",
    "¿Cómo usar el Tablero de Control?"
  ];

  // Helper to render markdown-like bold and bullets nicely
  const renderMessageText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, idx) => {
      let processed = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(line)) !== null) {
        parts.push(processed.substring(lastIndex, match.index));
        parts.push(<strong key={match.index} className="font-extrabold text-[#324354]">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      parts.push(processed.substring(lastIndex));
      
      const isBullet = line.trim().startsWith("*");
      if (isBullet) {
        return (
          <li key={idx} className="list-disc ml-5 mt-1 text-slate-700">
            {parts.length > 1 ? parts : line.trim().substring(1).trim()}
          </li>
        );
      }
      return (
        <p key={idx} className="mt-1 text-slate-700 leading-relaxed">
          {parts.length > 1 ? parts : line}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] relative overflow-x-hidden selection:bg-[#324354] selection:text-white">
      
      {/* Background Subtle Gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[45%] h-[45%] rounded-full bg-slate-200/40 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#324354]/5 blur-[120px]" />
      </div>

      {/* Premium Header */}
      <Header
        title="Asistencia"
        subtitle="Centro de Soporte Planta"
      />

      {/* Montserrat and Jost fonts declarations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800&family=Jost:wght@300;400;500;600&display=swap');
        body {
            font-family: 'Montserrat', sans-serif !important;
        }
      `}} />

      {/* Subheader Toggler (Pills layout matching Hora a Hora) */}
      <div className="bg-white border-b border-[#e2ded5] px-3 shadow-2xs relative z-10 w-full font-sans py-1.5 xl:py-0 xl:h-10 flex items-center">
        <div className="max-w-4xl w-full mx-auto px-3 flex justify-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`inline-flex items-center gap-2 h-7 px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'assistant'
                ? 'bg-[#324354] text-white border-[#324354] shadow-sm'
                : 'bg-white text-slate-600 border-[#e2ded5] hover:bg-slate-50'
            }`}
          >
            <Bot size={16} />
            <span>Asistente Virtual</span>
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`inline-flex items-center gap-2 h-7 px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'glossary'
                ? 'bg-[#324354] text-white border-[#324354] shadow-sm'
                : 'bg-white text-slate-600 border-[#e2ded5] hover:bg-slate-50'
            }`}
          >
            <BookOpen size={16} />
            <span>Glosario de Módulos</span>
          </button>
          <button
            onClick={() => setActiveTab('jerarquia')}
            className={`inline-flex items-center gap-2 h-7 px-3 rounded-lg text-[11px] sm:text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'jerarquia'
                ? 'bg-[#324354] text-white border-[#324354] shadow-sm'
                : 'bg-white text-slate-600 border-[#e2ded5] hover:bg-slate-50'
            }`}
          >
            <Network size={16} />
            <span>Jerarquía</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-start p-3 sm:p-6 md:px-10 pt-6 max-w-6xl mx-auto w-full">
        
        {/* Tab 1: Virtual Assistant */}
        {activeTab === 'assistant' && (
          <div className="flex flex-col h-[calc(100vh-270px)] bg-white rounded-3xl border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.05)] overflow-hidden animate-fade-in w-full">
            
            {/* Chat Header */}
            <div className="bg-[#324354]/5 border-b border-[#e2ded5] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#324354] flex items-center justify-center text-white">
                  <Bot size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-[#324354] text-sm">Asistente Virtual de Manufactura</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] text-slate-500 font-semibold">En línea (Soporte Planta)</span>
                  </div>
                </div>
              </div>
              <HelpCircle size={20} className="text-slate-400" />
            </div>

            {/* Message List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F6F3EE]/30">
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex items-start gap-3 max-w-[85%] ${
                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${
                    msg.sender === "user" ? "bg-[#7B8E90]" : "bg-[#324354]"
                  }`}>
                    {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className={`p-4 rounded-2xl text-sm shadow-sm border ${
                    msg.sender === "user" 
                      ? "bg-[#324354] text-white border-[#324354] rounded-tr-none" 
                      : "bg-white text-slate-700 border-[#e2ded5] rounded-tl-none"
                  }`}>
                    {renderMessageText(msg.text)}
                    <span className={`text-[8px] block text-right mt-2 opacity-60 ${
                      msg.sender === "user" ? "text-white/80" : "text-slate-400"
                    }`}>
                      {mounted ? msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-[#324354] flex items-center justify-center text-white">
                    <Bot size={14} />
                  </div>
                  <div className="bg-white border border-[#e2ded5] p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-300"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggestions Quick Buttons */}
            <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap gap-2 justify-center">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s)}
                  className="text-xs px-4 py-2 bg-[#F6F3EE] text-[#324354] border border-[#e2ded5] rounded-full hover:bg-[#324354] hover:text-white transition duration-250 font-semibold cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-[#e2ded5] bg-white flex items-center gap-2">
              <Input
                type="text"
                placeholder="Haz una pregunta sobre el entorno de Manufactura..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                className="flex-1 bg-[#F6F3EE]/30 border-[#e2ded5] focus-visible:ring-[#324354] rounded-xl h-11"
              />
              <Button 
                onClick={() => handleSendMessage(inputValue)}
                className="bg-[#324354] hover:bg-[#283643] text-white w-11 h-11 p-0 rounded-xl flex items-center justify-center shadow-md transition cursor-pointer"
              >
                <Send size={18} />
              </Button>
            </div>

          </div>
        )}

        {/* Tab 2: Glosario de Módulos — todos los módulos con submódulos, pestañas, cómo se usan y consejos */}
        {activeTab === 'glossary' && (
          <div className="flex flex-col space-y-5 w-full animate-fade-in pb-12">
            <header className="flex flex-wrap items-center justify-between gap-3 text-[#324354]">
              <div className="flex items-center gap-3">
                <BookOpen size={24} />
                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider font-display">Glosario de Módulos</h2>
              </div>
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={filtroGlosario} onChange={e => setFiltroGlosario(e.target.value)} placeholder="Buscar módulo, pestaña o función…"
                  className="w-full h-9 pl-9 pr-3 bg-white border border-[#e2ded5] rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-[#7B8E90]" />
              </div>
            </header>
            <p className="text-xs text-slate-500 font-medium -mt-2">
              {MODULOS.length} módulos de la app Manufactura. Cada uno con lo que hace, sus submódulos y pestañas, cómo se usa cada una y con qué otros módulos se conecta.
            </p>

            {GRUPOS.map(grupo => {
              const q = quitarTildes(filtroGlosario.trim());
              const mods = MODULOS.filter(m => m.grupo === grupo && (!q || textoModulo(m).includes(q)));
              if (!mods.length) return null;
              return (
                <section key={grupo} className="space-y-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-[#7B8E90]">{grupo}</h3>
                  {mods.map(m => (
                    <Card key={m.id} id={`mod-${m.id}`} className="shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] bg-white rounded-3xl overflow-hidden">
                      <CardHeader className="py-3 px-5 bg-[#324354]/5 border-b border-[#e2ded5] flex flex-row flex-wrap items-center gap-2">
                        <span className="text-lg font-bold text-[#324354]">{m.nombre}</span>
                        <Chip estado={m.estado} />
                        <span className="ml-auto text-[10px] font-mono text-slate-400">{m.ruta}</span>
                      </CardHeader>
                      <CardContent className="p-5 space-y-4">
                        <p className="text-sm text-slate-700 leading-relaxed font-medium">{m.que}</p>
                        {m.quien && <p className="text-[11px] text-slate-500"><b className="text-[#324354]">Lo usan:</b> {m.quien}</p>}

                        {m.submodulos && (
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block pt-2">Submódulos ({m.submodulos.length})</span>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {m.submodulos.map(s => (
                                <div key={s.nombre} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-bold text-[#324354]">{s.nombre}</span>
                                    <Chip estado={s.estado} />
                                  </div>
                                  <span className="text-[11px] text-slate-600 mt-1 block leading-snug">{s.que}</span>
                                  {s.pestanas && <ListaPestanas pestanas={s.pestanas} />}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {m.pestanas && (
                          <div className="pt-1 border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block pt-2">Pestañas ({m.pestanas.length})</span>
                            <ListaPestanas pestanas={m.pestanas} />
                          </div>
                        )}

                        {(m.consejos.length > 0 || m.conecta) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {m.consejos.length > 0 && (
                              <div className="bg-[#F6F3EE] p-3 rounded-2xl border border-[#e2ded5]">
                                <span className="text-[10px] text-[#7B8E90] font-bold uppercase tracking-wider block mb-1.5">Recomendaciones clave</span>
                                <ul className="space-y-1.5">
                                  {m.consejos.map((c, i) => <li key={i} className="text-xs text-slate-600 flex items-start gap-2"><span className="text-[#324354] font-bold">&bull;</span><span>{c}</span></li>)}
                                </ul>
                              </div>
                            )}
                            {m.conecta && (
                              <div className="bg-white p-3 rounded-2xl border border-[#e2ded5]">
                                <span className="text-[10px] text-[#7B8E90] font-bold uppercase tracking-wider block mb-1.5">Se conecta con</span>
                                <ul className="space-y-1.5">
                                  {m.conecta.map((c, i) => <li key={i} className="text-xs text-slate-600 flex items-start gap-2"><ArrowRight size={12} className="text-[#324354] mt-0.5 shrink-0" /><span>{c}</span></li>)}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </section>
              );
            })}
          </div>
        )}

        {/* Tab 3: Jerarquía — árbol completo de la app (módulo → submódulo → pestaña) y flujo de la información */}
        {activeTab === 'jerarquia' && (
          <div className="flex flex-col space-y-5 w-full animate-fade-in pb-12">
            <header className="flex items-center gap-3 text-[#324354]">
              <Network size={24} />
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider font-display">Jerarquía de la aplicación</h2>
            </header>

            {/* Flujo de la información */}
            <section className="bg-white rounded-3xl border border-[#e2ded5] p-4 sm:p-5 shadow-[0_4px_25px_rgba(50,67,84,0.05)]">
              <h3 className="text-sm font-black text-[#324354] mb-3">Cómo fluye la información</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {FLUJO.map((f, i) => (
                  <div key={f.paso} className="relative rounded-2xl bg-[#F6F3EE] border border-[#e2ded5] p-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-[#324354] text-white text-[11px] font-black flex items-center justify-center shrink-0">{i + 1}</span>
                      <span className="text-xs font-black text-[#324354]">{f.paso}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1.5 leading-snug">{f.detalle}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Árbol */}
            <section className="bg-white rounded-3xl border border-[#e2ded5] p-4 sm:p-5 shadow-[0_4px_25px_rgba(50,67,84,0.05)]">
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
                <h3 className="text-sm font-black text-[#324354]">Mapa completo: Módulo › Submódulo › Pestaña</h3>
                <span className="text-[10px] text-slate-400 font-semibold">Toque un módulo para abrirlo · se recorre igual que el menú ≡ del banner</span>
              </div>
              <div className="space-y-3">
                {GRUPOS.map(grupo => (
                  <div key={grupo}>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#7B8E90] mb-1.5">{grupo}</div>
                    <div className="space-y-1.5">
                      {MODULOS.filter(m => m.grupo === grupo).map(m => {
                        const nSub = m.submodulos?.length || 0;
                        const nTab = (m.pestanas?.length || 0) + (m.submodulos || []).reduce((a, s) => a + (s.pestanas?.length || 0), 0);
                        return (
                          <details key={m.id} className="group rounded-xl border border-[#e2ded5] bg-white open:bg-[#F6F3EE]/50">
                            <summary className="cursor-pointer list-none px-3 py-2 flex items-center gap-2">
                              <ChevronRight size={15} className="text-[#324354] transition-transform group-open:rotate-90 shrink-0" />
                              <span className="text-sm font-bold text-[#324354]">{m.nombre}</span>
                              <Chip estado={m.estado} />
                              <span className="ml-auto text-[10px] text-slate-400 font-semibold whitespace-nowrap">
                                {nSub ? `${nSub} submódulo${nSub > 1 ? 's' : ''}` : ''}{nSub && nTab ? ' · ' : ''}{nTab ? `${nTab} pestaña${nTab > 1 ? 's' : ''}` : ''}
                              </span>
                            </summary>
                            <div className="px-3 pb-3 pl-8 space-y-2">
                              <p className="text-[11px] text-slate-600">{m.que}</p>
                              {(m.submodulos || []).map(s => (
                                <div key={s.nombre} className="border-l-2 border-[#324354]/30 pl-3">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-bold text-[#324354]">{s.nombre}</span>
                                    <Chip estado={s.estado} />
                                    {s.ruta && <span className="text-[9px] font-mono text-slate-400">{s.ruta}</span>}
                                  </div>
                                  <p className="text-[11px] text-slate-500">{s.que}</p>
                                  {s.pestanas && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {s.pestanas.map(p => <span key={p.nombre} title={p.que} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-[#e2ded5] text-slate-600">{p.nombre}</span>)}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {m.pestanas && (
                                <div className="flex flex-wrap gap-1">
                                  {m.pestanas.map(p => <span key={p.nombre} title={p.que} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-[#e2ded5] text-slate-600">{p.nombre}</span>)}
                                </div>
                              )}
                              <button onClick={() => { setFiltroGlosario(''); setActiveTab('glossary'); setTimeout(() => document.getElementById(`mod-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
                                className="text-[11px] font-bold text-[#324354] underline underline-offset-2 hover:text-sky-700">
                                Ver el detalle completo en el Glosario
                              </button>
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-400 text-sm border-t border-[#e2ded5]/40 mt-12 bg-white/20">
        &copy; {new Date().getFullYear()} Firplak. Todos los derechos reservados.
      </footer>
    </div>
  );
}
