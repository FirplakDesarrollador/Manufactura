'use client';

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Send, Bot, User, HelpCircle, BookOpen, Clock,
  Activity, CheckCircle2, FileText, Eye, Sparkles, Wrench, BarChart2, Briefcase, Info
} from "lucide-react";
import Header from "@/components/opt-sistemica/Header";

// Comprehensive Application summaries data matching all modules and submodules
const APP_SUMMARIES = [
  {
    id: "control-piso",
    title: "Control de Piso",
    icon: Activity,
    color: "border-l-[#324354] text-[#324354]",
    description: "Módulo principal para reportar la producción diaria por estación en las plantas de manufactura. Permite registrar las piezas vaciadas, pulidas, pintadas y empacadas.",
    submodules: [
      { name: "Control de Piso Mármol", desc: "Reporte operativo para la planta de Mármol Sintético por estación de trabajo." },
      { name: "Control de Piso Muebles", desc: "Monitoreo y registro de piezas en la planta de ensamble de madera." },
      { name: "Control de Piso Fibra", desc: "Seguimiento de la producción en la planta de Fibra de Vidrio (bañeras y jacuzzis)." }
    ],
    tips: ["Verifica tu línea de producción antes de iniciar el registro diario.", "Registra las piezas al finalizar cada tanda de trabajo para no perder trazabilidad."]
  },
  {
    id: "calidad",
    title: "Calidad",
    icon: CheckCircle2,
    color: "border-l-[#7B8E90] text-[#7B8E90]",
    description: "Auditoría, control e inspección de producto terminado. Permite registrar defectos, clasificar piezas no conformes y asegurar que los productos cumplan con los estándares antes del despacho.",
    submodules: [
      { name: "Indicadores Calidad", desc: "Módulo de estadísticas de rendimiento y defectos promedio de calidad." },
      { name: "Calidad MS", desc: "Registro específico de inspección para piezas de Mármol Sintético." },
      { name: "Ficha RRC (Respuesta Rápida Calidad)", desc: "Tarjeta de control y corrección ante incidentes graves de calidad o materia prima." },
      { name: "Criterios de Calidad", desc: "Catálogo visual de defectos admisibles y no admisibles por producto." },
      { name: "Plan de Vigilancia", desc: "Pautas de chequeo sistemático del proceso en puntos críticos de control." },
      { name: "QRQC", desc: "Flujo de Respuesta Rápida de Control de Calidad ante quejas o fallas graves." }
    ],
    tips: ["Registra siempre la causa raíz del defecto en la Ficha RRC.", "Revisa los Criterios de Calidad visuales si tienes dudas sobre la gravedad de un defecto."]
  },
  {
    id: "sistema-produccion",
    title: "Sistema de Producción",
    icon: FileText,
    color: "border-l-[#324354] text-[#324354]",
    description: "Gestión de la eficiencia y estandarización del proceso productivo. Integra el monitoreo de rendimiento, comportamiento seguro (OPT) e ideas de mejora.",
    submodules: [
      { name: "Estadísticas del Sistema", desc: "Panel consolidado con los históricos de OPT, Hora a Hora y estándares por planta." },
      { name: "Bitácora de Turno", desc: "Reporte diario de novedades, incidencias y cumplimiento de actividades programadas." },
      { name: "HDT Hoja División de Trabajo", desc: "Estandarización del trabajo y desglose de operaciones clave por autor y sección." },
      { name: "Hora a Hora", desc: "Monitoreo en tiempo real de piezas conformes, defectuosas y desperdicios por hora." },
      { name: "OPT Operativa", desc: "Auditoría de comportamientos seguros de los colaboradores (EPP, ergonomía, 5S)." },
      { name: "OPT Sistémica", desc: "Programación semanal de observaciones y seguimiento al calendario de auditorías." },
      { name: "5'S", desc: "Estándar y auditoría de orden, aseo e inspección de puestos de trabajo." },
      { name: "Tarjetas Excelencia", desc: "Sugerencias de mejora aportadas por el personal de planta para optimizar procesos." }
    ],
    tips: ["Registra el Hora a Hora puntualmente al finalizar cada hora.", "Utiliza las Tarjetas de Excelencia para proponer cambios que reduzcan los desperdicios."]
  },
  {
    id: "mantenimiento",
    title: "Mantenimiento",
    icon: Wrench,
    color: "border-l-[#7B8E90] text-[#7B8E90]",
    description: "Control de mantenimiento autónomo y preventivo de maquinaria de planta. Registra anomalías y lecciones LUP para evitar paradas no programadas.",
    submodules: [
      { name: "Indicadores Mantenimiento", desc: "KPIs de paros, disponibilidad de equipos y tiempos promedio de reparación." },
      { name: "Tarjetas de Anomalías", desc: "Reporte de condiciones anormales o fallas detectadas en máquinas para intervención." },
      { name: "Gestión de Mantenimiento", desc: "Ordenación de tareas, preventivos programados e historial de fallas." },
      { name: "Almacén", desc: "Control de inventario de repuestos y materiales de mantenimiento." },
      { name: "Máquinas", desc: "Ficha técnica, planos y manuales de los activos críticos de la empresa." },
      { name: "Mantenimiento Autónomo LILAC", desc: "Checklist de inspección diaria de limpieza, lubricación y ajuste realizado por el operario." },
      { name: "Puestas a Punto", desc: "Parámetros estándar de operación inicial para asegurar la calidad de la primera pieza." },
      { name: "Controles Visuales", desc: "Señalizaciones y ayudas visuales para evitar errores operativos en máquinas." },
      { name: "Lecciones LUP", desc: "Lecciones de Un Punto para el entrenamiento rápido sobre componentes de máquinas." },
      { name: "Principio de Máquina", desc: "Descripción técnica del funcionamiento básico y riesgos de cada equipo." }
    ],
    tips: ["Registra las anomalías tan pronto las identifiques para evitar que escalen a daños graves.", "Realiza el Mantenimiento Autónomo LILAC antes de encender cualquier máquina al inicio de turno."]
  },
  {
    id: "tablero-control",
    title: "Tablero de Control",
    icon: BarChart2,
    color: "border-l-[#324354] text-[#324354]",
    description: "Consolidación de indicadores clave de productividad en la planta de Firplak. Integra reportes automáticos y paneles manuales editables en tiempo real.",
    submodules: [
      { name: "Tablero BI", desc: "Visor interactivo que embebe el reporte de Power BI de producción mediante un iframe." },
      { name: "Tablero Manual", desc: "Control de 7 KPIs manuales (Nivel Servicio, Productividad %, Productividad PZ, Productividad KG, Calidad, Presentismo, Accidentes) con semáforo dinámico." }
    ],
    tips: ["Haz clic sobre cualquier indicador en el Tablero Manual para editar su valor y guardar la meta diaria.", "El color de fondo cambiará automáticamente (Verde, Amarillo, Rojo) según alcances o no la meta configurada."]
  },
  {
    id: "inventarios",
    title: "Inventarios",
    icon: Briefcase,
    color: "border-l-[#7B8E90] text-[#7B8E90]",
    description: "Consulta rápida de existencias de materias primas, materiales en tránsito y stock de producto terminado en almacenes de la planta.",
    tips: ["Usa los filtros de almacén para aislar existencias específicas.", "Reporta cualquier descuadre de inventario inmediatamente."]
  },
  {
    id: "consulta-sap",
    title: "Consulta SAP",
    icon: Info,
    color: "border-l-[#324354] text-[#324354]",
    description: "Consulta integrada de órdenes de fabricación, estado de entrega de lotes y especificaciones técnicas de materiales en SAP sin salir de la plataforma.",
    tips: ["Asegúrate de copiar correctamente el número de orden de fabricación de SAP antes de consultar."]
  },
  {
    id: "talento-humano",
    title: "Talento Humano",
    icon: User,
    color: "border-l-[#7B8E90] text-[#7B8E90]",
    description: "Portal externo de autogestión de nómina, certificados laborales, capacitaciones, vacaciones y beneficios para todos los colaboradores de Firplak.",
    tips: ["Se abre en una pestaña externa y asocia tu correo de sesión automáticamente."]
  }
];

// Expanded Chatbot Knowledge Base
const KNOWLEDGE_BASE: Record<string, string> = {
  hola: "¡Hola! Soy tu **Asistente de Manufactura Firplak**. Estoy entrenado para ayudarte con cualquier duda sobre la jerarquía y el funcionamiento de todos los módulos y submódulos de nuestra aplicación de planta. ¿Qué módulo te gustaría consultar hoy?",
  
  "control de piso": "El módulo de **Control de Piso** permite registrar la producción diaria de piezas procesadas. \n\nCuenta con **3 submódulos**:\n* **Control de Piso Mármol:** Registro de vaciado, pulido y empaque de mármol sintético.\n* **Control de Piso Muebles:** Reporte de corte, enchape e inspección de madera.\n* **Control de Piso Fibra:** Registro de vaciado y acabado de bañeras.\n\n*Tip:* Asegúrate de verificar tu línea y operario antes de reportar la producción diaria.",
  
  calidad: "El módulo de **Calidad** se utiliza para asegurar que todos los productos cumplan los estándares exigidos antes del despacho al CEDI.\n\nCuenta con **6 submódulos**:\n1. **Indicadores Calidad:** Gráficas de rendimiento y defectos promedio.\n2. **Calidad MS:** Registro de inspección de piezas de mármol.\n3. **Ficha RRC:** Reporte de Respuesta Rápida de Calidad ante anomalías.\n4. **Criterios de Calidad:** Catálogo de fallas permitidas y no permitidas.\n5. **Plan de Vigilancia:** Chequeo en puntos críticos del proceso.\n6. **QRQC:** Flujo de análisis rápido de fallas graves.\n\n*Tip:* Usa la Ficha RRC de inmediato ante incidentes graves de calidad.",
  
  "sistema de produccion": "El **Sistema de Producción** gestiona la eficiencia y estandarización del proceso productivo.\n\nCuenta con **8 submódulos**:\n1. **Estadísticas del Sistema:** Historial de KPIs e indicadores.\n2. **Bitácora de Turno:** Registro de novedades y actividades programadas.\n3. **HDT Hoja División de Trabajo:** Estandarización de operaciones.\n4. **Hora a Hora:** Comparación en tiempo real de producción contra meta.\n5. **OPT Operativa:** Auditoría de seguridad y 5S a operarios.\n6. **OPT Sistémica:** Programación semanal y calendario de auditorías.\n7. **5'S:** Estándares de clasificación, orden y limpieza.\n8. **Tarjetas Excelencia:** Propuestas de mejora del personal.\n\n*Tip:* Registra el Hora a Hora al final de cada hora laboral.",
  
  mantenimiento: "El módulo de **Mantenimiento** está enfocado en cuidar la confiabilidad de las máquinas en planta y evitar paros no programados.\n\nCuenta con **10 submódulos**:\n1. **Indicadores Mantenimiento:** Tiempos de parada y KPIs de fallas.\n2. **Tarjetas de Anomalías:** Reporte de fallas detectadas en máquinas.\n3. **Gestión de Mantenimiento:** Programación de preventivos y correctivos.\n4. **Almacén:** Inventario de repuestos.\n5. **Máquinas:** Planos y manuales técnicos.\n6. **Mantenimiento Autónomo LILAC:** Limpieza, Lubricación, Ajuste e Inspección diaria.\n7. **Puestas a Punto:** Parámetros ideales para iniciar un lote.\n8. **Controles Visuales:** Ayudas visuales en las máquinas.\n9. **Lecciones LUP:** Entrenamiento rápido sobre componentes.\n10. **Principio de Máquina:** Concepto básico de funcionamiento.\n\n*Tip:* Realiza el checklist LILAC antes del inicio del turno.",
  
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
  const [activeTab, setActiveTab] = useState<'assistant' | 'glossary'>('assistant');
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      text: KNOWLEDGE_BASE.hola,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      let response = "Disculpa, no logré entender la consulta sobre manufactura. Intenta preguntar sobre: **Control de Piso**, **Calidad**, **Mantenimiento**, **Sistema de Producción**, **Tablero de Control**, **Cultura** o **5S**.";
      
      const cleanText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
      for (const key of Object.keys(KNOWLEDGE_BASE)) {
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
    "¿Qué submódulos tiene Calidad?",
    "¿Qué es Sistema de Producción?",
    "¿Qué es Mantenimiento?",
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

      {/* Subheader Toggler (Tabs) */}
      <div className="flex justify-center border-b border-[#e2ded5] relative z-10 w-full bg-white/50 backdrop-blur-md">
        <div className="flex space-x-12">
          <button
            onClick={() => setActiveTab('assistant')}
            className={`py-4 px-6 text-sm font-semibold tracking-wider transition-all relative cursor-pointer uppercase ${
              activeTab === 'assistant' 
                ? 'text-[#324354] border-b-2 border-[#324354]' 
                : 'text-slate-400 hover:text-[#324354]'
            }`}
          >
            Asistente Virtual
          </button>
          <button
            onClick={() => setActiveTab('glossary')}
            className={`py-4 px-6 text-sm font-semibold tracking-wider transition-all relative cursor-pointer uppercase ${
              activeTab === 'glossary' 
                ? 'text-[#324354] border-b-2 border-[#324354]' 
                : 'text-slate-400 hover:text-[#324354]'
            }`}
          >
            Glosario de Módulos
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex flex-col justify-start p-6 md:p-12 pt-6 max-w-4xl mx-auto w-full">
        
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
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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

        {/* Tab 2: Application Glossary */}
        {activeTab === 'glossary' && (
          <div className="flex flex-col space-y-6 w-full animate-fade-in pb-12">
            <header className="mb-4 flex items-center gap-3 text-[#324354]">
              <BookOpen size={24} />
              <h2 className="text-2xl font-bold uppercase tracking-wider font-display">Glosario de Aplicaciones</h2>
            </header>

            <div className="space-y-6">
              {APP_SUMMARIES.map(app => {
                const IconComponent = app.icon;
                return (
                  <Card key={app.id} className={`shadow-[0_4px_25px_rgba(50,67,84,0.05)] border border-[#e2ded5] hover:border-[#324354] transition duration-200 bg-white rounded-3xl overflow-hidden`}>
                    <CardHeader className="py-4 px-6 bg-[#324354]/5 border-b border-[#e2ded5] flex flex-row items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#324354]/10 flex items-center justify-center text-[#324354]">
                        <IconComponent size={20} />
                      </div>
                      <span className="text-lg font-bold text-[#324354]">{app.title}</span>
                    </CardHeader>
                    
                    <CardContent className="p-6 space-y-4">
                      <p className="text-sm text-slate-600 leading-relaxed font-medium">
                        {app.description}
                      </p>
                      
                      {/* Submodules list if present */}
                      {app.submodules && (
                        <div className="space-y-3 pt-1 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Submódulos y Herramientas:</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {app.submodules.map((sub, sIdx) => (
                              <div key={sIdx} className="bg-slate-50 border border-slate-100 p-3 rounded-2xl">
                                <span className="text-xs font-bold text-[#324354] block">{sub.name}</span>
                                <span className="text-[11px] text-slate-500 mt-1 block">{sub.desc}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tips alert box */}
                      <div className="bg-[#F6F3EE] p-4 rounded-2xl border border-[#e2ded5] space-y-1">
                        <span className="text-[10px] text-[#7B8E90] font-bold uppercase tracking-wider block mb-2">Recomendaciones Clave:</span>
                        <ul className="space-y-2">
                          {app.tips.map((tip, idx) => (
                            <li key={idx} className="text-xs text-slate-600 flex items-start gap-2 font-medium">
                              <span className="text-[#324354] font-bold mt-0.5">&bull;</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
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
