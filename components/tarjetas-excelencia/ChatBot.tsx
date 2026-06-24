"use client";

import { useState } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<{ role: "user" | "bot"; text: string }[]>([
        { role: "bot", text: "¡Hola! Soy tu asistente de Excelencia Operacional. ¿En qué te puedo ayudar hoy? Pregúntame sobre buenas prácticas, indicadores o cómo ejecutar procesos." }
    ]);

    const handleSend = () => {
        if (!input.trim()) return;

        // Add user message
        setMessages(prev => [...prev, { role: "user", text: input }]);
        const currentInput = input;
        setInput("");

        // Simulate AI response (to be connected to real backend/AI)
        setTimeout(() => {
            let botResponse = "Lo siento, no tengo esa información estructurada. Por favor revisa la tarjeta correspondiente en la aplicación.";

            const lowerInput = currentInput.toLowerCase();
            if (lowerInput.includes("entrenamiento") || lowerInput.includes("instruir")) {
                botResponse = "Para instruir correctamente, sigue estos pasos: 1. Prepara al empleado. 2. Presenta el trabajo. 3. Déjalo intentarlo y corrige errores. 4. Realiza seguimiento. ¿Quieres que profundice en alguno?";
            } else if (lowerInput.includes("reunión") || lowerInput.includes("turno")) {
                botResponse = "En la reunión de inicio de turno (RIT) enfócate en: 1. Seguridad. 2. Calidad. 3. Producción (Indicadores HxH). 4. 5S y Mejoras. Mantenla entre 5 a 10 minutos máximo.";
            } else if (lowerInput.includes("seguimiento") || lowerInput.includes("hora")) {
                botResponse = "El seguimiento hora a hora permite detectar desviaciones temprano. Asegúrate de registrar las paradas por categoría, tomar acción inmediata y escalar si las causas superan los 15 minutos de parada.";
            }

            setMessages(prev => [...prev, { role: "bot", text: botResponse }]);
        }, 1000);
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 rounded-full bg-[#1b3346] text-white shadow-xl hover:bg-[#2c4c66] transition-colors z-50 flex items-center justify-center animate-bounce-slow"
                aria-label="Abrir asistente"
            >
                <MessageCircle size={28} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        className="fixed bottom-20 right-6 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[80vh] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="bg-[#243c4f] text-white p-4 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Bot size={24} className="text-[#0284c7]" />
                                <div>
                                    <h3 className="font-bold text-sm">Asistente Operativo IA</h3>
                                    <p className="text-xs text-blue-200">Soporte en Planta</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-white hover:bg-white/20 p-1 rounded transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Chat Body */}
                        <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className={`flex items-start gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                                >
                                    <div className={`p-2 rounded-full flex-shrink-0 ${msg.role === 'user' ? 'bg-[#0284c7] text-white' : 'bg-[#e2e8f0] text-gray-700'}`}>
                                        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                                    </div>
                                    <div
                                        className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.role === 'user'
                                                ? 'bg-[#0284c7] text-white rounded-tr-sm'
                                                : 'bg-white border border-gray-200 text-gray-800 shadow-sm rounded-tl-sm'
                                            }`}
                                    >
                                        {msg.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Input Footer */}
                        <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                placeholder="Escribe tu consulta aquí..."
                                className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm border-none focus:ring-2 focus:ring-[#0284c7] outline-none"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim()}
                                className="p-2 rounded-full bg-[#1b3346] text-white hover:bg-[#2c4c66] disabled:opacity-50 transition-colors flex items-center justify-center shrink-0"
                            >
                                <Send size={18} className="translate-x-[1px]" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
