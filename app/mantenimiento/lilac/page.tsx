'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  Play, 
  Calendar, 
  User, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  CheckSquare, 
  Plus, 
  FileText, 
  History, 
  Trash2, 
  Eye, 
  LayoutDashboard, 
  ClipboardList, 
  Activity, 
  Info,
  TrendingUp,
  X,
  Camera,
  AlertCircle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/opt-sistemica/Header'

// ----------------------------------------------------
// 1. SEED DATA - AUTOMANTENIMIENTO ENCHAPADORA SCM (LILAC)
// ----------------------------------------------------
const SEED_ESTANDAR = {
  id: "est-enchapadora-scm",
  equipo: "Enchapadora SCM",
  planta: "MBL",
  criticidad: "A",
  codigo_hdt: "V1",
  labor: "Limpieza y Ajuste de Enchapadora SCM",
  herramientas: ["Brocha", "Pistola de aire comprimido", "Recogedor", "Trapos", "Tíner"],
  insumos: ["Trapos", "Thinner", "Alcohol etílico al 70%"],
  epp: ["Gafas de seguridad", "Botas de seguridad", "Protección auditiva"],
  fecha_elaboracion: "2023-10-26",
  elaboro: "Roberto Aguilar",
  aprobo: "Hector Chinchilla",
  nota_general: "No se debe utilizar silicona en la máquina.",
  steps: [
    {
      id: "step-1",
      orden: 1,
      nombre_paso: "Accionar paro de emergencia de la máquina",
      categoria_lilac: "Seguridad",
      frecuencia: "Cada turno",
      tiempo_estimado_min: 2,
      criterio_aceptacion: "Paro de emergencia accionado, máquina apagada y cabina desbloqueada de forma segura.",
      sub_acciones: [
        {
          detalle_texto: "Girar llave para desbloquear cabina.",
          imagen_url: "/imagenes_enchapadora_scm/paso01_paro_emergencia.png"
        }
      ]
    },
    {
      id: "step-2",
      orden: 2,
      nombre_paso: "Soplar toda la máquina de arriba hacia abajo",
      categoria_lilac: "Limpieza",
      frecuencia: "Cada turno",
      tiempo_estimado_min: 5,
      criterio_aceptacion: "Libre de viruta y polvo en guías, calderín y zonas mecánicas visibles.",
      sub_acciones: [
        {
          detalle_texto: "Partiendo desde el calderín soplar hacia la izquierda, y del calderín hacia el tupí soplar hacia la derecha. Esto evita impurezas en la pega.",
          imagen_url: "/imagenes_enchapadora_scm/paso02a_soplado_general.png"
        },
        {
          detalle_texto: "Continuación del soplado general de la máquina.",
          imagen_url: "/imagenes_enchapadora_scm/paso02b_soplado_general_2.png"
        }
      ]
    },
    {
      id: "step-3",
      orden: 3,
      nombre_paso: "Abrir las compuertas y soplar al interior",
      categoria_lilac: "Limpieza",
      frecuencia: "Cada turno",
      tiempo_estimado_min: 8,
      criterio_aceptacion: "Compuertas interiores sopladas, libre de aserrín acumulado en grupos de corte y perfilado.",
      sub_acciones: [
        {
          detalle_texto: "Se realiza el soplado de arriba hacia abajo quitando todas las impurezas de todos los grupos.",
          imagen_url: "/imagenes_enchapadora_scm/paso03_abrir_compuertas_soplar.png"
        }
      ]
    },
    {
      id: "step-4",
      orden: 4,
      nombre_paso: "Actividades de limpieza al interior de las compuertas",
      categoria_lilac: "Limpieza",
      frecuencia: "Cada turno",
      tiempo_estimado_min: 10,
      criterio_aceptacion: "Piso de compuertas barrido, recipientes de polvillo vacíos y niveles de líquidos llenos e iguales.",
      sub_acciones: [
        {
          detalle_texto: "1. Retirar retales de canto. 2. Barrer puesto de trabajo y recoger polvillo y retales.",
          imagen_url: "/imagenes_enchapadora_scm/paso04a_retirar_retales_barrer.png"
        },
        {
          detalle_texto: "3. Vaciar el polvillo que se recoge en los dos recipientes que están debajo de la máquina.",
          imagen_url: "/imagenes_enchapadora_scm/paso04b_vaciar_polvillo.png"
        },
        {
          detalle_texto: "4. Verificar niveles de líquidos: blanco (antiadherente) RIE y rosado (limpiador) RIE. Rellenar cuando sea necesario; ambos tarros deben permanecer con la misma cantidad.",
          imagen_url: "/imagenes_enchapadora_scm/paso04c_verificar_niveles_liquidos.png"
        }
      ]
    },
    {
      id: "step-5",
      orden: 5,
      nombre_paso: "Piezas palpadoras: limpieza del rodillo palpador vertical",
      categoria_lilac: "Inspección",
      frecuencia: "Cada 8 horas",
      tiempo_estimado_min: 4,
      criterio_aceptacion: "Rodillo palpador vertical limpio, gira libremente y libre de adhesivos endurecidos.",
      sub_acciones: [
        {
          detalle_texto: "Referencia del punto antes de limpiar.",
          imagen_url: "/imagenes_enchapadora_scm/paso05a_palpador_vertical_ref.png"
        },
        {
          detalle_texto: "1. Limpiar la superficie del palpador. 2. Eliminar la suciedad; ambas actividades se realizan con aire comprimido. Si no sale con aire comprimido, aplicar thinner o alcohol en un trapo y limpiar.",
          imagen_url: "/imagenes_enchapadora_scm/paso05b_limpieza_palpador_vertical.png"
        }
      ]
    },
    {
      id: "step-6",
      orden: 6,
      nombre_paso: "Realizar vaciado de pega",
      categoria_lilac: "Ajuste",
      frecuencia: "Una vez por turno",
      tiempo_estimado_min: 12,
      criterio_aceptacion: "Bandeja desbloqueada, cola descargada y depósito limpio para evitar carbonización.",
      sub_acciones: [
        {
          detalle_texto: "Referencia general del punto de vaciado de pega.",
          imagen_url: "/imagenes_enchapadora_scm/paso06a_vaciado_pega_ref.png"
        },
        {
          detalle_texto: "1. Dejar presionado el rodillo de pega.",
          imagen_url: "/imagenes_enchapadora_scm/paso06b_presionar_rodillo_pega.png"
        },
        {
          detalle_texto: "2. Poner la máquina en manual.",
          imagen_url: "/imagenes_enchapadora_scm/paso06c_maquina_manual.png"
        },
        {
          detalle_texto: "3. Presionar descargue de cola.",
          imagen_url: "/imagenes_enchapadora_scm/paso06d_descargue_cola.png"
        },
        {
          detalle_texto: "4. Despresurizar la válvula del rodillo de arrastre de canto.",
          imagen_url: "/imagenes_enchapadora_scm/paso06e_despresurizar_valvula.png"
        },
        {
          detalle_texto: "5. Desbloquear bandeja.",
          imagen_url: "/imagenes_enchapadora_scm/paso06f_desbloquear_bandeja.png"
        },
        {
          detalle_texto: "6. Halar bandeja y 7. Vaciar pega.",
          imagen_url: "/imagenes_enchapadora_scm/paso06g_halar_bandeja.png"
        }
      ]
    },
    {
      id: "step-7",
      orden: 7,
      nombre_paso: "Verificación de rodillo de presión",
      categoria_lilac: "Inspección",
      frecuencia: "Cada turno",
      tiempo_estimado_min: 3,
      criterio_aceptacion: "Rodillos de presión completamente libres de pegante o virutas que marquen la madera.",
      sub_acciones: [
        {
          detalle_texto: "Verificar que el rodillo de presión no tenga impurezas; si es el caso, retirarlas con trapo y tíner.",
          imagen_url: "/imagenes_enchapadora_scm/paso07_verificacion_rodillo_presion.png"
        }
      ]
    }
  ]
}

// Default initial anomalies if localStorage is empty
const INITIAL_ANOMALIES = [
  {
    id: "ANM-001",
    registro_paso_id: "step-4",
    equipo: "Enchapadora SCM",
    estandar: "AUTOMANTENIMIENTO ENCHAPADORA SCM",
    planta: "MBL",
    paso: "Actividades de limpieza al interior de las compuertas",
    descripcion: "Fuga leve en depósito de líquido blanco (antiadherente).",
    prioridad: "Media",
    responsable_escalado: "Roberto Aguilar",
    estado: "Abierta",
    fecha_reporte: "2026-07-05",
    tipo: "Deterioro Forzado"
  },
  {
    id: "ANM-002",
    registro_paso_id: "step-7",
    equipo: "Enchapadora SCM",
    estandar: "AUTOMANTENIMIENTO ENCHAPADORA SCM",
    planta: "MBL",
    paso: "Verificación de rodillo de presión",
    descripcion: "Resortes del rodillo de presión con acumulación de grasa reseca, dificulta giro suave.",
    prioridad: "Baja",
    responsable_escalado: "Roberto Aguilar",
    estado: "En Proceso",
    fecha_reporte: "2026-07-06",
    tipo: "Falta Limpieza"
  }
]

// Mock History logs
const INITIAL_HISTORY = [
  {
    id: "RUN-101",
    estandar_id: "est-enchapadora-scm",
    estandar_nombre: "AUTOMANTENIMIENTO ENCHAPADORA SCM",
    equipo: "Enchapadora SCM",
    planta: "MBL",
    operario: "Jorge Martínez",
    turno: "Mañana",
    fecha: "2026-07-04",
    cumplimiento_pct: 100,
    tiempo_total_est: 44,
    tiempo_total_real: 42,
    anomalias_detectadas: 0,
    registros: [
      { paso_id: "step-1", estado: "cumple", tiempo_real_seg: 110, comentario: "" },
      { paso_id: "step-2", estado: "cumple", tiempo_real_seg: 290, comentario: "" },
      { paso_id: "step-3", estado: "cumple", tiempo_real_seg: 450, comentario: "" },
      { paso_id: "step-4", estado: "cumple", tiempo_real_seg: 580, comentario: "" },
      { paso_id: "step-5", estado: "cumple", tiempo_real_seg: 220, comentario: "" },
      { paso_id: "step-6", estado: "cumple", tiempo_real_seg: 710, comentario: "" },
      { paso_id: "step-7", estado: "cumple", tiempo_real_seg: 160, comentario: "" }
    ]
  },
  {
    id: "RUN-102",
    estandar_id: "est-enchapadora-scm",
    estandar_nombre: "AUTOMANTENIMIENTO ENCHAPADORA SCM",
    equipo: "Enchapadora SCM",
    planta: "MBL",
    operario: "Jorge Martínez",
    turno: "Tarde",
    fecha: "2026-07-05",
    cumplimiento_pct: 85.7,
    tiempo_total_est: 44,
    tiempo_total_real: 51,
    anomalias_detectadas: 1,
    registros: [
      { paso_id: "step-1", estado: "cumple", tiempo_real_seg: 120, comentario: "" },
      { paso_id: "step-2", estado: "cumple", tiempo_real_seg: 320, comentario: "" },
      { paso_id: "step-3", estado: "cumple", tiempo_real_seg: 510, comentario: "" },
      { paso_id: "step-4", estado: "no_cumple", tiempo_real_seg: 820, comentario: "Fuga leve en depósito de líquido blanco." },
      { paso_id: "step-5", estado: "cumple", tiempo_real_seg: 250, comentario: "" },
      { paso_id: "step-6", estado: "cumple", tiempo_real_seg: 860, comentario: "" },
      { paso_id: "step-7", estado: "cumple", tiempo_real_seg: 180, comentario: "" }
    ]
  }
]

export default function LillacModulePage() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState('')
  const [activeTab, setActiveTab] = useState<'estandares' | 'historial' | 'auditoria' | 'ejecucion'>('estandares')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Storage states
  const [standards, setStandards] = useState<any[]>([SEED_ESTANDAR])
  const [history, setHistory] = useState<any[]>([])
  const [anomalies, setAnomalies] = useState<any[]>([])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
      }
    }
    checkUser()

    const savedHistory = localStorage.getItem('lilac_history')
    const savedAnomalies = localStorage.getItem('lilac_anomalies')
    
    if (savedHistory) {
      setHistory(JSON.parse(savedHistory))
    } else {
      setHistory(INITIAL_HISTORY)
      localStorage.setItem('lilac_history', JSON.stringify(INITIAL_HISTORY))
    }

    if (savedAnomalies) {
      setAnomalies(JSON.parse(savedAnomalies))
    } else {
      setAnomalies(INITIAL_ANOMALIES)
      localStorage.setItem('lilac_anomalies', JSON.stringify(INITIAL_ANOMALIES))
    }
  }, [])

  // Helper to save to local storage
  const saveHistory = (newHistory: any[]) => {
    setHistory(newHistory)
    localStorage.setItem('lilac_history', JSON.stringify(newHistory))
  }

  const saveAnomalies = (newAnomalies: any[]) => {
    setAnomalies(newAnomalies)
    localStorage.setItem('lilac_anomalies', JSON.stringify(newAnomalies))
  }

  // ----------------------------------------------------
  // SUB-ACCIONES & RENDER HELPERS
  // ----------------------------------------------------
  const getCategoryColor = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'limpieza':
        return { bg: 'bg-blue-600', text: 'text-white', badge: 'bg-blue-50 text-blue-700 border-blue-200' }
      case 'inspección':
      case 'inspeccion':
        return { bg: 'bg-amber-500', text: 'text-white', badge: 'bg-amber-50 text-amber-800 border-amber-200' }
      case 'lubricación':
      case 'lubricacion':
        return { bg: 'bg-emerald-600', text: 'text-white', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' }
      case 'ajuste':
        return { bg: 'bg-orange-600', text: 'text-white', badge: 'bg-orange-50 text-orange-800 border-orange-200' }
      case 'cambio':
        return { bg: 'bg-violet-600', text: 'text-white', badge: 'bg-violet-50 text-violet-800 border-violet-200' }
      default: // Seguridad / Pre-Lilac
        return { bg: 'bg-slate-700', text: 'text-white', badge: 'bg-slate-100 text-slate-800 border-slate-200' }
    }
  }

  // ----------------------------------------------------
  // STATE FOR RUNNING A ROUND (EJECUCION)
  // ----------------------------------------------------
  const [roundSetup, setRoundSetup] = useState({
    planta: "MBL",
    equipo: "Enchapadora SCM",
    operario: "",
    turno: "Mañana",
    estandarId: "est-enchapadora-scm"
  })
  const [isRoundActive, setIsRoundActive] = useState(false)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isSubActionsExpanded, setIsSubActionsExpanded] = useState(false)

  // Results recorded in the current round
  // Structure: { [stepId]: { estado: 'cumple' | 'no_cumple' | 'no_aplica', comentario?: string, timeSpentSec: number, anomaliaText?: string, anomaliaPriority?: string, photo?: string } }
  const [roundAnswers, setRoundAnswers] = useState<Record<string, any>>({})
  
  // Track step start times for actual duration tracking
  const [stepStartTime, setStepStartTime] = useState<number>(0)
  const [roundStartTime, setRoundStartTime] = useState<number>(0)

  // Form for anomaly report inside current step
  const [anomalyForm, setAnomalyForm] = useState({
    description: "",
    priority: "Media",
    photo: null as string | null
  })
  const [showAnomalyForm, setShowAnomalyForm] = useState(false)

  // Selected equipment in Master list
  const [selectedMasterEstandar, setSelectedMasterEstandar] = useState<any>(SEED_ESTANDAR)
  const [isAddingStandard, setIsAddingStandard] = useState(false)

  // ----------------------------------------------------
  // ROUND ACTIONS
  // ----------------------------------------------------
  const handleStartRound = () => {
    if (!roundSetup.operario.trim()) {
      alert("Por favor ingrese el nombre del operario.")
      return
    }
    setIsRoundActive(true)
    setCurrentStepIndex(0)
    setRoundAnswers({})
    setShowAnomalyForm(false)
    setIsSubActionsExpanded(false)
    const now = Date.now()
    setRoundStartTime(now)
    setStepStartTime(now)
  }

  const activeEstandar = useMemo(() => {
    return standards.find(s => s.id === roundSetup.estandarId) || SEED_ESTANDAR
  }, [standards, roundSetup.estandarId])

  const currentStep = activeEstandar.steps[currentStepIndex]

  const handleStepAnswer = (status: 'cumple' | 'no_aplica') => {
    const now = Date.now()
    const elapsedSec = Math.max(1, Math.round((now - stepStartTime) / 1000))
    
    // Save answer
    setRoundAnswers(prev => ({
      ...prev,
      [currentStep.id]: {
        estado: status,
        timeSpentSec: elapsedSec,
        comentario: status === 'no_aplica' ? 'No aplica en este turno.' : ''
      }
    }))

    // Proceed to next or finish
    goToNextStep(now)
  }

  const handleSaveAnomaly = () => {
    if (!anomalyForm.description.trim()) {
      alert("Por favor describa la anomalía.")
      return
    }
    const now = Date.now()
    const elapsedSec = Math.max(1, Math.round((now - stepStartTime) / 1000))

    // Record no_cumple answer
    setRoundAnswers(prev => ({
      ...prev,
      [currentStep.id]: {
        estado: 'no_cumple',
        timeSpentSec: elapsedSec,
        comentario: anomalyForm.description,
        anomalia: {
          descripcion: anomalyForm.description,
          prioridad: anomalyForm.priority,
          photo: anomalyForm.photo || "/placeholder-camera.jpg"
        }
      }
    }))

    // Clear form
    setAnomalyForm({
      description: "",
      priority: "Media",
      photo: null
    })
    setShowAnomalyForm(false)

    // Go to next
    goToNextStep(now)
  }

  const goToNextStep = (timeRef: number) => {
    if (currentStepIndex < activeEstandar.steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1)
      setStepStartTime(timeRef)
      setIsSubActionsExpanded(false)
      setShowAnomalyForm(false)
    } else {
      // Completed last step -> Finish round
      setIsRoundActive(false)
      handleCompleteRound()
    }
  }

  const handleGoBackStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1)
      setStepStartTime(Date.now())
      setIsSubActionsExpanded(false)
      setShowAnomalyForm(false)
    }
  }

  const handleCompleteRound = () => {
    const now = Date.now()
    const totalRealMin = Math.max(1, Math.round((now - roundStartTime) / 60000))
    const totalEstMin = activeEstandar.steps.reduce((sum: number, s: any) => sum + (s.tiempo_estimado_min || 0), 0)

    // Calculate compliance %
    const totalSteps = activeEstandar.steps.length
    let okCount = 0
    let naCount = 0
    let anomaliasCreated: any[] = []

    activeEstandar.steps.forEach((s: any) => {
      const ans = roundAnswers[s.id]
      if (ans) {
        if (ans.estado === 'cumple') okCount++
        if (ans.estado === 'no_aplica') naCount++
        if (ans.estado === 'no_cumple' && ans.anomalia) {
          anomaliasCreated.push({
            id: `ANM-${Math.floor(100 + Math.random() * 900)}`,
            registro_paso_id: s.id,
            equipo: activeEstandar.equipo,
            estandar: activeEstandar.labor,
            planta: activeEstandar.planta,
            paso: s.nombre_paso,
            descripcion: ans.anomalia.descripcion,
            prioridad: ans.anomalia.prioridad,
            responsable_escalado: "Roberto Aguilar", // Default escalation
            estado: "Abierta",
            fecha_reporte: new Date().toISOString().split('T')[0],
            tipo: s.categoria_lilac === 'Seguridad' ? 'Seguridad' : 'Deterioro Forzado'
          })
        }
      }
    })

    const applicableSteps = totalSteps - naCount
    const compliancePct = applicableSteps > 0 
      ? Math.round((okCount / applicableSteps) * 1000) / 10 
      : 100

    // Save round log
    const runId = `RUN-${Math.floor(200 + Math.random() * 800)}`
    const newLog = {
      id: runId,
      estandar_id: activeEstandar.id,
      estandar_nombre: activeEstandar.labor,
      equipo: activeEstandar.equipo,
      planta: activeEstandar.planta,
      operario: roundSetup.operario,
      turno: roundSetup.turno,
      fecha: new Date().toISOString().split('T')[0],
      cumplimiento_pct: compliancePct,
      tiempo_total_est: totalEstMin,
      tiempo_total_real: totalRealMin,
      anomalias_detectadas: anomaliasCreated.length,
      registros: Object.entries(roundAnswers).map(([stepId, val]: [string, any]) => ({
        paso_id: stepId,
        estado: val.estado,
        tiempo_real_seg: val.timeSpentSec,
        comentario: val.comentario || ""
      }))
    }

    const updatedHistory = [newLog, ...history]
    saveHistory(updatedHistory)

    if (anomaliasCreated.length > 0) {
      const updatedAnomalias = [...anomaliasCreated, ...anomalies]
      saveAnomalies(updatedAnomalias)
    }

    alert(`Ronda finalizada correctamente.\n\nCumplimiento: ${compliancePct}%\nTiempo Total: ${totalRealMin} min (Estándar: ${totalEstMin} min)\nAnomalías Reportadas: ${anomaliasCreated.length}`)
    
    // Switch to history tab to view logs
    setActiveTab('historial')
    setIsRoundActive(false)
  }

  // Simulator anomaly photo upload
  const simulatePhotoUpload = () => {
    const mockPhotos = [
      "imagenes_enchapadora_scm/anomalia_calderin.png",
      "imagenes_enchapadora_scm/anomalia_compuerta.png",
      "imagenes_enchapadora_scm/anomalia_rodillo.png"
    ]
    const randomPhoto = mockPhotos[Math.floor(Math.random() * mockPhotos.length)]
    setAnomalyForm(prev => ({
      ...prev,
      photo: randomPhoto
    }))
    alert("¡Evidencia fotográfica capturada simuladamente!")
  }

  // Clean local data
  const handleClearLocalData = () => {
    if (confirm("¿Estás seguro de que quieres restablecer el historial y anomalías a los datos por defecto?")) {
      setHistory(INITIAL_HISTORY)
      setAnomalies(INITIAL_ANOMALIES)
      localStorage.setItem('lilac_history', JSON.stringify(INITIAL_HISTORY))
      localStorage.setItem('lilac_anomalies', JSON.stringify(INITIAL_ANOMALIES))
    }
  }

  // ----------------------------------------------------
  // METRICS & DASHBOARD DATA COMPUTATION
  // ----------------------------------------------------
  const dashboardStats = useMemo(() => {
    if (history.length === 0) return { avgCompliance: 0, closedTickets: 0, openTickets: 0, totalRounds: 0 }
    
    const sumCompliance = history.reduce((sum, h) => sum + (h.cumplimiento_pct || 0), 0)
    const avgCompliance = Math.round(sumCompliance / history.length)

    const openTickets = anomalies.filter(a => a.estado === 'Abierta' || a.estado === 'En Proceso').length
    const closedTickets = anomalies.filter(a => a.estado === 'Cerrada').length

    return {
      avgCompliance,
      openTickets,
      closedTickets,
      totalRounds: history.length
    }
  }, [history, anomalies])

  // Step calibration averages computation
  const stepCalibrationData = useMemo(() => {
    const calibrationMap: Record<string, { name: string, est: number, totalReal: number, count: number }> = {}
    
    // Initialise SCM Enchapadora steps
    SEED_ESTANDAR.steps.forEach(s => {
      calibrationMap[s.id] = {
        name: `Paso ${s.orden}`,
        est: s.tiempo_estimado_min * 60, // in seconds
        totalReal: 0,
        count: 0
      }
    })

    history.forEach(round => {
      if (round.registros) {
        round.registros.forEach((reg: any) => {
          if (calibrationMap[reg.paso_id]) {
            calibrationMap[reg.paso_id].totalReal += reg.tiempo_real_seg
            calibrationMap[reg.paso_id].count++
          }
        })
      }
    })

    return Object.entries(calibrationMap).map(([id, val]) => {
      const avgReal = val.count > 0 ? Math.round(val.totalReal / val.count) : val.est
      return {
        id,
        name: val.name,
        "Estándar (Seg)": val.est,
        "Promedio Real (Seg)": avgReal,
        desviacion: Math.abs(val.est - avgReal)
      }
    })
  }, [history])

  // Update Anomaly Status
  const handleUpdateAnomalyStatus = (id: string, newStatus: string) => {
    const updated = anomalies.map(a => {
      if (a.id === id) {
        return {
          ...a,
          estado: newStatus,
          fecha_cierre: newStatus === 'Cerrada' ? new Date().toISOString().split('T')[0] : undefined
        }
      }
      return a
    })
    saveAnomalies(updated)
  }

  // ----------------------------------------------------
  // CREATE NEW MASTER STANDARD (SIMULATION)
  // ----------------------------------------------------
  const [newStandardForm, setNewStandardForm] = useState({
    equipo: "",
    planta: "MBL",
    labor: "",
    codigo_hdt: "",
    elaboro: "",
    aprobo: "",
    herramientas: "",
    insumos: "",
    epp: "",
    nota_general: ""
  })

  const handleCreateStandard = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newStandardForm.equipo || !newStandardForm.labor) {
      alert("Por favor complete los campos obligatorios.")
      return
    }

    const newStd = {
      id: `est-${Math.floor(1000 + Math.random() * 9000)}`,
      equipo: newStandardForm.equipo,
      planta: newStandardForm.planta,
      criticidad: "B",
      codigo_hdt: newStandardForm.codigo_hdt || "V1",
      labor: newStandardForm.labor,
      herramientas: newStandardForm.herramientas.split(',').map(h => h.trim()).filter(Boolean),
      insumos: newStandardForm.insumos.split(',').map(i => i.trim()).filter(Boolean),
      epp: newStandardForm.epp.split(',').map(ep => ep.trim()).filter(Boolean),
      fecha_elaboracion: new Date().toISOString().split('T')[0],
      elaboro: newStandardForm.elaboro || "Operario",
      aprobo: newStandardForm.aprobo || "Supervisor",
      nota_general: newStandardForm.nota_general,
      steps: [
        {
          id: `step-new-1`,
          orden: 1,
          nombre_paso: "Inspección visual general",
          categoria_lilac: "Inspección",
          frecuencia: "Cada turno",
          tiempo_estimado_min: 5,
          criterio_aceptacion: "Máquina limpia y sin fugas visibles.",
          sub_acciones: [{ detalle_texto: "Revisar cableado y fugas.", imagen_url: "" }]
        },
        {
          id: `step-new-2`,
          orden: 2,
          nombre_paso: "Limpieza exterior del chasis",
          categoria_lilac: "Limpieza",
          frecuencia: "Cada turno",
          tiempo_estimado_min: 5,
          criterio_aceptacion: "Chasis libre de polvo acumulado.",
          sub_acciones: [{ detalle_texto: "Limpiar virutas exteriores.", imagen_url: "" }]
        }
      ]
    }

    setStandards([...standards, newStd])
    setSelectedMasterEstandar(newStd)
    setIsAddingStandard(false)
    setNewStandardForm({
      equipo: "",
      planta: "MBL",
      labor: "",
      codigo_hdt: "",
      elaboro: "",
      aprobo: "",
      herramientas: "",
      insumos: "",
      epp: "",
      nota_general: ""
    })
    alert("¡Estándar LILAC registrado con éxito! (Se crearon 2 pasos predeterminados de ejemplo)")
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000]">
      <Header
        title="Mantenimiento"
        subtitle="Mantenimiento Autónomo LILAC"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut()
          router.push('/login')
        }}
      />

      {/* Tabs Menu (Only visible when round is NOT active) */}
      {!isRoundActive && (
        <div className="bg-white border-b border-[#e2ded5] py-2 px-4 shadow-sm relative z-30">
          <div className="max-w-7xl mx-auto flex flex-wrap gap-2 sm:gap-4 justify-center">
            <button
              onClick={() => setActiveTab('estandares')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${
                activeTab === 'estandares'
                  ? 'bg-[#324354] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <ClipboardList size={16} />
              <span>Estándares</span>
            </button>

            <button
              onClick={() => setActiveTab('historial')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${
                activeTab === 'historial'
                  ? 'bg-[#324354] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <History size={16} />
              <span>Historial</span>
            </button>

            <button
              onClick={() => setActiveTab('auditoria')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${
                activeTab === 'auditoria'
                  ? 'bg-[#324354] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Activity size={16} />
              <span>Auditoría</span>
            </button>

            <button
              onClick={() => setActiveTab('ejecucion')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all text-sm ${
                activeTab === 'ejecucion'
                  ? 'bg-[#324354] text-white shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Play size={16} />
              <span>Ejecución</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* TAB 1: EJECUCION DE RONDA */}
        {activeTab === 'ejecucion' && (
          <div className="max-w-3xl mx-auto">
            {!isRoundActive ? (
              // Setup screen
              <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-lg p-6 sm:p-10 space-y-6">
                <div className="text-center space-y-2 border-b border-slate-100 pb-4">
                  <h2 className="text-2xl font-bold text-[#324354]">Nueva Ronda de Mantenimiento</h2>
                  <p className="text-slate-500 text-sm">Registre los datos básicos antes de iniciar el checklist interactivo.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Planta</label>
                    <select
                      value={roundSetup.planta}
                      onChange={e => setRoundSetup({...roundSetup, planta: e.target.value})}
                      className="w-full h-11 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 outline-none focus:border-[#324354] font-medium"
                    >
                      <option value="MBL">Muebles (MBL)</option>
                      <option value="MS">Mármol Sintético (MS)</option>
                      <option value="FV">Fibra de Vidrio (FV)</option>
                      <option value="CEFI">CEFI</option>
                      <option value="INYECCION">Inyección</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Estándar LILAC</label>
                    <select
                      value={roundSetup.estandarId}
                      onChange={e => {
                        const std = standards.find(s => s.id === e.target.value)
                        setRoundSetup({
                          ...roundSetup,
                          estandarId: e.target.value,
                          equipo: std ? std.equipo : "Equipo"
                        })
                      }}
                      className="w-full h-11 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 outline-none focus:border-[#324354] font-medium"
                    >
                      {standards.map(s => (
                        <option key={s.id} value={s.id}>{s.equipo} - {s.labor}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Turno</label>
                    <select
                      value={roundSetup.turno}
                      onChange={e => setRoundSetup({...roundSetup, turno: e.target.value})}
                      className="w-full h-11 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 outline-none focus:border-[#324354] font-medium"
                    >
                      <option value="Mañana">Mañana</option>
                      <option value="Tarde">Tarde</option>
                      <option value="Noche">Noche</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Nombre del Operario *</label>
                    <input
                      type="text"
                      placeholder="Ej. Hector Chinchilla"
                      value={roundSetup.operario}
                      onChange={e => setRoundSetup({...roundSetup, operario: e.target.value})}
                      className="w-full h-11 bg-slate-50 border-2 border-slate-200 rounded-xl px-3 outline-none focus:border-[#324354] font-semibold"
                    />
                  </div>
                </div>

                <div className="bg-[#324354]/5 rounded-2xl p-4 border border-[#324354]/10 space-y-2">
                  <h4 className="text-sm font-bold text-[#324354] flex items-center gap-1.5">
                    <Info size={16} /> Información del Estándar
                  </h4>
                  <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
                    <li>Código HDT: <strong>{activeEstandar.codigo_hdt}</strong> (Versión {activeEstandar.version || '1'})</li>
                    <li>Cantidad de Pasos LILAC: <strong>{activeEstandar.steps.length} tareas</strong></li>
                    <li>Elaboró: <strong>{activeEstandar.elaboro}</strong> | Aprobó: <strong>{activeEstandar.aprobo}</strong></li>
                    <li>Herramientas recomendadas: {activeEstandar.herramientas?.join(', ')}</li>
                    <li>EPP Requerido: <strong>{activeEstandar.epp?.join(', ')}</strong></li>
                  </ul>
                </div>

                <button
                  onClick={handleStartRound}
                  className="w-full py-3.5 bg-[#324354] hover:bg-[#25313e] text-white font-bold rounded-2xl transition duration-200 shadow-md flex items-center justify-center gap-2"
                >
                  <Play size={18} fill="white" />
                  <span>Comenzar Ronda Interactiva</span>
                </button>
              </div>
            ) : (
              // Step-by-step Execution Ronda (Mobile-First Style)
              <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-xl overflow-hidden flex flex-col min-h-[580px]">
                
                {/* Progress bar */}
                <div className="bg-slate-100 px-4 py-3 flex items-center justify-between border-b border-slate-200">
                  <div className="flex-1 mr-4">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className="bg-[#324354] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentStepIndex + 1) / activeEstandar.steps.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-[#324354] whitespace-nowrap">
                    Paso {currentStepIndex + 1} de {activeEstandar.steps.length}
                  </span>
                </div>

                {/* Big Step Card */}
                <div className="p-4 sm:p-6 flex-1 flex flex-col space-y-4">
                  
                  {/* Photo area */}
                  <div className="relative w-full aspect-video rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                    {/* Simulator shows nice SVG or mock drawing when actual photo files aren't in system */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                      <svg className="w-16 h-16 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs font-semibold uppercase tracking-wider block text-slate-500">Ubicación Física del Punto</span>
                      <span className="text-[10px] font-mono mt-1 text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded">{currentStep.sub_acciones?.[0]?.imagen_url}</span>
                    </div>

                    {/* LILAC Category badge overlay */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm border ${getCategoryColor(currentStep.categoria_lilac).badge}`}>
                        {currentStep.categoria_lilac}
                      </span>
                    </div>

                    {/* Frequency badge overlay */}
                    <div className="absolute top-3 right-3 z-10">
                      <span className="text-[10px] font-extrabold px-2.5 py-1 bg-white text-slate-600 rounded-full shadow-sm border border-slate-200 uppercase tracking-wide">
                        {currentStep.frecuencia}
                      </span>
                    </div>
                  </div>

                  {/* Title & info */}
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-[#324354] leading-tight">
                      {currentStep.orden}. {currentStep.nombre_paso}
                    </h3>
                    
                    {/* Accept criteria */}
                    <p className="text-xs font-semibold text-slate-500 mt-1">
                      <strong className="text-slate-600">Criterio de aceptación:</strong> {currentStep.criterio_aceptacion}
                    </p>
                  </div>

                  {/* Expanded instructions ("Ver más") */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50">
                    <button
                      onClick={() => setIsSubActionsExpanded(!isSubActionsExpanded)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold text-[#324354]"
                    >
                      <span>INSTRUCCIONES DETALLADAS Y SUB-ACCIONES ({currentStep.sub_acciones?.length || 0})</span>
                      {isSubActionsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {isSubActionsExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-3 border-t border-slate-200/60 text-xs text-slate-600">
                        {currentStep.sub_acciones?.map((sub: any, idx: number) => (
                          <div key={idx} className="flex gap-2 items-start border-b border-slate-200/40 pb-2 last:border-0 last:pb-0">
                            <span className="bg-[#324354]/10 text-[#324354] w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="space-y-1">
                              <p className="leading-relaxed font-medium">{sub.detalle_texto}</p>
                              {sub.imagen_url && (
                                <span className="text-[9px] text-slate-400 block font-mono bg-white/50 px-1 py-0.5 rounded w-fit">Ref: {sub.imagen_url}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Eligibility check */}
                  <div className="bg-[#7B8E90]/5 border border-[#7B8E90]/10 rounded-2xl p-3 text-xs space-y-1 text-slate-600">
                    <span className="font-bold text-[#324354] block mb-1">Restricciones de seguridad obligatorias (Elegibilidad Operario):</span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-medium">
                      <div className="flex items-center gap-1.5">
                        <CheckSquare size={13} className="text-emerald-600" />
                        <span>Altura &lt; 1.5m</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckSquare size={13} className="text-emerald-600" />
                        <span>Sin desensamble</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckSquare size={13} className="text-emerald-600" />
                        <span>Htas Básicas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckSquare size={13} className="text-emerald-600" />
                        <span>Sin certif. especial</span>
                      </div>
                    </div>
                  </div>

                  {/* ANOMALY REPORTING DRAWER */}
                  {showAnomalyForm && (
                    <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 space-y-4 animate-in slide-in-from-bottom duration-300">
                      <div className="flex items-center justify-between border-b border-red-100 pb-2">
                        <h4 className="text-sm font-bold text-red-700 flex items-center gap-1.5">
                          <AlertTriangle size={16} /> Reportar Anomalía del Paso
                        </h4>
                        <button 
                          onClick={() => setShowAnomalyForm(false)}
                          className="text-red-500 hover:bg-red-100 p-1 rounded-full"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-red-600 uppercase">Descripción de la anomalía *</label>
                          <textarea
                            placeholder="Describa brevemente qué no cumple y cuál es el estado actual..."
                            value={anomalyForm.description}
                            onChange={e => setAnomalyForm({...anomalyForm, description: e.target.value})}
                            className="w-full p-2.5 bg-white border border-red-300 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-400 font-medium min-h-[60px]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-red-600 uppercase">Prioridad de reparación</label>
                            <select
                              value={anomalyForm.priority}
                              onChange={e => setAnomalyForm({...anomalyForm, priority: e.target.value})}
                              className="w-full h-9 bg-white border border-red-300 rounded-xl px-2 text-xs font-semibold outline-none"
                            >
                              <option value="Baja">Baja (Preventiva)</option>
                              <option value="Media">Media (Urgencia Media)</option>
                              <option value="Alta">Alta (Máquina Detenida / Riesgo)</option>
                            </select>
                          </div>

                          <div className="space-y-1 flex flex-col justify-end">
                            <button
                              type="button"
                              onClick={simulatePhotoUpload}
                              className="h-9 w-full bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 shadow-sm"
                            >
                              <Camera size={14} />
                              {anomalyForm.photo ? "Cambiar Foto" : "Subir Evidencia *"}
                            </button>
                          </div>
                        </div>

                        {anomalyForm.photo && (
                          <div className="bg-red-100/50 p-2 rounded-xl border border-red-200 flex items-center justify-between">
                            <span className="text-[9px] font-mono text-red-800 truncate max-w-[200px]">{anomalyForm.photo}</span>
                            <span className="text-[8px] font-bold px-1.5 py-0.5 bg-red-600 text-white rounded">OK</span>
                          </div>
                        )}
                        
                        <button
                          onClick={handleSaveAnomaly}
                          className="w-full py-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                        >
                          <Check size={14} />
                          <span>Guardar y Reportar Anomalía</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* BOTTOM ACTION BUTTONS */}
                  {!showAnomalyForm && (
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button
                        onClick={() => handleStepAnswer('cumple')}
                        className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                      >
                        <Check size={18} />
                        <span>Cumple</span>
                      </button>

                      <button
                        onClick={() => setShowAnomalyForm(true)}
                        className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                      >
                        <AlertTriangle size={18} />
                        <span>Reportar Anomalía</span>
                      </button>
                    </div>
                  )}

                  {/* Back, Next and N/A buttons */}
                  {!showAnomalyForm && (
                    <div className="flex justify-between items-center pt-2 text-xs border-t border-slate-100">
                      <button
                        onClick={handleGoBackStep}
                        disabled={currentStepIndex === 0}
                        className="font-bold text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"
                      >
                        &larr; Anterior
                      </button>

                      <button
                        onClick={() => handleStepAnswer('no_aplica')}
                        className="font-bold text-slate-400 hover:text-slate-600 italic"
                      >
                        No aplica en este turno
                      </button>

                      <span className="text-[10px] font-mono text-slate-400">
                        Estimado: {currentStep.tiempo_estimado_min} min
                      </span>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: ESTANDARES (CAPA A) */}
        {activeTab === 'estandares' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* Left sidebar: list of LILAC standards */}
              <div className="bg-white rounded-2xl border border-[#e2ded5] shadow-sm p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-[#324354] text-sm">Estándares LILAC</h3>
                </div>

                {/* New Standard Button */}
                <button
                  type="button"
                  onClick={() => setIsAddingStandard(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#324354] hover:bg-[#25313e] text-white font-bold rounded-xl transition duration-200 shadow-sm text-xs uppercase tracking-wider"
                >
                  <Plus size={16} />
                  <span>Nuevo Estándar</span>
                </button>

                {/* Search Box */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar estándar..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#324354] font-medium"
                  />
                  <div className="absolute left-3 top-3 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                <div className="space-y-2">
                  {standards
                    .filter(s => 
                      s.equipo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      s.labor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      s.planta?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedMasterEstandar(s); setIsAddingStandard(false) }}
                        className={`w-full p-3 rounded-xl border text-left transition ${
                          selectedMasterEstandar.id === s.id
                            ? 'border-[#324354] bg-[#324354]/5 font-semibold text-[#324354]'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="text-xs uppercase font-extrabold tracking-wider text-slate-400">{s.planta}</div>
                        <div className="text-sm font-bold truncate">{s.equipo}</div>
                        <div className="text-[11px] truncate text-slate-500">{s.labor}</div>
                      </button>
                    ))}
                  {standards.filter(s => 
                    s.equipo?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                    s.labor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    s.planta?.toLowerCase().includes(searchTerm.toLowerCase())
                  ).length === 0 && (
                    <div className="text-center text-xs text-slate-400 py-4">
                      No se encontraron estándares.
                    </div>
                  )}
                </div>
              </div>

              {/* Right content: Standard Details */}
              <div className="lg:col-span-3">
                {isAddingStandard ? (
                  // Add standard form
                  <form onSubmit={handleCreateStandard} className="bg-white rounded-3xl border border-[#e2ded5] shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="text-xl font-bold text-[#324354]">Registrar Nuevo Estándar LILAC (Capa A)</h3>
                        <p className="text-xs text-slate-500">Defina el equipo, planta y encabezado de la hoja de división de trabajo.</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsAddingStandard(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        Cancelar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Equipo *</label>
                        <input
                          type="text"
                          placeholder="Ej. Bordeadora Homag"
                          required
                          value={newStandardForm.equipo}
                          onChange={e => setNewStandardForm({...newStandardForm, equipo: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:border-[#324354]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Labor o Tarea *</label>
                        <input
                          type="text"
                          placeholder="Ej. Limpieza e Inspección"
                          required
                          value={newStandardForm.labor}
                          onChange={e => setNewStandardForm({...newStandardForm, labor: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:border-[#324354]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Planta</label>
                        <select
                          value={newStandardForm.planta}
                          onChange={e => setNewStandardForm({...newStandardForm, planta: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-2 text-sm outline-none"
                        >
                          <option value="MBL">Muebles (MBL)</option>
                          <option value="MS">Mármol Sintético (MS)</option>
                          <option value="FV">Fibra de Vidrio (FV)</option>
                          <option value="CEFI">CEFI</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Código HDT</label>
                        <input
                          type="text"
                          placeholder="Ej. HDT-BORD-01"
                          value={newStandardForm.codigo_hdt}
                          onChange={e => setNewStandardForm({...newStandardForm, codigo_hdt: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none focus:border-[#324354]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Elaboró</label>
                        <input
                          type="text"
                          placeholder="Nombre autor"
                          value={newStandardForm.elaboro}
                          onChange={e => setNewStandardForm({...newStandardForm, elaboro: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Aprobó</label>
                        <input
                          type="text"
                          placeholder="Nombre aprobador"
                          value={newStandardForm.aprobo}
                          onChange={e => setNewStandardForm({...newStandardForm, aprobo: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Herramientas (separadas por coma)</label>
                        <input
                          type="text"
                          placeholder="Brocha, llave fija, trapos"
                          value={newStandardForm.herramientas}
                          onChange={e => setNewStandardForm({...newStandardForm, herramientas: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Insumos (separadas por coma)</label>
                        <input
                          type="text"
                          placeholder="Thinner, trapo, lubricante"
                          value={newStandardForm.insumos}
                          onChange={e => setNewStandardForm({...newStandardForm, insumos: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">EPP Requeridos (separadas por coma)</label>
                        <input
                          type="text"
                          placeholder="Gafas, protección auditiva, guantes"
                          value={newStandardForm.epp}
                          onChange={e => setNewStandardForm({...newStandardForm, epp: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none"
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <label className="text-xs font-bold text-slate-500 uppercase">Nota de Seguridad / Nota General</label>
                        <input
                          type="text"
                          placeholder="Ej. No usar silicona en la máquina."
                          value={newStandardForm.nota_general}
                          onChange={e => setNewStandardForm({...newStandardForm, nota_general: e.target.value})}
                          className="w-full h-10 bg-slate-50 border border-slate-200 rounded-lg px-3 text-sm outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-[#324354] hover:bg-[#25313e] text-white font-bold rounded-xl transition duration-200 shadow-md"
                    >
                      Registrar Estandar y Crear Pasos por Defecto
                    </button>
                  </form>
                ) : (
                  // Display standard details
                  <div className="bg-white rounded-3xl border border-[#e2ded5] shadow-sm p-6 sm:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 bg-[#324354] text-white rounded uppercase">{selectedMasterEstandar.planta}</span>
                          <span className="text-xs font-bold px-2 py-0.5 bg-amber-500 text-white rounded">CRITICIDAD {selectedMasterEstandar.criticidad}</span>
                        </div>
                        <h3 className="text-xl font-bold text-[#324354] mt-1">{selectedMasterEstandar.equipo}</h3>
                        <p className="text-xs text-slate-500 font-semibold">{selectedMasterEstandar.labor}</p>
                      </div>
                      
                      <div className="text-right text-xs text-slate-400 font-medium">
                        <p>Código HDT: <strong className="text-slate-600">{selectedMasterEstandar.codigo_hdt}</strong></p>
                        <p>Versión: <strong className="text-slate-600">{selectedMasterEstandar.version || '1'}</strong></p>
                        <p>Fecha: <strong className="text-slate-600">{selectedMasterEstandar.fecha_elaboracion}</strong></p>
                      </div>
                    </div>

                    {/* Standard Header Info Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-[#F6F3EE] p-4 rounded-2xl border border-[#e2ded5]">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Herramientas</span>
                        <p className="text-xs font-bold text-slate-700">{selectedMasterEstandar.herramientas?.join(', ') || 'Ninguna'}</p>
                      </div>
                      <div className="bg-[#F6F3EE] p-4 rounded-2xl border border-[#e2ded5]">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Insumos</span>
                        <p className="text-xs font-bold text-slate-700">{selectedMasterEstandar.insumos?.join(', ') || 'Ninguno'}</p>
                      </div>
                      <div className="bg-[#F6F3EE] p-4 rounded-2xl border border-[#e2ded5]">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Equipo Protección (EPP)</span>
                        <p className="text-xs font-bold text-slate-700">{selectedMasterEstandar.epp?.join(', ') || 'Ninguno'}</p>
                      </div>
                    </div>

                    {selectedMasterEstandar.nota_general && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-1.5">
                        <Info size={14} className="flex-shrink-0 mt-0.5" />
                        <span><strong>Nota general de seguridad:</strong> {selectedMasterEstandar.nota_general}</span>
                      </div>
                    )}

                    {/* Steps list */}
                    <div className="space-y-4">
                      <h4 className="font-bold text-[#324354] border-b border-slate-100 pb-2">Tabla de Pasos del Estándar ({selectedMasterEstandar.steps?.length})</h4>
                      <div className="space-y-3">
                        {selectedMasterEstandar.steps?.map((step: any) => (
                          <div key={step.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-[#324354]/20 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="space-y-1.5 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-extrabold text-slate-400">Paso {step.orden}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getCategoryColor(step.categoria_lilac).badge}`}>
                                  {step.categoria_lilac}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                                  {step.frecuencia}
                                </span>
                              </div>
                              <h5 className="font-bold text-slate-800 text-sm">{step.nombre_paso}</h5>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                <strong className="text-slate-600">Aceptación:</strong> {step.criterio_aceptacion}
                              </p>
                              {step.sub_acciones?.length > 0 && (
                                <div className="text-[10px] text-slate-400 italic">
                                  Contiene {step.sub_acciones.length} sub-acciones registradas.
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-4 flex-shrink-0">
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Tiempo Estándar</span>
                                <span className="text-xs font-bold text-slate-700 flex items-center justify-end gap-1">
                                  <Clock size={12} /> {step.tiempo_estimado_min} minutos
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: HISTORIAL (CAPA B) */}
        {activeTab === 'historial' && (
          <div className="space-y-6">
            
            {/* Top row: historical list and active anomalies summary */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: List of rounds */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="font-bold text-[#324354] text-lg">Historial de Ejecuciones</h3>
                  <button
                    onClick={handleClearLocalData}
                    className="text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200 transition"
                  >
                    Restablecer Datos
                  </button>
                </div>

                {history.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center text-slate-500">
                    No se han registrado ejecuciones de rondas LILAC todavía.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((run) => (
                      <div key={run.id} className="bg-white rounded-3xl border border-[#e2ded5] shadow-sm p-5 space-y-4 hover:border-[#324354]/20 transition">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-extrabold text-slate-400 block uppercase">EJECUCIÓN {run.id}</span>
                            <h4 className="font-bold text-[#324354] text-base">{run.equipo}</h4>
                            <p className="text-xs text-slate-500 font-semibold">{run.estandar_nombre}</p>
                          </div>
                          
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${
                              run.cumplimiento_pct >= 90 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                : run.cumplimiento_pct >= 80 
                                ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}>
                              {run.cumplimiento_pct}% Cumplimiento
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-600">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Operario</span>
                            <span className="text-slate-800 flex items-center gap-1 mt-0.5"><User size={13} /> {run.operario}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Turno / Fecha</span>
                            <span className="text-slate-800 flex items-center gap-1 mt-0.5"><Calendar size={13} /> {run.turno} ({run.fecha})</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Tiempo Real vs Est</span>
                            <span className="text-slate-800 flex items-center gap-1 mt-0.5">
                              <Clock size={13} /> {run.tiempo_total_real} min <span className="text-slate-400">/ {run.tiempo_total_est} min</span>
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block uppercase">Anomalías</span>
                            <span className={`flex items-center gap-1 mt-0.5 font-bold ${
                              run.anomalias_detectadas > 0 ? 'text-red-600' : 'text-emerald-600'
                            }`}>
                              {run.anomalias_detectadas > 0 ? <AlertTriangle size={13} /> : <Check size={13} />}
                              {run.anomalias_detectadas} reportada{run.anomalias_detectadas !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>

                        {/* List of step details */}
                        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1.5">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Estado Detallado por Paso</span>
                          <div className="flex flex-wrap gap-2">
                            {run.registros?.map((reg: any, idx: number) => (
                              <span 
                                key={idx}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 border ${
                                  reg.estado === 'cumple'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : reg.estado === 'no_aplica'
                                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                                    : 'bg-red-50 text-red-800 border-red-200'
                                }`}
                                title={reg.comentario || undefined}
                              >
                                <span>Paso {idx+1}</span>
                                <span>{reg.estado === 'cumple' ? '✓' : reg.estado === 'no_aplica' ? 'N/A' : '⚠'}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Tarjetas de Anomalía (escalamientos) */}
              <div className="lg:col-span-4 space-y-4">
                <h3 className="font-bold text-[#324354] text-lg border-b border-slate-200 pb-2">Tarjetas de Anomalía</h3>
                
                {anomalies.length === 0 ? (
                  <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-6 text-center text-slate-500 text-xs">
                    Sin anomalías abiertas registradas.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {anomalies.map(ticket => (
                      <div key={ticket.id} className="bg-white border border-[#e2ded5] rounded-2xl shadow-sm p-4 space-y-3 relative overflow-hidden">
                        
                        {/* Priority line indicator */}
                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                          ticket.prioridad === 'Alta' 
                            ? 'bg-red-600' 
                            : ticket.prioridad === 'Media' 
                            ? 'bg-amber-500' 
                            : 'bg-blue-500'
                        }`}></div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[9px] font-mono font-bold text-slate-400">{ticket.id}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            ticket.estado === 'Cerrada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ticket.estado === 'En Proceso'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {ticket.estado}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-[#324354]">{ticket.equipo}</h4>
                          <span className="text-[10px] text-slate-400 block font-semibold truncate">{ticket.paso}</span>
                          <p className="text-xs text-slate-600 font-medium leading-relaxed bg-[#F6F3EE] p-2.5 rounded-xl border border-slate-200/50 mt-1.5">
                            {ticket.descripcion}
                          </p>
                        </div>

                        <div className="text-[10px] font-semibold text-slate-500 flex flex-wrap items-center justify-between gap-1">
                          <span>Escalado a: <strong>{ticket.responsable_escalado}</strong></span>
                          <span>Fecha: {ticket.fecha_reporte}</span>
                        </div>

                        {/* Supervisor action to change ticket status */}
                        {ticket.estado !== 'Cerrada' && (
                          <div className="pt-2 border-t border-slate-100 flex gap-2 justify-end">
                            {ticket.estado === 'Abierta' && (
                              <button
                                onClick={() => handleUpdateAnomalyStatus(ticket.id, 'En Proceso')}
                                className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                              >
                                Iniciar Atención
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateAnomalyStatus(ticket.id, 'Cerrada')}
                              className="text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200"
                            >
                              Resolver (Cerrar)
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDITORIA / KPIS */}
        {activeTab === 'auditoria' && (
          <div className="space-y-6">
            
            {/* Key KPI summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-[#e2ded5] shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Cumplimiento LILAC</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-[#324354]">{dashboardStats.avgCompliance}%</span>
                  <span className="text-xs text-emerald-600 font-bold flex items-center">&uarr; 2.5%</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-2 font-medium">Meta Organizacional: 90%</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#e2ded5] shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Tarjetas Abiertas</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-red-600">{dashboardStats.openTickets}</span>
                  <span className="text-xs text-slate-500 font-medium">tickets activos</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-2 font-medium">Tiempo prom. cierre: 12h</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#e2ded5] shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Tarjetas Cerradas</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-emerald-600">{dashboardStats.closedTickets}</span>
                  <span className="text-xs text-slate-500 font-medium">este mes</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-2 font-medium">Tasa de resolución: 66%</span>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#e2ded5] shadow-sm flex flex-col justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Rondas Registradas</span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-[#324354]">{dashboardStats.totalRounds}</span>
                  <span className="text-xs text-slate-500 font-medium">ejecuciones</span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-2 font-medium">SCM Enchapadora V1</span>
              </div>
            </div>

            {/* Calibration and Failures chart representation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Calibration: real time vs standard time per step */}
              <div className="bg-white rounded-3xl border border-[#e2ded5] p-6 shadow-sm space-y-4">
                <div>
                  <h4 className="text-base font-bold text-[#324354]">Calibración de Tiempos LILAC</h4>
                  <p className="text-xs text-slate-400">Comparación del tiempo estimado (Capa A) vs tiempo real promedio (Capa B) en segundos.</p>
                </div>

                <div className="space-y-3">
                  {stepCalibrationData.map(step => (
                    <div key={step.id} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>{step.name} ({SEED_ESTANDAR.steps.find(s => s.id === step.id)?.nombre_paso.substring(0, 35)}...)</span>
                        <span>
                          {step["Promedio Real (Seg)"]}s <span className="text-slate-400">/ {step["Estándar (Seg)"]}s</span>
                        </span>
                      </div>
                      
                      {/* Bar graph visualization */}
                      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex relative">
                        {/* Standard background line indicator */}
                        <div 
                          className="bg-[#324354] h-full rounded-l-full"
                          style={{ width: `${Math.min(100, (step["Estándar (Seg)"] / 720) * 100)}%` }}
                        ></div>
                        {/* Actual progress line */}
                        <div 
                          className={`absolute top-0 bottom-0 left-0 opacity-60 rounded-full ${
                            step["Promedio Real (Seg)"] > step["Estándar (Seg)"] * 1.2 ? 'bg-red-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, (step["Promedio Real (Seg)"] / 720) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end gap-4 text-[10px] font-bold uppercase pt-2">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-[#324354] rounded"></span> Estándar</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded"></span> Real (Promedio)</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-red-500 rounded"></span> Desviación crítica (&gt;20%)</span>
                  </div>
                </div>
              </div>

              {/* Zero breakdown & Failure cause distribution */}
              <div className="bg-white rounded-3xl border border-[#e2ded5] p-6 shadow-sm space-y-6">
                <div>
                  <h4 className="text-base font-bold text-[#324354]">Deterioro Forzado vs Desgaste Natural</h4>
                  <p className="text-xs text-slate-400">Distribución de averías registradas. La meta LILAC es reducir a cero las fallas por falta de limpieza/inspección.</p>
                </div>

                <div className="flex items-center justify-around py-4 gap-4">
                  {/* Pie chart representation */}
                  <div className="w-32 h-32 rounded-full border-8 border-slate-100 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-conic bg-[#d14747] opacity-90" style={{ backgroundImage: 'conic-gradient(#d14747 0% 65%, #deb841 65% 90%, #59a96a 90% 100%)' }}></div>
                    <div className="absolute w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center">
                      <span className="text-2xl font-extrabold text-red-600">65%</span>
                      <span className="text-[8px] font-bold text-slate-400 uppercase">Deterioro</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-[#d14747] rounded-full"></span>
                      <span>Deterioro Forzado (Falta Limpieza/Lubricación) - 65%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-[#deb841] rounded-full"></span>
                      <span>Ajustes Descalibrados / Operación - 25%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-[#59a96a] rounded-full"></span>
                      <span>Desgaste Natural inevitable - 10%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-800 space-y-1">
                  <span className="font-bold flex items-center gap-1"><AlertCircle size={14} /> Análisis de Diagnóstico:</span>
                  <p className="font-medium text-red-700">
                    El <strong>65%</strong> de las averías en la planta de MBL en las últimas 4 semanas corresponden a <strong>Deterioro Forzado</strong> (acumulaciones de polvillo en rodillos y guías). La implementación estricta del estándar LILAC para la Enchapadora SCM proyecta eliminar estas fallas.
                  </p>
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  )
}
