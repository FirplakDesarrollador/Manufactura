"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import PageContainer from "@/components/layout/PageContainer";
import { 
    ArrowLeft, 
    Home, 
    Send, 
    Bot, 
    User, 
    HelpCircle, 
    BookOpen, 
    Sparkles, 
    FileText, 
    Settings, 
    Eye, 
    Activity, 
    MessageSquare,
    CheckCircle2,
    Lock
} from "lucide-react";

// App summaries data
const APP_SUMMARIES = [
    {
        id: "control-piso",
        title: "Control de Piso",
        icon: Activity,
        color: "border-l-teal-500 text-teal-600",
        description: "Módulo principal para registrar el avance de la producción diaria por operario y puesto de trabajo en las plantas de Mármol, Muebles y Fibra. Permite registrar las piezas vaciadas, pulidas, pintadas y empacadas.",
        tips: ["Verifica tu línea de producción antes de iniciar.", "Registra las piezas al finalizar cada tanda de trabajo."]
    },
    {
        id: "calidad",
        title: "Calidad",
        icon: CheckCircle2,
        color: "border-l-blue-500 text-blue-600",
        description: "Auditoría e inspección de producto terminado. Permite registrar defectos, clasificar piezas no conformes y asegurar que los productos cumplan con los estándares de diseño antes del despacho al CEDI.",
        tips: ["Registra siempre la causa raíz del defecto.", "Usa la clasificación MS para reportes detallados."]
    },
    {
        id: "hora-hora",
        title: "Hora a Hora",
        icon: FileText,
        color: "border-l-[#324354] text-[#324354]",
        description: "Seguimiento en tiempo real de la producción contra la meta teórica de la línea. Registra el rendimiento, la cantidad de piezas conformes y defectuosas, y los desperdicios generados en cada hora del turno.",
        tips: ["Completa el registro al final de cada hora de trabajo.", "Detalla los desperdicios si el rendimiento es menor al 80%."]
    },
    {
        id: "ficha-rcc",
        title: "Ficha RRC (Control y Corrección)",
        icon: FileText,
        color: "border-l-orange-500 text-orange-600",
        description: "Reporte estructurado para acciones de control y corrección ante incidentes de calidad, fallas de máquinas, problemas de materia prima o desviaciones en el proceso.",
        tips: ["Registra las Fichas RRC tan pronto identifiques un incidente.", "Asigna responsables claros para el plan de acción."]
    },
    {
        id: "opt",
        title: "OPT (Observación Preventiva de Trabajo)",
        icon: Eye,
        color: "border-l-purple-500 text-purple-600",
        description: "Auditoría de comportamientos seguros de los operarios en planta. Evalúa 10 criterios clave incluyendo EPP, ergonomía, orden y aseo (5S), plan de control y uso de herramientas.",
        tips: ["Busca retroalimentar al operario de forma constructiva.", "Una buena OPT combina observaciones textuales con registros de checklist."]
    },
    {
        id: "tarjetas-excelencia",
        title: "Tarjetas de Excelencia",
        icon: Sparkles,
        color: "border-l-yellow-500 text-yellow-600",
        description: "Iniciativa de sugerencias de mejora aportadas por el personal de planta. Los operarios pueden reportar ideas para mejorar la seguridad, la productividad o reducir desperdicios.",
        tips: ["Describe la idea de mejora con claridad y sencillez.", "Toma fotografías o añade diagramas si es necesario."]
    },
    {
        id: "estadisticas",
        title: "Estadísticas del Sistema",
        icon: HelpCircle,
        color: "border-l-emerald-500 text-emerald-600",
        description: "Módulo unificado que consolida los históricos de evaluaciones de Hora a Hora y observaciones OPT. Permite filtrar datos por año, mes y planta para análisis de tendencias de productividad.",
        tips: ["Usa los filtros superiores para aislar datos de tu planta.", "Revisa el gráfico de radar para ver el cumplimiento de 5S general."]
    }
];

// Chatbot Knowledge Base
const KNOWLEDGE_BASE: Record<string, string> = {
    hola: "¡Hola! Soy tu **Asistente de Manufactura Firplak**. Estoy entrenado para resolver tus dudas sobre el entorno de Manufactura y nuestras aplicaciones (Control de Piso, Calidad, Hora a Hora, OPT, Fichas RRC, etc.). ¿En qué te puedo colaborar hoy?",
    "control de piso": "El módulo de **Control de Piso** sirve para reportar la producción diaria por estación. \n\n* **¿Cómo registrar?** Ve al módulo, selecciona tu planta (Mármol, Muebles o Fibra), elige tu área (por ejemplo, Pulido o Pintura) y registra las piezas procesadas.\n* **Importante:** Recuerda registrar con tu usuario asignado para que las métricas queden grabadas a tu nombre.",
    calidad: "El módulo de **Calidad** se utiliza para registrar inspecciones y no conformidades.\n\n* Permite documentar los defectos hallados en piezas.\n* Ayuda a separar el producto conforme del no conforme para reprocesar o desechar.\n* Asegura la trazabilidad de la calidad de la planta.",
    "hora a hora": "El módulo **Hora a Hora** permite monitorear el pulso de la producción:\n\n* **Registro:** Cada hora del turno, debes registrar la cantidad de piezas producidas y compararlas contra la meta teórica.\n* **Desperdicios:** Si se generan paradas de línea o fallas de calidad, regístralas en la sección de desperdicios.\n* **Rendimiento:** El sistema calcula automáticamente el rendimiento. La meta estándar es mantenerlo arriba del **90%**.",
    opt: "El módulo **OPT** (Observación Preventiva de Trabajo) evalúa la conducta y seguridad en planta:\n\n* **¿Qué mide?** Seguridad (EPP), ergonomía, 5S (orden y aseo), plan de control y herramientas.\n* **Calificación:** Se calcula una calificación de 0% a 100% en base a los criterios cumplidos y al nivel de detalle registrado en comentarios.\n* **Frecuencia:** Se recomienda realizar observaciones semanales a los operarios de cada línea.",
    rcc: "La **Ficha RRC** es una tarjeta de control y corrección:\n\n* Se abre cuando ocurre un incidente de calidad grave, una desviación del proceso o una falla recurrente.\n* Permite documentar el problema, analizar la causa raíz y proponer un plan de acción correctivo con fecha límite y responsable.",
    excelencia: "Las **Tarjetas de Excelencia** son para proponer ideas de mejora:\n\n* Cualquier colaborador puede crear una tarjeta detallando una oportunidad de mejora en ergonomía, 5S, seguridad o procesos.\n* Las mejores propuestas son evaluadas por el comité de manufactura para su implementación y reconocimiento al creador.",
    "5s": "Las **5S** son el estándar de orden y limpieza en la planta de Firplak:\n\n1. **Seiri (Clasificar):** Separar lo necesario de lo innecesario.\n2. **Seiton (Ordenar):** Un lugar para cada cosa y cada cosa en su lugar.\n3. **Seiso (Limpiar):** Identificar y eliminar fuentes de suciedad.\n4. **Seiketsu (Estandarizar):** Mantener las 3 primeras S mediante instrucciones visuales.\n5. **Shitsuke (Disciplina):** Seguir mejorando continuamente y realizar auditorías (evaluadas en OPT).",
    seguridad: "La seguridad es nuestra máxima prioridad en Firplak:\n\n* **EPP Obligatorio:** Casco, gafas de seguridad, botas con puntera, y protección auditiva según el área (especialmente en vaciado, pulido y corte).\n* **Reportes:** Si ves una condición insegura, repórtala inmediatamente mediante una Ficha RRC o una Tarjeta de Excelencia en seguridad.\n* **OPT:** Recuerda que las observaciones preventivas evalúan siempre el uso de EPP.",
    desperdicios: "Los desperdicios o paros en **Hora a Hora** deben detallarse:\n\n* Registra el tipo de desperdicio (ej. daño máquina, falta material, re-procesos).\n* Escribe un comentario claro para que el supervisor pueda gestionar la solución.\n* El registro exacto de desperdicios alimenta los planes de mantenimiento y abastecimiento.",
    permisos: "Si no puedes ver un módulo en tu pantalla de inicio, se debe a la configuración de tus **Permisos**:\n\n* Un administrador del sistema debe activar tu permiso en el panel de **Configuración de Usuarios**.\n* Los permisos son granulares (puedes tener acceso a Muebles pero no a Mármol, o solo a OPT y Asistencia).",
    error: "Si el sistema presenta fallas de carga o problemas de red:\n\n1. Asegúrate de tener conexión a Internet.\n2. Si estás reportando datos y falla la red, el sistema Hora a Hora tiene almacenamiento local temporal (Local Storage) para no perder tus datos.\n3. Si el error persiste, contacta al administrador del sistema con una captura de pantalla."
};

interface Message {
    sender: "user" | "bot";
    text: string;
    timestamp: Date;
}

export default function AsistenciaPage() {
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
    }, [messages, isTyping]);

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
            let response = "Disculpa, no logré entender la consulta sobre manufactura. Intenta preguntar sobre: **Control de Piso**, **OPT**, **Hora a Hora**, **Calidad**, **5S** o **Seguridad**.";
            
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
        }, 800);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleSendMessage(inputValue);
        }
    };

    // FAQ chips
    const suggestions = [
        "¿Cómo funciona la OPT?",
        "¿Qué son las 5S?",
        "¿Cómo reportar desperdicios?",
        "¿Qué registrar en Control de Piso?",
        "¿Qué hacer ante un error?"
    ];

    // Helper to render markdown-like text nicely
    const renderMessageText = (text: string) => {
        const lines = text.split("\n");
        return lines.map((line, idx) => {
            let processed = line;
            // Handle bolding
            const boldRegex = /\*\*(.*?)\*\*/g;
            const parts = [];
            let lastIndex = 0;
            let match;
            
            while ((match = boldRegex.exec(line)) !== null) {
                parts.push(processed.substring(lastIndex, match.index));
                parts.push(<strong key={match.index} className="font-extrabold text-slate-800">{match[1]}</strong>);
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
        <div className="min-h-screen bg-[#F6F3EE] flex flex-col justify-between font-sans text-[#000000]">
            {/* Header */}
            <header className="w-full bg-[#324354] text-white shadow-md p-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <Link href="/home">
                        <Button variant="ghost" className="gap-2 hover:bg-white/10 hover:text-white">
                            <ArrowLeft size={20} />
                            <span className="hidden sm:inline font-bold">Volver al Home</span>
                        </Button>
                    </Link>
                    <h1 className="font-display font-light text-lg md:text-xl uppercase tracking-widest text-center flex-1">
                        Centro de Asistencia Firplak
                    </h1>
                    <div className="flex flex-col items-end">
                        <div className="font-bold text-xl tracking-wider leading-none">FIRPLAK</div>
                        <div className="text-[9px] opacity-70 uppercase tracking-widest">inspiring homes</div>
                    </div>
                </div>
            </header>

            {/* Split Content */}
            <PageContainer
                as="main"
                hasHeader={false}
                hasFooter={false}
                className="relative z-10 w-full max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
            >
                
                {/* Left side: Application glossary */}
                <div className="lg:col-span-6 flex flex-col space-y-4">
                    <div className="flex items-center gap-2 text-[#324354]">
                        <BookOpen size={20} />
                        <h2 className="text-xl font-bold">Glosario de Aplicaciones</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-2 space-y-4">
                        {APP_SUMMARIES.map(app => {
                            const IconComponent = app.icon;
                            return (
                                <Card key={app.id} className={`shadow-sm border-l-4 ${app.color} hover:shadow-md transition duration-200 bg-white border-[#e2ded5]`}>
                                    <CardHeader className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <IconComponent size={20} />
                                            <CardTitle className="text-base font-bold text-slate-800">{app.title}</CardTitle>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-1 px-4 pb-3 space-y-2">
                                        <p className="text-sm text-slate-500 leading-relaxed">
                                            {app.description}
                                        </p>
                                        <div className="bg-[#F6F3EE] p-2.5 rounded-lg border border-[#e2ded5]">
                                            <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Recomendación clave:</span>
                                            <ul className="space-y-1">
                                                {app.tips.map((tip, idx) => (
                                                    <li key={idx} className="text-xs text-slate-600 flex items-start gap-1">
                                                        <span className="text-[#324354] font-bold">&bull;</span>
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

                {/* Right side: Chatbot */}
                <div className="lg:col-span-6 flex flex-col h-[calc(100vh-170px)] bg-white rounded-2xl border border-[#e2ded5] shadow-sm overflow-hidden">
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

                    {/* Message Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F6F3EE]/30">
                        {messages.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`flex items-start gap-2.5 max-w-[85%] ${
                                    msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${
                                    msg.sender === "user" ? "bg-[#7B8E90]" : "bg-[#324354]"
                                }`}>
                                    {msg.sender === "user" ? <User size={14} /> : <Bot size={14} />}
                                </div>
                                <div className={`p-3 rounded-2xl text-sm shadow-sm ${
                                    msg.sender === "user" 
                                        ? "bg-[#324354] text-white rounded-tr-none" 
                                        : "bg-white text-slate-700 border border-slate-100 rounded-tl-none"
                                }`}>
                                    {renderMessageText(msg.text)}
                                    <span className={`text-[8px] block text-right mt-1.5 opacity-60 ${
                                        msg.sender === "user" ? "text-white/80" : "text-slate-400"
                                    }`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex items-start gap-2.5 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-[#324354] flex items-center justify-center text-white">
                                    <Bot size={14} />
                                </div>
                                <div className="bg-white border border-slate-100 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-300"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Suggestions Area */}
                    <div className="p-3 border-t border-slate-100 bg-white flex flex-wrap gap-2">
                        {suggestions.map((s, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSendMessage(s)}
                                className="text-xs px-3 py-1.5 bg-[#F6F3EE] text-[#324354] border border-[#e2ded5] rounded-full hover:bg-[#324354] hover:text-white transition duration-200 font-medium"
                            >
                                {s}
                            </button>
                        ))}
                    </div>

                    {/* Chat Input */}
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
                            className="bg-[#324354] hover:bg-[#283643] text-white w-11 h-11 p-0 rounded-xl flex items-center justify-center shadow-md transition"
                        >
                            <Send size={18} />
                        </Button>
                    </div>
                </div>

            </PageContainer>

            {/* Sticky Home Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <Link
                    href="/home"
                    className="w-14 h-14 bg-[#324354] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all"
                >
                    <Home size={28} />
                </Link>
            </div>
        </div>
    );
}
