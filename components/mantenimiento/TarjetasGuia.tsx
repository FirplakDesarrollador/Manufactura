'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  HelpCircle, 
  Wrench, 
  UserCheck, 
  ShieldAlert, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Flame, 
  AlertCircle, 
  Info, 
  Camera, 
  Layers, 
  CheckSquare2,
  Clock,
  Settings,
  ChevronDown
} from 'lucide-react';

export default function TarjetasGuia() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const tarjetasColores = [
    {
      tipo: 'roja',
      titulo: 'Tarjeta Roja · Mantenimiento Especializado',
      colorBg: 'bg-rose-50',
      colorBorder: 'border-rose-300',
      colorBadge: 'bg-rose-600 text-white',
      colorTitle: 'text-rose-900',
      icon: <Wrench className="w-5 h-5 text-rose-600" />,
      quien: 'Técnicos de Mantenimiento (Mecánico / Eléctrico / Electrónico)',
      cuando: 'Cuando la anomalía requiere herramienta especializada, apertura de tableros eléctricos, intervención hidráulica/neumática profunda o reemplazo de componentes mayores.',
      ejemplos: [
        'Fuga de aceite hidráulico en mangueras o pistones de prensa.',
        'Sobrecalentamiento o ruido anormal en motores y reductores.',
        'Falla en sensores inductivos, PLC o tarjetas de control.',
        'Vibración excesiva en ejes principales o bancadas.'
      ],
      accion: 'Se integra automáticamente como Mantenimiento Correctivo sin asignar para atención técnica prioritaria.'
    },
    {
      tipo: 'azul',
      titulo: 'Tarjeta Azul · Mantenimiento Autónomo',
      colorBg: 'bg-blue-50',
      colorBorder: 'border-blue-300',
      colorBadge: 'bg-blue-600 text-white',
      colorTitle: 'text-blue-900',
      icon: <UserCheck className="w-5 h-5 text-blue-600" />,
      quien: 'Operador / Maquinista de la Estación de Trabajo',
      cuando: 'Cuando la anomalía puede ser resuelta directamente por el operario capacitado mediante tareas de inspección, limpieza profunda, reapriete menor o lubricación básica.',
      ejemplos: [
        'Filtro de aire o rejilla de ventilación saturada de polvo.',
        'Tornillería o pernos de tapas protectoras sueltos.',
        'Falta de lubricación básica en guías o cadenas accesibles.',
        'Manguera neumática de soplado con acople flojo.'
      ],
      accion: 'El operario o equipo de celda programa y ejecuta la solución de forma autónoma sin esperar a mantenimiento.'
    },
    {
      tipo: 'amarilla',
      titulo: 'Tarjeta Amarilla · Seguridad y 5S',
      colorBg: 'bg-amber-50',
      colorBorder: 'border-amber-300',
      colorBadge: 'bg-amber-600 text-white',
      colorTitle: 'text-amber-900',
      icon: <ShieldAlert className="w-5 h-5 text-amber-600" />,
      quien: 'Seguridad y Salud en el Trabajo (SST), Líder 5S y Supervisores',
      cuando: 'Cuando existe un riesgo para la integridad física de las personas, riesgo ergonómico, falta de elementos de protección o desorden/desviación de las 5S en el puesto.',
      ejemplos: [
        'Guarda de seguridad de sierra desalineada o suelta.',
        'Cableado eléctrico en el piso por donde transita personal o carretillas.',
        'Derrame de resina o solvente sin delimitación ni material absorbente.',
        'Obstrucción de extintores, pasillos o salidas de emergencia.'
      ],
      accion: 'Mitigación inmediata del peligro y notificación prioritaria al equipo de SST y operaciones.'
    },
    {
      tipo: 'verde',
      titulo: 'Tarjeta Verde · Mejora Kaizen / Ideas',
      colorBg: 'bg-emerald-50',
      colorBorder: 'border-emerald-300',
      colorBadge: 'bg-emerald-600 text-white',
      colorTitle: 'text-emerald-900',
      icon: <Sparkles className="w-5 h-5 text-emerald-600" />,
      quien: 'Equipo de Mejora Continua, Ingeniería y Líderes de Planta',
      cuando: 'Cuando un colaborador identifica una oportunidad de optimización, reducción de desperdicio (Muda), ergonomía o mecanismo a prueba de errores (Poka-Yoke).',
      ejemplos: [
        'Diseño de plantilla de alineación rápida para reducir tiempos de cambio.',
        'Soporte ergonómico para pistolas de aspersión o herramientas neumáticas.',
        'Implementación de tope mecánico para evitar piezas fuera de medida.',
        'Reorganización de flujo de materiales para reducir recorridos innecesarios.'
      ],
      accion: 'Evaluación técnica de viabilidad, diseño de prototipo y despliegue estandarizado.'
    }
  ];

  const pasosFlujo = [
    {
      numero: '01',
      titulo: 'Detección y Marcaje',
      desc: 'El operario detecta una desviación visual, auditiva o funcional y fija físicamente la tarjeta en el punto exacto de la máquina.',
      icon: <Camera className="w-4 h-4 text-white" />
    },
    {
      numero: '02',
      titulo: 'Registro en el Sistema',
      desc: 'Se ingresa la tarjeta en el aplicativo indicando máquina, planta, tipo/color, síntoma detallado y evidencia fotográfica.',
      icon: <Layers className="w-4 h-4 text-white" />
    },
    {
      numero: '03',
      titulo: 'Ejecución de la Acción',
      desc: 'El responsable asignado (Técnico, Operario o SST) ejecuta la acción correctiva y actualiza el estado a "En Proceso".',
      icon: <Wrench className="w-4 h-4 text-white" />
    },
    {
      numero: '04',
      titulo: 'Verificación y Cierre',
      desc: 'Se comprueba en planta la eliminación definitiva de la anomalía, se retira la tarjeta física y se marca como "Cerrada".',
      icon: <CheckSquare2 className="w-4 h-4 text-white" />
    }
  ];

  const faqs = [
    {
      q: '¿Por qué es importante reportar hasta la anomalía más pequeña?',
      a: 'El principio fundamental del TPM es prevenir fallas catastróficas. Una pequeña fuga de aire no atendida puede derivar en pérdida de presión en cilindros, desajuste mecánico mayor o parada de línea completa. Reportar a tiempo ahorra paradas y costos.'
    },
    {
      q: '¿Quién puede crear una Tarjeta de Anomalía en el sistema?',
      a: 'Cualquier colaborador de planta: operarios, maquinistas, supervisores, inspectores de calidad y técnicos de mantenimiento. El sistema es abierto e inclusivo para fomentar la cultura de propiedad sobre los equipos.'
    },
    {
      q: '¿Qué diferencia hay entre Tarjeta Roja y Tarjeta Azul?',
      a: 'La Tarjeta Roja es para intervención técnica especializada del departamento de mantenimiento. La Tarjeta Azul es para que el propio operador ejecute el ajuste dentro de sus competencias de Mantenimiento Autónomo.'
    },
    {
      q: '¿Qué pasa al guardar una Tarjeta Roja en el aplicativo?',
      a: 'El sistema crea automáticamente la orden de Mantenimiento Correctivo vinculada en estado "Sin asignar" en el gestor de mantenimiento para que el programador/líder técnico asigne al técnico correspondiente.'
    }
  ];

  return (
    <div className="flex flex-col gap-5 animate-in fade-in duration-300 max-w-5xl mx-auto w-full pb-8">
      
      {/* Hero Banner Guide */}
      <div className="bg-gradient-to-r from-[#324354] to-[#455a70] text-white p-6 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 border border-[#283643]">
        <div className="flex flex-col gap-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white/90 text-xs font-bold w-fit backdrop-blur-xs">
            <BookOpen className="w-3.5 h-3.5 text-amber-300" />
            <span>Metodología TPM · Mantenimiento Productivo Total</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Guía de Tarjetas de Anomalías FIRPLAK
          </h2>
          <p className="text-xs sm:text-sm text-gray-200 leading-relaxed font-normal">
            El sistema de tarjetas de anomalías es la herramienta visual operativa para identificar, clasificar y resolver desviaciones en máquinas, puestos y procesos antes de que generen paradas no programadas o incidentes.
          </p>
        </div>

        <div className="flex items-center justify-center p-4 bg-white/10 rounded-2xl border border-white/10 shrink-0">
          <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-bold">
            <div className="px-2.5 py-1.5 rounded-lg bg-rose-500/80 text-white">🔴 Roja: Mtto</div>
            <div className="px-2.5 py-1.5 rounded-lg bg-blue-500/80 text-white">🔵 Azul: Autónomo</div>
            <div className="px-2.5 py-1.5 rounded-lg bg-amber-500/80 text-white">🟡 Amarilla: 5S</div>
            <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/80 text-white">🟢 Verde: Kaizen</div>
          </div>
        </div>
      </div>

      {/* 4 Cards Detail Grid */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <Layers className="w-4 h-4 text-[#324354]" />
          <h3 className="text-sm font-bold text-[#324354] uppercase tracking-wider">
            Clasificación y Colores de Tarjetas TPM
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tarjetasColores.map((item, idx) => (
            <div 
              key={idx} 
              className={`p-5 rounded-2xl border ${item.colorBorder} ${item.colorBg} flex flex-col justify-between gap-3.5 shadow-2xs transition-all hover:shadow-sm`}
            >
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-white shadow-2xs">
                      {item.icon}
                    </div>
                    <h4 className={`text-sm font-bold ${item.colorTitle}`}>
                      {item.titulo}
                    </h4>
                  </div>
                </div>

                <div className="text-xs text-gray-700 leading-relaxed">
                  <span className="font-bold text-gray-900 block mb-0.5">¿Cuándo se usa?</span>
                  {item.cuando}
                </div>

                <div className="bg-white/80 p-3 rounded-xl border border-black/5 flex flex-col gap-1.5 text-xs text-gray-700">
                  <span className="font-bold text-gray-900 text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                    Ejemplos comunes en planta:
                  </span>
                  <ul className="list-disc list-inside text-[11.5px] space-y-0.5 text-gray-600 pl-1">
                    {item.ejemplos.map((ej, eIdx) => (
                      <li key={eIdx}>{ej}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[11px] text-gray-600 font-medium">
                <span><strong>Responsable:</strong> {item.quien}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4 Steps Lifecycle */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2ded5] shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#324354]" />
          <h3 className="text-sm font-bold text-[#324354] uppercase tracking-wider">
            Ciclo de Vida de una Tarjeta de Anomalía (4 Pasos)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {pasosFlujo.map((paso, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[#F6F3EE] border border-[#e2ded5] flex flex-col gap-2 relative">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black text-[#324354]/30">{paso.numero}</span>
                <div className="w-7 h-7 rounded-lg bg-[#324354] flex items-center justify-center shadow-2xs">
                  {paso.icon}
                </div>
              </div>
              <h5 className="text-xs font-bold text-[#324354] mt-1">{paso.titulo}</h5>
              <p className="text-[11px] text-gray-600 leading-relaxed">{paso.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Priority & SLA Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-rose-900 font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-600" />
              Prioridad Alta (Crítica)
            </span>
            <span className="px-2 py-0.5 bg-rose-200 text-rose-900 rounded-md text-[10px]">SLA &lt; 24 Horas</span>
          </div>
          <p className="text-[11px] text-rose-800 leading-relaxed mt-1">
            Riesgo inminente de detención de línea de producción, daño mayor en máquina o riesgo inminente de accidente laboral.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-amber-900 font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Prioridad Media
            </span>
            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md text-[10px]">SLA &lt; 72 Horas</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed mt-1">
            Desgaste progresivo, desajustes menores o condiciones que afectan la calidad sin detener la producción de inmediato.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-blue-900 font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600" />
              Prioridad Baja
            </span>
            <span className="px-2 py-0.5 bg-blue-200 text-blue-900 rounded-md text-[10px]">SLA Semanal</span>
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed mt-1">
            Mejoras estéticas, propuestas de optimización Kaizen o condiciones que no impactan directamente la operación.
          </p>
        </div>

      </div>

      {/* FAQ Section */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e2ded5] shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="w-4 h-4 text-[#324354]" />
          <h3 className="text-sm font-bold text-[#324354] uppercase tracking-wider">
            Preguntas Frecuentes (FAQ)
          </h3>
        </div>

        <div className="flex flex-col gap-2">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="border border-gray-100 rounded-2xl overflow-hidden bg-slate-50/50 transition-all"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full p-3.5 text-left flex items-center justify-between gap-3 text-xs font-bold text-[#324354] cursor-pointer hover:bg-slate-100/70"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${activeFaq === idx ? 'rotate-180 text-[#324354]' : ''}`} />
              </button>
              {activeFaq === idx && (
                <div className="px-3.5 pb-3.5 text-[11.5px] text-gray-600 leading-relaxed border-t border-gray-100 pt-2 bg-white animate-in fade-in">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
