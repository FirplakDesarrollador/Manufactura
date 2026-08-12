"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Search, 
  X, 
  Cpu, 
  Settings, 
  Hammer, 
  Info, 
  ShieldAlert, 
  DollarSign, 
  FileText, 
  User, 
  Phone, 
  Mail, 
  ExternalLink,
  MapPin,
  Calendar,
  AlertTriangle,
  FolderOpen,
  Plus,
  ArrowUpDown,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  Lock,
  GitMerge,
  Trash2,
  Edit
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/opt-sistemica/Header";

interface MaquinaEquipo {
  id: number;
  codigo_equipo: string | null;
  activo_fijo: string | null;
  tipo: string | null;
  estado: string | null;
  nombre_equipo: string;
  nombre_alterno: string | null;
  marca: string | null;
  modelo: string | null;
  caracteristicas: string | null;
  fecha_compra: string | null;
  proveedor_nombre: string | null;
  proveedor_contacto: string | null;
  proveedor_telefono: string | null;
  proveedor_email: string | null;
  fecha_instalacion: string | null;
  valor_compra: number | null;
  valor_nuevo: number | null;
  planta: string | null;
  proceso: string | null;
  clasificacion: "A" | "B" | "C" | null;
  criticidad: "A" | "B" | "C" | null;
  bodega: string | null;
  factura: string | null;
  fotos: string | null;
  planos: string | null;
  manuales: string | null;
  estandares: string | null;
  notas_calidad_dato: string | null;
  notas: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export default function MaquinasPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"inventario" | "admin">("inventario");
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  
  // Data State
  const [maquinas, setMaquinas] = useState<MaquinaEquipo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMaquina, setSelectedMaquina] = useState<MaquinaEquipo | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  
  // Sorting State
  const [sortColumn, setSortColumn] = useState<keyof MaquinaEquipo | "">("nombre_equipo");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Filter states
  const [selectedPlanta, setSelectedPlanta] = useState("Todas");
  const [selectedCriticidad, setSelectedCriticidad] = useState("Todas");
  const [selectedEstado, setSelectedEstado] = useState("Todos");

  // Admin Actions State
  const [adminAction, setAdminAction] = useState<"nuevo" | "editar" | "unificar">("nuevo");
  const [selectedEditMachineId, setSelectedEditMachineId] = useState<number | null>(null);
  const [primaryMergeMachineId, setPrimaryMergeMachineId] = useState<number | null>(null);
  const [secondaryMergeMachineId, setSecondaryMergeMachineId] = useState<number | null>(null);

  // New/Edit Record Form State
  const [formData, setFormData] = useState({
    nombre_equipo: "",
    nombre_alterno: "",
    codigo_equipo: "",
    activo_fijo: "",
    tipo: "",
    estado: "ACTIVO",
    marca: "",
    modelo: "",
    caracteristicas: "",
    fecha_compra: "",
    fecha_instalacion: "",
    valor_compra: "",
    valor_nuevo: "",
    planta: "",
    proceso: "",
    clasificacion: "",
    criticidad: "",
    bodega: "",
    factura: "",
    fotos: "",
    planos: "",
    manuales: "",
    estandares: "",
    notas: "",
    notas_calidad_dato: ""
  });
  
  const [uploadingFiles, setUploadingFiles] = useState<{
    fotos?: boolean;
    planos?: boolean;
    manuales?: boolean;
    estandares?: boolean;
  }>({});

  const [providerData, setProviderData] = useState({
    proveedor_nombre: "",
    proveedor_contacto: "",
    proveedor_telefono: "",
    proveedor_email: ""
  });

  const fetchMachines = async () => {
    try {
      const { data, error } = await supabase
        .from("maquinas_equipos")
        .select("*")
        .order("nombre_equipo", { ascending: true });

      if (error) throw error;

      if (data) {
        setMaquinas(data as MaquinaEquipo[]);
      }
    } catch (err) {
      console.error("Error fetching machines:", err);
    }
  };

  const isValidUrl = (url: string | null) => {
    if (!url) return false;
    const clean = url.trim();
    return clean.startsWith("http://") || clean.startsWith("https://") || clean.startsWith("/") || clean.startsWith("data:");
  };

  useEffect(() => {
    const checkUserAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserEmail(user.email || "");

      // Check User Role & Permissions from Database
      try {
        const { data: userData, error: userError } = await supabase
          .from("usuarios")
          .select("permisos, rol")
          .eq("correo", user.email)
          .single();

        if (!userError && userData) {
          const isAllowed = 
            userData.rol === "admin" || 
            userData.rol === "desarrollador" || 
            (userData.permisos?.mantenimiento?.administrador === true);
          setHasAdminAccess(isAllowed);
        }
      } catch (err) {
        console.error("Error fetching permissions:", err);
      }

      await fetchMachines();
      setLoading(false);
    };

    checkUserAndFetch();
  }, [router]);

  // Handle file uploads to Supabase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: "fotos" | "planos" | "manuales" | "estandares") => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFiles(prev => ({ ...prev, [fieldName]: true }));
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `maquinas/${fieldName}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("fichas-media")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("fichas-media").getPublicUrl(fileName);
      if (data?.publicUrl) {
        setFormData(prev => ({ ...prev, [fieldName]: data.publicUrl }));
      }
    } catch (err) {
      console.error(`Error uploading ${fieldName}:`, err);
      alert("Error al subir el archivo. Inténtalo de nuevo.");
    } finally {
      setUploadingFiles(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  // Reset form helper
  const resetForm = () => {
    setFormData({
      nombre_equipo: "",
      nombre_alterno: "",
      codigo_equipo: "",
      activo_fijo: "",
      tipo: "",
      estado: "ACTIVO",
      marca: "",
      modelo: "",
      caracteristicas: "",
      fecha_compra: "",
      fecha_instalacion: "",
      valor_compra: "",
      valor_nuevo: "",
      planta: "",
      proceso: "",
      clasificacion: "",
      criticidad: "",
      bodega: "",
      factura: "",
      fotos: "",
      planos: "",
      manuales: "",
      estandares: "",
      notas: "",
      notas_calidad_dato: ""
    });
    setProviderData({
      proveedor_nombre: "",
      proveedor_contacto: "",
      proveedor_telefono: "",
      proveedor_email: ""
    });
  };

  // Select machine to edit
  const handleSelectEditMachine = (machineId: number) => {
    if (!machineId) {
      setSelectedEditMachineId(null);
      resetForm();
      return;
    }
    setSelectedEditMachineId(machineId);
    const selected = maquinas.find((m) => m.id === machineId);
    if (selected) {
      setFormData({
        nombre_equipo: selected.nombre_equipo || "",
        nombre_alterno: selected.nombre_alterno || "",
        codigo_equipo: selected.codigo_equipo || "",
        activo_fijo: selected.activo_fijo || "",
        tipo: selected.tipo || "",
        estado: selected.estado || "ACTIVO",
        marca: selected.marca || "",
        modelo: selected.modelo || "",
        caracteristicas: selected.caracteristicas || "",
        fecha_compra: selected.fecha_compra || "",
        fecha_instalacion: selected.fecha_instalacion || "",
        valor_compra: selected.valor_compra ? String(selected.valor_compra) : "",
        valor_nuevo: selected.valor_nuevo ? String(selected.valor_nuevo) : "",
        planta: selected.planta || "",
        proceso: selected.proceso || "",
        clasificacion: selected.clasificacion || "",
        criticidad: selected.criticidad || "",
        bodega: selected.bodega || "",
        factura: selected.factura || "",
        fotos: selected.fotos || "",
        planos: selected.planos || "",
        manuales: selected.manuales || "",
        estandares: selected.estandares || "",
        notas: selected.notas || "",
        notas_calidad_dato: selected.notas_calidad_dato || ""
      });
      setProviderData({
        proveedor_nombre: selected.proveedor_nombre || "",
        proveedor_contacto: selected.proveedor_contacto || "",
        proveedor_telefono: selected.proveedor_telefono || "",
        proveedor_email: selected.proveedor_email || ""
      });
    }
  };

  // Deletion logic
  const handleDeleteMachine = async () => {
    if (!selectedEditMachineId) return;
    const confirmDelete = window.confirm(
      "¿Estás seguro de que deseas eliminar este equipo permanentemente? Esta acción no se puede deshacer."
    );
    if (!confirmDelete) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("maquinas_equipos")
        .delete()
        .eq("id", selectedEditMachineId);

      if (error) throw error;

      alert("Equipo eliminado exitosamente.");
      setSelectedEditMachineId(null);
      resetForm();
      await fetchMachines();
      setActiveTab("inventario");
    } catch (err) {
      console.error("Error deleting machine:", err);
      alert("Error al eliminar el registro.");
    } finally {
      setSaving(false);
    }
  };

  // Handle form submission (Insert or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_equipo) {
      alert("El nombre de la máquina es obligatorio.");
      return;
    }

    setSaving(true);
    try {
      const recordToSave = {
        ...formData,
        ...providerData,
        valor_compra: formData.valor_compra ? parseFloat(formData.valor_compra) : null,
        valor_nuevo: formData.valor_nuevo ? parseFloat(formData.valor_nuevo) : null,
        fecha_compra: formData.fecha_compra || null,
        fecha_instalacion: formData.fecha_instalacion || null,
        clasificacion: formData.clasificacion || null,
        criticidad: formData.criticidad || null,
        codigo_equipo: formData.codigo_equipo || null,
        activo_fijo: formData.activo_fijo || null,
        nombre_alterno: formData.nombre_alterno || null,
        tipo: formData.tipo || null,
        estado: formData.estado || null,
        marca: formData.marca || null,
        modelo: formData.modelo || null,
        caracteristicas: formData.caracteristicas || null,
        planta: formData.planta || null,
        proceso: formData.proceso || null,
        bodega: formData.bodega || null,
        factura: formData.factura || null,
        fotos: formData.fotos || null,
        planos: formData.planos || null,
        manuales: formData.manuales || null,
        estandares: formData.estandares || null,
        notas: formData.notas || null,
        notas_calidad_dato: formData.notas_calidad_dato || null
      };

      if (adminAction === "nuevo") {
        const { error } = await supabase
          .from("maquinas_equipos")
          .insert([recordToSave]);
        if (error) throw error;
        alert("Equipo registrado exitosamente.");
      } else if (adminAction === "editar" && selectedEditMachineId) {
        const { error } = await supabase
          .from("maquinas_equipos")
          .update(recordToSave)
          .eq("id", selectedEditMachineId);
        if (error) throw error;
        alert("Equipo actualizado exitosamente.");
      }

      resetForm();
      setSelectedEditMachineId(null);
      await fetchMachines();
      setActiveTab("inventario");
    } catch (err) {
      console.error("Error saving machine record:", err);
      alert("Error al guardar el registro. Por favor verifica los datos.");
    } finally {
      setSaving(false);
    }
  };

  // Merge machines logic
  const handleMergeMachines = async () => {
    if (!primaryMergeMachineId || !secondaryMergeMachineId) {
      alert("Selecciona ambas máquinas para unificarlas.");
      return;
    }
    if (primaryMergeMachineId === secondaryMergeMachineId) {
      alert("No puedes unificar una máquina con ella misma.");
      return;
    }

    const prim = maquinas.find((m) => m.id === primaryMergeMachineId);
    const sec = maquinas.find((m) => m.id === secondaryMergeMachineId);
    if (!prim || !sec) return;

    const confirmMerge = window.confirm(
      `¿Estás seguro de que deseas unificar estos registros? Se completarán los datos faltantes en ${prim.nombre_equipo} y se ELIMINARÁ el registro de ${sec.nombre_equipo} de la base de datos permanentemente.`
    );
    if (!confirmMerge) return;

    setSaving(true);
    try {
      const merged: any = { ...prim };
      // Copy null/empty fields from secondary to primary
      Object.keys(prim).forEach((key) => {
        const k = key as keyof MaquinaEquipo;
        if (prim[k] === null || prim[k] === undefined || String(prim[k]).trim() === "") {
          if (sec[k] !== null && sec[k] !== undefined && String(sec[k]).trim() !== "") {
            merged[k] = sec[k];
          }
        }
      });

      // Remove autogenerated db keys
      delete merged.id;
      delete merged.created_at;
      delete merged.updated_at;

      // 1. Update primary machine
      const { error: updateError } = await supabase
        .from("maquinas_equipos")
        .update(merged)
        .eq("id", primaryMergeMachineId);

      if (updateError) throw updateError;

      // 2. Delete secondary machine
      const { error: deleteError } = await supabase
        .from("maquinas_equipos")
        .delete()
        .eq("id", secondaryMergeMachineId);

      if (deleteError) throw deleteError;

      alert("Máquinas unificadas exitosamente.");
      setPrimaryMergeMachineId(null);
      setSecondaryMergeMachineId(null);
      await fetchMachines();
      setActiveTab("inventario");
    } catch (err) {
      console.error("Error merging machines:", err);
      alert("Error al unificar los registros.");
    } finally {
      setSaving(false);
    }
  };

  // Sorting Handler
  const handleSort = (column: keyof MaquinaEquipo) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (column: keyof MaquinaEquipo) => {
    if (sortColumn !== column) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-400 inline-block" />;
    return sortDirection === "asc" 
      ? <span className="ml-1 text-white text-[10px]">▲</span> 
      : <span className="ml-1 text-white text-[10px]">▼</span>;
  };

  // Filtered and sorted machines memo
  const processedMaquinas = useMemo(() => {
    let result = maquinas;

    // Apply Search
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      result = result.filter(m => 
        m.nombre_equipo.toLowerCase().includes(term) ||
        (m.nombre_alterno && m.nombre_alterno.toLowerCase().includes(term)) ||
        (m.codigo_equipo && m.codigo_equipo.toLowerCase().includes(term)) ||
        (m.marca && m.marca.toLowerCase().includes(term)) ||
        (m.modelo && m.modelo.toLowerCase().includes(term)) ||
        (m.tipo && m.tipo.toLowerCase().includes(term)) ||
        (m.proceso && m.proceso.toLowerCase().includes(term))
      );
    }

    // Apply Planta
    if (selectedPlanta !== "Todas") {
      result = result.filter(m => m.planta === selectedPlanta);
    }

    // Apply Criticidad
    if (selectedCriticidad !== "Todas") {
      result = result.filter(m => m.criticidad === selectedCriticidad);
    }

    // Apply Estado
    if (selectedEstado !== "Todos") {
      result = result.filter(m => m.estado === selectedEstado);
    }

    // Apply Sorting
    if (sortColumn) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        
        let comparison = 0;
        if (typeof aVal === "number" && typeof bVal === "number") {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal), "es", { numeric: true });
        }
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }

    return result;
  }, [maquinas, searchTerm, selectedPlanta, selectedCriticidad, selectedEstado, sortColumn, sortDirection]);

  // Unique options for filters
  const uniquePlantas = useMemo(() => Array.from(new Set(maquinas.map(m => m.planta).filter(Boolean))) as string[], [maquinas]);
  const uniqueEstados = useMemo(() => Array.from(new Set(maquinas.map(m => m.estado).filter(Boolean))) as string[], [maquinas]);

  // Merge items selection variables
  const primaryMergeMachine = useMemo(() => maquinas.find((m) => m.id === primaryMergeMachineId), [maquinas, primaryMergeMachineId]);
  const secondaryMergeMachine = useMemo(() => maquinas.find((m) => m.id === secondaryMergeMachineId), [maquinas, secondaryMergeMachineId]);

  // Helper for Criticidad badges
  const renderCriticidad = (crit: "A" | "B" | "C" | null) => {
    if (!crit) return <span className="text-gray-400">-</span>;
    const colors = {
      A: "bg-red-50 text-[#d14747] border-[#d14747]/20",
      B: "bg-amber-50 text-[#deb841] border-[#deb841]/20",
      C: "bg-[#F6F3EE] text-[#7B8E90] border-[#e2ded5]",
    };
    const labels = {
      A: "Crítica (A)",
      B: "Media (B)",
      C: "Baja (C)"
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${colors[crit]}`}>
        {labels[crit]}
      </span>
    );
  };

  // Helper for Estado badges
  const renderEstado = (estado: string | null) => {
    if (!estado) return <span className="text-gray-400">-</span>;
    const normalized = estado.toLowerCase();
    
    let colorClass = "bg-slate-100 text-slate-700 border-slate-200";
    if (normalized.includes("activa") || normalized.includes("operativa") || normalized.includes("funcionamiento") || normalized.includes("activo")) {
      colorClass = "bg-[#59a96a]/10 text-[#59a96a] border-[#59a96a]/20";
    } else if (normalized.includes("mantenimiento") || normalized.includes("reparación") || normalized.includes("espera") || normalized.includes("reparacion")) {
      colorClass = "bg-[#deb841]/10 text-[#deb841] border-[#deb841]/20";
    } else if (normalized.includes("fuera") || normalized.includes("dañada") || normalized.includes("baja") || normalized.includes("parada")) {
      colorClass = "bg-[#d14747]/10 text-[#d14747] border-[#d14747]/20";
    }

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wider ${colorClass}`}>
        {estado}
      </span>
    );
  };

  // Format currency
  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F3EE] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#324354]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F3EE] font-sans text-[#000000] selection:bg-[#324354] selection:text-white">
      <Header
        title="Mantenimiento"
        subtitle="Máquinas y Equipos"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }}
      />

      {/* Navigation SubHeader */}
      <div className="bg-white border-b border-[#e2ded5] py-2.5 px-4 shadow-sm relative z-30 w-full font-sans">
        <div className="max-w-7xl mx-auto flex flex-row flex-nowrap gap-3 justify-center overflow-x-auto scrollbar-hide py-0.5">
          <button
            onClick={() => setActiveTab("inventario")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer border-none whitespace-nowrap flex-shrink-0 ${
              activeTab === "inventario"
                ? "bg-[#324354] text-white shadow-md"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Inventario de Equipos</span>
          </button>
          
          {/* Only render Administrador tab if user has access */}
          {hasAdminAccess && (
            <button
              onClick={() => {
                setActiveTab("admin");
                resetForm();
                setSelectedEditMachineId(null);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-xs cursor-pointer border-none whitespace-nowrap flex-shrink-0 ${
                activeTab === "admin"
                  ? "bg-[#324354] text-white shadow-md"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-700"
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Administrador</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "inventario" ? (
        /* Inventory List Tab */
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto w-full animate-in fade-in duration-300">
          
          {/* Title & Stats */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <button
                onClick={() => router.push("/mantenimiento")}
                className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#324354] uppercase tracking-wider transition-colors duration-200"
              >
                <ArrowLeft size={14} />
                <span>Volver a Mantenimiento</span>
              </button>
              <h1 className="text-3xl font-black text-[#324354] mt-1 tracking-tight font-sans">
                Hoja de Vida de Máquinas
              </h1>
            </div>

            {/* Quick stats badges */}
            <div className="flex flex-wrap gap-3">
              <div className="bg-white border border-[#e2ded5] px-4 py-2 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-500">Total Máquinas</p>
                <p className="text-xl font-black text-[#324354]">{maquinas.length}</p>
              </div>
              <div className="bg-white border border-[#e2ded5] px-4 py-2 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-500">Activas / Operativas</p>
                <p className="text-xl font-black text-[#59a96a]">
                  {maquinas.filter(m => 
                    m.estado?.toLowerCase().includes("activa") || 
                    m.estado?.toLowerCase().includes("activo") || 
                    m.estado?.toLowerCase().includes("operativa")
                  ).length}
                </p>
              </div>
              <div className="bg-white border border-[#e2ded5] px-4 py-2 rounded-2xl shadow-sm">
                <p className="text-[10px] uppercase font-bold text-gray-500">En Mantenimiento</p>
                <p className="text-xl font-black text-[#deb841]">
                  {maquinas.filter(m => 
                    m.estado?.toLowerCase().includes("mantenimiento") ||
                    m.estado?.toLowerCase().includes("reparación") ||
                    m.estado?.toLowerCase().includes("reparacion")
                  ).length}
                </p>
              </div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white border border-[#e2ded5] rounded-3xl p-5 shadow-[0_4px_25px_rgba(50,67,84,0.03)] mb-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            
            {/* Search bar */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por código, nombre, marca, proceso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-10 py-3 bg-[#F6F3EE] rounded-2xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium transition-all duration-200 outline-none placeholder:text-gray-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Plant dropdown */}
            <div className="w-full lg:w-48">
              <select
                value={selectedPlanta}
                onChange={(e) => setSelectedPlanta(e.target.value)}
                className="w-full px-4 py-3 bg-[#F6F3EE] rounded-2xl border border-[#e2ded5] text-sm font-bold text-[#324354] focus:border-[#324354]/40 outline-none transition-all cursor-pointer"
              >
                <option value="Todas">Planta: Todas</option>
                {uniquePlantas.map((pl, idx) => (
                  <option key={idx} value={pl}>{pl}</option>
                ))}
              </select>
            </div>

            {/* Criticality dropdown */}
            <div className="w-full lg:w-48">
              <select
                value={selectedCriticidad}
                onChange={(e) => setSelectedCriticidad(e.target.value)}
                className="w-full px-4 py-3 bg-[#F6F3EE] rounded-2xl border border-[#e2ded5] text-sm font-bold text-[#324354] focus:border-[#324354]/40 outline-none transition-all cursor-pointer"
              >
                <option value="Todas">Criticidad: Todas</option>
                <option value="A">Clase A (Crítica)</option>
                <option value="B">Clase B (Media)</option>
                <option value="C">Clase C (Baja)</option>
              </select>
            </div>

            {/* Status dropdown */}
            <div className="w-full lg:w-48">
              <select
                value={selectedEstado}
                onChange={(e) => setSelectedEstado(e.target.value)}
                className="w-full px-4 py-3 bg-[#F6F3EE] rounded-2xl border border-[#e2ded5] text-sm font-bold text-[#324354] focus:border-[#324354]/40 outline-none transition-all cursor-pointer"
              >
                <option value="Todos">Estado: Todos</option>
                {uniqueEstados.map((st, idx) => (
                  <option key={idx} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sortable Table Section */}
          <div className="bg-white border border-[#e2ded5] shadow-[0_4px_25px_rgba(50,67,84,0.03)] overflow-hidden">
            <div className="overflow-x-auto max-h-[60vh] scrollbar-thin">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="bg-[#324354] text-white uppercase text-[11px] font-extrabold tracking-wider border-b border-[#e2ded5] sticky top-0 z-20">
                    <th 
                      onClick={() => handleSort("codigo_equipo")} 
                      className="py-4 px-6 font-bold cursor-pointer select-none hover:bg-slate-700/50 transition-colors"
                    >
                      Código {renderSortIndicator("codigo_equipo")}
                    </th>
                    <th 
                      onClick={() => handleSort("nombre_equipo")} 
                      className="py-4 px-6 font-bold cursor-pointer select-none hover:bg-slate-700/50 transition-colors"
                    >
                      Nombre Equipo {renderSortIndicator("nombre_equipo")}
                    </th>
                    <th 
                      onClick={() => handleSort("marca")} 
                      className="py-4 px-6 font-bold cursor-pointer select-none hover:bg-slate-700/50 transition-colors"
                    >
                      Marca / Modelo {renderSortIndicator("marca")}
                    </th>
                    <th 
                      onClick={() => handleSort("planta")} 
                      className="py-4 px-6 font-bold cursor-pointer select-none hover:bg-slate-700/50 transition-colors"
                    >
                      Planta / Proceso {renderSortIndicator("planta")}
                    </th>
                    <th 
                      onClick={() => handleSort("criticidad")} 
                      className="py-4 px-6 font-bold cursor-pointer select-none hover:bg-slate-700/50 text-center transition-colors"
                    >
                      Criticidad {renderSortIndicator("criticidad")}
                    </th>
                    <th 
                      onClick={() => handleSort("estado")} 
                      className="py-4 px-6 font-bold cursor-pointer select-none hover:bg-slate-700/50 text-center transition-colors"
                    >
                      Estado {renderSortIndicator("estado")}
                    </th>
                    <th className="py-4 px-6 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2ded5]">
                  {processedMaquinas.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-gray-500">
                        <div className="flex flex-col items-center justify-center space-y-3">
                          <FolderOpen className="w-12 h-12 text-[#7B8E90]" />
                          <p className="text-base font-bold">No se encontraron máquinas</p>
                          <p className="text-xs text-gray-400 max-w-sm">
                            Intenta ajustar el término de búsqueda o cambiar los filtros seleccionados en la barra superior.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    processedMaquinas.map((m) => (
                      <tr
                        key={m.id}
                        onClick={() => setSelectedMaquina(m)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors duration-150 group"
                      >
                        <td className="py-4 px-6 font-black text-sm text-[#324354] group-hover:text-[#324354]/80">
                          {m.codigo_equipo || <span className="text-gray-400 font-normal">S/C</span>}
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-bold text-gray-800 text-sm">{m.nombre_equipo}</div>
                          {m.nombre_alterno && (
                            <div className="text-xs text-gray-400 font-medium italic mt-0.5">{m.nombre_alterno}</div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-sm text-gray-600 font-semibold">
                          {m.marca || m.modelo ? (
                            <span>{m.marca || "-"} {m.modelo ? `/ ${m.modelo}` : ""}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm font-bold text-gray-700">{m.planta || "-"}</div>
                          {m.proceso && (
                            <div className="text-[11px] text-gray-400 uppercase font-bold mt-0.5">{m.proceso}</div>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {renderCriticidad(m.criticidad)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          {renderEstado(m.estado)}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMaquina(m);
                            }}
                            className="px-3.5 py-1.5 bg-[#F6F3EE] hover:bg-[#324354] text-[#324354] hover:text-white rounded-xl border border-[#e2ded5] text-xs font-bold transition-all duration-200 cursor-pointer"
                          >
                            Ver Detalle
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      ) : (
        /* Administrador Tab (Requires Authorization) */
        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1200px] mx-auto w-full animate-in fade-in duration-300">
          
          {/* Safeguard block */}
          {!hasAdminAccess ? (
            <div className="bg-white border border-[#d14747]/20 rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto mt-12 shadow-md">
              <Lock className="w-12 h-12 text-[#d14747] mx-auto" />
              <h2 className="text-lg font-black text-gray-800">Acceso No Autorizado</h2>
              <p className="text-xs text-gray-500 leading-relaxed">
                No tienes los permisos de administrador de mantenimiento necesarios para acceder a esta sección. Solicita acceso en el módulo de configuración de usuarios.
              </p>
              <button 
                onClick={() => setActiveTab("inventario")}
                className="px-6 py-2.5 bg-[#324354] text-white font-bold rounded-xl text-xs uppercase tracking-wider border-none cursor-pointer"
              >
                Volver al Inventario
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#e2ded5] rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_rgba(50,67,84,0.03)] space-y-6">
              
              {/* Header & Sub-actions toolbar */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-2xl font-black text-[#324354] flex items-center gap-2">
                    <Settings className="w-6 h-6" />
                    <span>Panel de Administración</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Gestiona altas, modificaciones, bajas y unificación de duplicados en el inventario.
                  </p>
                </div>

                <div className="flex bg-[#F6F3EE] p-1.5 rounded-2xl gap-2 w-full md:w-auto">
                  <button
                    onClick={() => {
                      setAdminAction("nuevo");
                      setSelectedEditMachineId(null);
                      resetForm();
                    }}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border-none transition-all cursor-pointer ${
                      adminAction === "nuevo"
                        ? "bg-[#324354] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuevo Registro</span>
                  </button>
                  <button
                    onClick={() => {
                      setAdminAction("editar");
                      setSelectedEditMachineId(null);
                      resetForm();
                    }}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border-none transition-all cursor-pointer ${
                      adminAction === "editar"
                        ? "bg-[#324354] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar / Eliminar</span>
                  </button>
                  <button
                    onClick={() => {
                      setAdminAction("unificar");
                      setPrimaryMergeMachineId(null);
                      setSecondaryMergeMachineId(null);
                    }}
                    className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border-none transition-all cursor-pointer ${
                      adminAction === "unificar"
                        ? "bg-[#324354] text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Unificar</span>
                  </button>
                </div>
              </div>

              {/* ACTION 1 & 2: Form (Create or Edit) */}
              {(adminAction === "nuevo" || adminAction === "editar") && (
                <div className="space-y-6">
                  {/* Selector for Edit Mode */}
                  {adminAction === "editar" && (
                    <div className="bg-[#F6F3EE]/40 p-4 border border-[#e2ded5] rounded-2xl space-y-2">
                      <label className="block text-xs font-bold text-[#324354] uppercase tracking-wider">
                        Selecciona el Equipo a Modificar o Eliminar:
                      </label>
                      <select
                        value={selectedEditMachineId || ""}
                        onChange={(e) => handleSelectEditMachine(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-white rounded-xl border border-[#e2ded5] text-sm font-bold text-[#324354] focus:border-[#324354]/40 outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- Buscar / Seleccionar Máquina del Inventario --</option>
                        {maquinas.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.codigo_equipo ? `[${m.codigo_equipo}] ` : ""}{m.nombre_equipo} {m.marca ? `(${m.marca})` : ""} {m.planta ? `[Planta ${m.planta}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Form fields rendering */}
                  {(adminAction === "nuevo" || selectedEditMachineId !== null) ? (
                    <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in duration-200">
                      
                      {/* Section 1 */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider border-b border-slate-100 pb-2">
                          1. Datos de Identificación y Especificaciones
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Nombre Equipo *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. Acolilladora de 12 Pulgadas"
                              value={formData.nombre_equipo}
                              onChange={(e) => setFormData(prev => ({ ...prev, nombre_equipo: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Nombre Alternativo</label>
                            <input
                              type="text"
                              placeholder="Ej. Tronzadora de perfiles"
                              value={formData.nombre_alterno}
                              onChange={(e) => setFormData(prev => ({ ...prev, nombre_alterno: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Código Equipo</label>
                            <input
                              type="text"
                              placeholder="Ej. MT-045"
                              value={formData.codigo_equipo}
                              onChange={(e) => setFormData(prev => ({ ...prev, codigo_equipo: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Activo Fijo</label>
                            <input
                              type="text"
                              placeholder="Ej. AF-12345"
                              value={formData.activo_fijo}
                              onChange={(e) => setFormData(prev => ({ ...prev, activo_fijo: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Tipo de Equipo</label>
                            <input
                              type="text"
                              placeholder="Ej. Neumática, Eléctrica"
                              value={formData.tipo}
                              onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Estado Inicial</label>
                            <select
                              value={formData.estado}
                              onChange={(e) => setFormData(prev => ({ ...prev, estado: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-bold text-[#324354] outline-none transition-all cursor-pointer"
                            >
                              <option value="ACTIVO">ACTIVO</option>
                              <option value="EN REPARACIÓN">EN REPARACIÓN</option>
                              <option value="FUERA DE SERVICIO">FUERA DE SERVICIO</option>
                              <option value="DE BAJA">DE BAJA</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Marca</label>
                            <input
                              type="text"
                              placeholder="Ej. Makita"
                              value={formData.marca}
                              onChange={(e) => setFormData(prev => ({ ...prev, marca: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Modelo</label>
                            <input
                              type="text"
                              placeholder="Ej. LS1219L"
                              value={formData.modelo}
                              onChange={(e) => setFormData(prev => ({ ...prev, modelo: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Características Técnicas</label>
                            <textarea
                              placeholder="Especifica dimensiones, voltajes, capacidades..."
                              rows={3}
                              value={formData.caracteristicas}
                              onChange={(e) => setFormData(prev => ({ ...prev, caracteristicas: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 2 */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider border-b border-slate-100 pb-2">
                          2. Ubicación e Importancia Operativa
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Planta</label>
                            <input
                              type="text"
                              placeholder="Ej. MS, RTM, Inyección"
                              value={formData.planta}
                              onChange={(e) => setFormData(prev => ({ ...prev, planta: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Proceso</label>
                            <input
                              type="text"
                              placeholder="Ej. Ensamble, Inyección, Pulido"
                              value={formData.proceso}
                              onChange={(e) => setFormData(prev => ({ ...prev, proceso: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Bodega o Ubicación Física</label>
                            <input
                              type="text"
                              placeholder="Ej. Pasillo 3, Estante A"
                              value={formData.bodega}
                              onChange={(e) => setFormData(prev => ({ ...prev, bodega: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Clasificación</label>
                            <select
                              value={formData.clasificacion}
                              onChange={(e) => setFormData(prev => ({ ...prev, clasificacion: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-bold text-[#324354] outline-none transition-all cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              <option value="A">Clase A</option>
                              <option value="B">Clase B</option>
                              <option value="C">Clase C</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Criticidad</label>
                            <select
                              value={formData.criticidad}
                              onChange={(e) => setFormData(prev => ({ ...prev, criticidad: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-bold text-[#324354] outline-none transition-all cursor-pointer"
                            >
                              <option value="">Seleccionar...</option>
                              <option value="A">Alta (A)</option>
                              <option value="B">Media (B)</option>
                              <option value="C">Baja (C)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section 3 */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider border-b border-slate-100 pb-2">
                          3. Datos de Adquisición y Costos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Fecha de Compra</label>
                            <input
                              type="date"
                              value={formData.fecha_compra}
                              onChange={(e) => setFormData(prev => ({ ...prev, fecha_compra: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Fecha de Instalación</label>
                            <input
                              type="date"
                              value={formData.fecha_instalacion}
                              onChange={(e) => setFormData(prev => ({ ...prev, fecha_instalacion: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Factura de Compra</label>
                            <input
                              type="text"
                              placeholder="Ej. FAC-100234"
                              value={formData.factura}
                              onChange={(e) => setFormData(prev => ({ ...prev, factura: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Valor Compra (COP)</label>
                            <input
                              type="number"
                              placeholder="Ej. 3500000"
                              value={formData.valor_compra}
                              onChange={(e) => setFormData(prev => ({ ...prev, valor_compra: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Valor Nuevo de Reposición (COP)</label>
                            <input
                              type="number"
                              placeholder="Ej. 3800000"
                              value={formData.valor_nuevo}
                              onChange={(e) => setFormData(prev => ({ ...prev, valor_nuevo: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 4 */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider border-b border-slate-100 pb-2">
                          4. Información del Proveedor
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Nombre Proveedor</label>
                            <input
                              type="text"
                              placeholder="Ej. Firplak S.A. Proveedores"
                              value={providerData.proveedor_nombre}
                              onChange={(e) => setProviderData(prev => ({ ...prev, proveedor_nombre: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Contacto Ventas/Soporte</label>
                            <input
                              type="text"
                              placeholder="Ej. Juan Pérez"
                              value={providerData.proveedor_contacto}
                              onChange={(e) => setProviderData(prev => ({ ...prev, proveedor_contacto: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Teléfono Contacto</label>
                            <input
                              type="text"
                              placeholder="Ej. +57 300 123 4567"
                              value={providerData.proveedor_telefono}
                              onChange={(e) => setProviderData(prev => ({ ...prev, proveedor_telefono: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Email Contacto</label>
                            <input
                              type="email"
                              placeholder="soporte@proveedor.com"
                              value={providerData.proveedor_email}
                              onChange={(e) => setProviderData(prev => ({ ...prev, proveedor_email: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 5 */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider border-b border-slate-100 pb-2">
                          5. Documentación y Fotos (Adjuntar Archivos o Pegar URLs)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Foto de la máquina */}
                          <div className="bg-[#F6F3EE]/30 p-4 border border-[#e2ded5] rounded-2xl space-y-3">
                            <span className="block text-xs font-bold text-[#324354] uppercase flex items-center gap-1.5">
                              <ImageIcon className="w-4 h-4" /> Foto Principal (URL o Archivo)
                            </span>
                            <input
                              type="text"
                              placeholder="Pega la URL de la imagen..."
                              value={formData.fotos}
                              onChange={(e) => setFormData(prev => ({ ...prev, fotos: e.target.value }))}
                              className="w-full px-4 py-2 bg-white rounded-xl border border-[#e2ded5] text-xs font-medium outline-none"
                            />
                            <div className="flex items-center gap-3">
                              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#e2ded5] rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">
                                <Upload className="w-3.5 h-3.5 text-gray-500" />
                                <span>Subir Imagen</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleFileUpload(e, "fotos")}
                                  className="hidden"
                                />
                              </label>
                              {uploadingFiles.fotos && <Loader2 className="w-4 h-4 animate-spin text-[#324354]" />}
                              {formData.fotos && <CheckCircle className="w-4 h-4 text-[#59a96a]" />}
                            </div>
                          </div>

                          {/* Plano */}
                          <div className="bg-[#F6F3EE]/30 p-4 border border-[#e2ded5] rounded-2xl space-y-3">
                            <span className="block text-xs font-bold text-[#324354] uppercase flex items-center gap-1.5">
                              <FileText className="w-4 h-4" /> Plano de Máquina (URL o Archivo)
                            </span>
                            <input
                              type="text"
                              placeholder="Pega la URL del plano..."
                              value={formData.planos}
                              onChange={(e) => setFormData(prev => ({ ...prev, planos: e.target.value }))}
                              className="w-full px-4 py-2 bg-white rounded-xl border border-[#e2ded5] text-xs font-medium outline-none"
                            />
                            <div className="flex items-center gap-3">
                              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#e2ded5] rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">
                                <Upload className="w-3.5 h-3.5 text-gray-500" />
                                <span>Subir Plano</span>
                                <input
                                  type="file"
                                  onChange={(e) => handleFileUpload(e, "planos")}
                                  className="hidden"
                                />
                              </label>
                              {uploadingFiles.planos && <Loader2 className="w-4 h-4 animate-spin text-[#324354]" />}
                              {formData.planos && <CheckCircle className="w-4 h-4 text-[#59a96a]" />}
                            </div>
                          </div>

                          {/* Manual */}
                          <div className="bg-[#F6F3EE]/30 p-4 border border-[#e2ded5] rounded-2xl space-y-3">
                            <span className="block text-xs font-bold text-[#324354] uppercase flex items-center gap-1.5">
                              <FileText className="w-4 h-4" /> Manual del Usuario (URL o Archivo)
                            </span>
                            <input
                              type="text"
                              placeholder="Pega la URL del manual..."
                              value={formData.manuales}
                              onChange={(e) => setFormData(prev => ({ ...prev, manuales: e.target.value }))}
                              className="w-full px-4 py-2 bg-white rounded-xl border border-[#e2ded5] text-xs font-medium outline-none"
                            />
                            <div className="flex items-center gap-3">
                              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#e2ded5] rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">
                                <Upload className="w-3.5 h-3.5 text-gray-500" />
                                <span>Subir Manual</span>
                                <input
                                  type="file"
                                  onChange={(e) => handleFileUpload(e, "manuales")}
                                  className="hidden"
                                />
                              </label>
                              {uploadingFiles.manuales && <Loader2 className="w-4 h-4 animate-spin text-[#324354]" />}
                              {formData.manuales && <CheckCircle className="w-4 h-4 text-[#59a96a]" />}
                            </div>
                          </div>

                          {/* Estándar */}
                          <div className="bg-[#F6F3EE]/30 p-4 border border-[#e2ded5] rounded-2xl space-y-3">
                            <span className="block text-xs font-bold text-[#324354] uppercase flex items-center gap-1.5">
                              <FileText className="w-4 h-4" /> Estándar de Operación (URL o Archivo)
                            </span>
                            <input
                              type="text"
                              placeholder="Pega la URL de estándares..."
                              value={formData.estandares}
                              onChange={(e) => setFormData(prev => ({ ...prev, estandares: e.target.value }))}
                              className="w-full px-4 py-2 bg-white rounded-xl border border-[#e2ded5] text-xs font-medium outline-none"
                            />
                            <div className="flex items-center gap-3">
                              <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-[#e2ded5] rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-50 transition-colors">
                                <Upload className="w-3.5 h-3.5 text-gray-500" />
                                <span>Subir Estándar</span>
                                <input
                                  type="file"
                                  onChange={(e) => handleFileUpload(e, "estandares")}
                                  className="hidden"
                                />
                              </label>
                              {uploadingFiles.estandares && <Loader2 className="w-4 h-4 animate-spin text-[#324354]" />}
                              {formData.estandares && <CheckCircle className="w-4 h-4 text-[#59a96a]" />}
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Section 6 */}
                      <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider border-b border-slate-100 pb-2">
                          6. Observaciones Finales
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Notas / Bitácora MTTO</label>
                            <textarea
                              placeholder="Registro de fallas históricas o revisiones preventivas..."
                              rows={3}
                              value={formData.notas}
                              onChange={(e) => setFormData(prev => ({ ...prev, notas: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all resize-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#324354] uppercase mb-1.5">Notas de Calidad de Datos</label>
                            <textarea
                              placeholder="Cualquier aclaración sobre la validez histórica de esta información..."
                              rows={3}
                              value={formData.notas_calidad_dato}
                              onChange={(e) => setFormData(prev => ({ ...prev, notas_calidad_dato: e.target.value }))}
                              className="w-full px-4 py-2.5 bg-[#F6F3EE] rounded-xl border border-transparent focus:border-[#324354]/30 focus:bg-white text-sm font-medium outline-none transition-all resize-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-4 pt-6 border-t border-[#e2ded5]">
                        <button
                          type="submit"
                          disabled={saving}
                          className="flex-1 py-3 bg-[#324354] hover:bg-[#25313e] disabled:bg-slate-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 text-sm uppercase tracking-wider border-none flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Guardando...</span>
                            </>
                          ) : (
                            <span>{adminAction === "nuevo" ? "Guardar Registro" : "Guardar Cambios"}</span>
                          )}
                        </button>
                        
                        {adminAction === "editar" && (
                          <button
                            type="button"
                            onClick={handleDeleteMachine}
                            disabled={saving}
                            className="px-6 py-3 bg-[#d14747] hover:bg-[#a63434] text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 text-sm uppercase tracking-wider border-none flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>Eliminar Registro</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab("inventario");
                            resetForm();
                            setSelectedEditMachineId(null);
                          }}
                          className="px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all duration-200 text-sm uppercase tracking-wider border-none cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>

                    </form>
                  ) : (
                    <div className="text-center py-16 bg-slate-50 border border-dashed border-[#e2ded5] rounded-3xl text-gray-500">
                      <Edit className="w-12 h-12 text-[#7B8E90] mx-auto mb-2 opacity-50 animate-bounce" />
                      <p className="text-sm font-bold">Sin equipo seleccionado</p>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                        Por favor selecciona una máquina en la lista desplegable de arriba para cargar sus datos y comenzar la edición.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ACTION 3: Unificar Duplicados */}
              {adminAction === "unificar" && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#F6F3EE]/40 p-5 border border-[#e2ded5] rounded-3xl">
                    
                    {/* Primary machine selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-[#324354] uppercase tracking-wider">
                        1. Máquina Principal (Conserva ID y registro)
                      </label>
                      <select
                        value={primaryMergeMachineId || ""}
                        onChange={(e) => setPrimaryMergeMachineId(Number(e.target.value) || null)}
                        className="w-full px-4 py-3 bg-white rounded-xl border border-[#e2ded5] text-sm font-bold text-[#324354] focus:border-[#324354]/40 outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- Seleccionar Máquina Principal --</option>
                        {maquinas.map((m) => (
                          <option key={m.id} value={m.id} disabled={m.id === secondaryMergeMachineId}>
                            {m.codigo_equipo ? `[${m.codigo_equipo}] ` : ""}{m.nombre_equipo} {m.marca ? `(${m.marca})` : ""} {m.planta ? `[Planta ${m.planta}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Secondary machine selector */}
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-[#324354] uppercase tracking-wider">
                        2. Máquina Secundaria (Se eliminará tras absorber datos)
                      </label>
                      <select
                        value={secondaryMergeMachineId || ""}
                        onChange={(e) => setSecondaryMergeMachineId(Number(e.target.value) || null)}
                        className="w-full px-4 py-3 bg-white rounded-xl border border-[#e2ded5] text-sm font-bold text-[#324354] focus:border-[#324354]/40 outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- Seleccionar Máquina a Absorber --</option>
                        {maquinas.map((m) => (
                          <option key={m.id} value={m.id} disabled={m.id === primaryMergeMachineId}>
                            {m.codigo_equipo ? `[${m.codigo_equipo}] ` : ""}{m.nombre_equipo} {m.marca ? `(${m.marca})` : ""} {m.planta ? `[Planta ${m.planta}]` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                  </div>

                  {/* Comparison & Unify confirmation */}
                  {primaryMergeMachine && secondaryMergeMachine ? (
                    <div className="space-y-6">
                      
                      {/* Comparisons list */}
                      <div className="bg-white border border-[#e2ded5] rounded-3xl p-5 shadow-sm space-y-4">
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-[#deb841]" />
                          Comparación de Campos Diferentes
                        </h4>
                        <p className="text-xs text-gray-500 leading-relaxed font-semibold">
                          Se copiarán a <strong>{primaryMergeMachine.nombre_equipo}</strong> todos los valores válidos de los campos donde se encuentre vacía, usando la información de <strong>{secondaryMergeMachine.nombre_equipo}</strong>. Tras esto, se borrará el registro de esta última.
                        </p>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="border-b border-[#e2ded5] text-[#324354] uppercase font-bold">
                                <th className="py-2.5">Atributo</th>
                                <th className="py-2.5">Máquina Principal (Se Queda)</th>
                                <th className="py-2.5">Máquina Secundaria (Se Borra)</th>
                                <th className="py-2.5 text-center">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-semibold text-gray-700">
                              {Object.keys(primaryMergeMachine).map((key) => {
                                const k = key as keyof MaquinaEquipo;
                                if (["id", "created_at", "updated_at"].includes(key)) return null;

                                const valPrim = primaryMergeMachine[k];
                                const valSec = secondaryMergeMachine[k];

                                if (valPrim !== valSec && valSec !== null && valSec !== undefined && String(valSec).trim() !== "") {
                                  const isWillFill = valPrim === null || valPrim === undefined || String(valPrim).trim() === "";
                                  return (
                                    <tr key={key} className={isWillFill ? "bg-emerald-50/40" : ""}>
                                      <td className="py-2 capitalize font-black text-slate-500">{key.replace(/_/g, " ")}</td>
                                      <td className="py-2 text-slate-600">{String(valPrim || "(Vacío)")}</td>
                                      <td className="py-2 text-slate-600">{String(valSec)}</td>
                                      <td className="py-2 text-center">
                                        {isWillFill ? (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#59a96a]/15 text-[#59a96a] border border-[#59a96a]/20 uppercase">
                                            Se Absorbe
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-400 border border-gray-200 uppercase">
                                            Conserva
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                }
                                return null;
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Submit merge actions */}
                      <div className="flex gap-4 pt-6 border-t border-[#e2ded5]">
                        <button
                          type="button"
                          onClick={handleMergeMachines}
                          disabled={saving}
                          className="flex-1 py-3.5 bg-[#324354] hover:bg-[#25313e] disabled:bg-slate-400 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 text-sm uppercase tracking-wider border-none flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Procesando Fusión...</span>
                            </>
                          ) : (
                            <>
                              <GitMerge className="w-4 h-4" />
                              <span>Confirmar y Unificar Máquinas</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPrimaryMergeMachineId(null);
                            setSecondaryMergeMachineId(null);
                          }}
                          className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all duration-200 text-sm uppercase tracking-wider border-none cursor-pointer"
                        >
                          Reiniciar
                        </button>
                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-16 bg-slate-50 border border-dashed border-[#e2ded5] rounded-3xl text-gray-500">
                      <GitMerge className="w-12 h-12 text-[#7B8E90] mx-auto mb-2 opacity-50 animate-pulse" />
                      <p className="text-sm font-bold">Unificación de Equipos</p>
                      <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                        Por favor selecciona el registro principal (que se quedará en el inventario) y el secundario a unificar (que se eliminará tras fusionar datos) de las listas de arriba.
                      </p>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </main>
      )}

      {/* Machine Detail Overlay Modal */}
      {selectedMaquina && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-5xl bg-white rounded-3xl border border-[#e2ded5] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Modal Header */}
            <div className="bg-[#324354] text-white p-6 relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-xs uppercase font-bold text-[#7B8E90] tracking-wider">
                  Ficha de Equipo · {selectedMaquina.tipo || "General"}
                </span>
                <h2 className="text-2xl font-black tracking-tight mt-0.5">
                  {selectedMaquina.nombre_equipo}
                </h2>
                {selectedMaquina.nombre_alterno && (
                  <p className="text-sm text-slate-300 italic font-medium">{selectedMaquina.nombre_alterno}</p>
                )}
              </div>

              <div className="flex items-center gap-3">
                {renderEstado(selectedMaquina.estado)}
                <button
                  onClick={() => setSelectedMaquina(null)}
                  className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all cursor-pointer border-none"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin bg-[#F6F3EE]/30">
              
              {/* Media & General Cards Split Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* General data card */}
                <div className="bg-white border border-[#e2ded5] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[#324354] border-b border-slate-100 pb-2">
                    <Info className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">Identificación</span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="block text-xs text-gray-400 font-semibold uppercase">Código de Equipo</span>
                      <span className="font-black text-[#324354]">{selectedMaquina.codigo_equipo || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-semibold uppercase">Activo Fijo</span>
                      <span className="font-bold text-gray-800">{selectedMaquina.activo_fijo || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-semibold uppercase">Marca</span>
                      <span className="font-bold text-gray-800">{selectedMaquina.marca || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-semibold uppercase">Modelo</span>
                      <span className="font-bold text-gray-800">{selectedMaquina.modelo || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Location & Significance card */}
                <div className="bg-white border border-[#e2ded5] rounded-2xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[#324354] border-b border-slate-100 pb-2">
                    <MapPin className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">Ubicación y Criticidad</span>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="block text-xs text-gray-400 font-semibold uppercase">Planta</span>
                      <span className="font-bold text-gray-800">{selectedMaquina.planta || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-semibold uppercase">Proceso</span>
                      <span className="font-bold text-gray-700">{selectedMaquina.proceso || "N/A"}</span>
                    </div>
                    <div>
                      <span className="block text-xs text-gray-400 font-semibold uppercase">Bodega</span>
                      <span className="font-bold text-gray-700">{selectedMaquina.bodega || "N/A"}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-xs text-gray-400 font-semibold uppercase">Clasificación</span>
                        <span className="font-extrabold text-gray-800">{selectedMaquina.clasificacion || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-xs text-gray-400 font-semibold uppercase">Criticidad</span>
                        <div className="mt-0.5">{renderCriticidad(selectedMaquina.criticidad)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photo Preview Container (Clickable) */}
                <div className="bg-white border border-[#e2ded5] rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center min-h-[220px]">
                  {isValidUrl(selectedMaquina.fotos) ? (
                    <div 
                      onClick={() => setZoomImage(selectedMaquina.fotos)}
                      className="w-full h-full relative cursor-zoom-in group overflow-hidden rounded-xl border border-slate-100 shadow-sm"
                    >
                      <img 
                        src={selectedMaquina.fotos!} 
                        alt={selectedMaquina.nombre_equipo} 
                        className="w-full h-full object-cover max-h-[180px] hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                        <span className="text-white text-xs font-bold bg-[#324354]/90 px-3 py-1.5 rounded-lg shadow-md uppercase tracking-wider flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5" /> Ampliar Foto
                        </span>
                      </div>
                    </div>
                  ) : selectedMaquina.fotos ? (
                    <div className="w-full text-center p-4 bg-slate-50 border border-[#e2ded5] rounded-xl space-y-2">
                      <ImageIcon className="w-8 h-8 text-slate-400 mx-auto" />
                      <span className="block text-[10px] text-gray-400 uppercase font-bold">Identificación Visual</span>
                      <p className="text-xs text-gray-700 font-semibold leading-relaxed">{selectedMaquina.fotos}</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 space-y-2 py-8">
                      <ImageIcon className="w-12 h-12 text-[#7B8E90] mx-auto opacity-50" />
                      <p className="text-xs font-bold uppercase tracking-wider">Sin Fotografía</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Purchase Details & Technical Specs Section */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Costs card */}
                <div className="bg-white border border-[#e2ded5] rounded-2xl p-5 space-y-4 shadow-sm text-sm">
                  <div className="flex items-center gap-2 text-[#324354] border-b border-slate-100 pb-2">
                    <DollarSign className="w-5 h-5" />
                    <span className="font-bold text-sm uppercase tracking-wider">Finanzas e Instalación</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Fecha Compra</span>
                    <span className="font-bold text-gray-800">{selectedMaquina.fecha_compra || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Fecha Instalación</span>
                    <span className="font-bold text-gray-800">{selectedMaquina.fecha_instalacion || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Valor Compra</span>
                    <span className="font-bold text-gray-800">{formatCurrency(selectedMaquina.valor_compra)}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Valor Reposición Nuevo</span>
                    <span className="font-bold text-gray-800">{formatCurrency(selectedMaquina.valor_nuevo)}</span>
                  </div>
                </div>

                {/* Specifications text */}
                <div className="bg-white border border-[#e2ded5] rounded-2xl p-5 space-y-3 shadow-sm md:col-span-2">
                  <span className="block text-xs font-bold text-[#324354] uppercase tracking-wider border-b border-slate-100 pb-1 mb-2">
                    Características Técnicas
                  </span>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedMaquina.caracteristicas || "No se especificaron especificaciones técnicas."}
                  </p>
                </div>

              </div>

              {/* Maintenance Notes & Quality Details */}
              <div className="bg-white border border-[#e2ded5] rounded-2xl p-5 space-y-3 shadow-sm">
                <span className="block text-xs font-bold text-[#324354] uppercase tracking-wider border-b border-slate-100 pb-1.5 mb-2">
                  Notas de Mantenimiento y Calidad del Dato
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600">
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase mb-1">Notas</span>
                    <p className="leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedMaquina.notas || "Sin observaciones de mantenimiento registradas."}
                    </p>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase mb-1">Calidad del Dato</span>
                    {selectedMaquina.notas_calidad_dato ? (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5">
                        <AlertTriangle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-600 leading-relaxed font-medium">{selectedMaquina.notas_calidad_dato}</p>
                      </div>
                    ) : (
                      <p className="leading-relaxed font-medium text-gray-400">Sin observaciones de calidad del dato.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Vendor & Provider Section */}
              <div className="bg-white border border-[#e2ded5] rounded-2xl p-5 space-y-4 shadow-sm">
                <span className="block text-xs font-bold text-[#324354] uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  Información del Proveedor
                </span>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Proveedor</span>
                    <span className="font-bold text-gray-800">{selectedMaquina.proveedor_nombre || "N/A"}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Contacto</span>
                    <div className="flex items-center gap-1.5 font-bold text-gray-800 mt-0.5">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{selectedMaquina.proveedor_contacto || "N/A"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">Teléfono</span>
                    <div className="flex items-center gap-1.5 font-bold text-gray-800 mt-0.5">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{selectedMaquina.proveedor_telefono || "N/A"}</span>
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs text-gray-400 font-semibold uppercase">E-mail</span>
                    <div className="flex items-center gap-1.5 font-bold text-gray-800 mt-0.5">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span>{selectedMaquina.proveedor_email || "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments & Documentation Section */}
              <div className="bg-white border border-[#e2ded5] rounded-2xl p-5 space-y-4 shadow-sm">
                <span className="block text-xs font-bold text-[#324354] uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  Documentación y Archivos Adjuntos
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Plano */}
                  <div className="p-3 bg-[#F6F3EE]/40 border border-[#e2ded5] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <span className="text-xs font-bold text-gray-700">Planos</span>
                    </div>
                    {selectedMaquina.planos ? (
                      <a 
                        href={selectedMaquina.planos} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white text-[#324354] hover:bg-[#324354] hover:text-white rounded-lg border border-[#e2ded5] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-400 uppercase font-bold">No adjunto</span>
                    )}
                  </div>

                  {/* Manual */}
                  <div className="p-3 bg-[#F6F3EE]/40 border border-[#e2ded5] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <span className="text-xs font-bold text-gray-700">Manuales</span>
                    </div>
                    {selectedMaquina.manuales ? (
                      <a 
                        href={selectedMaquina.manuales} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white text-[#324354] hover:bg-[#324354] hover:text-white rounded-lg border border-[#e2ded5] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-400 uppercase font-bold">No adjunto</span>
                    )}
                  </div>

                  {/* Estándar */}
                  <div className="p-3 bg-[#F6F3EE]/40 border border-[#e2ded5] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <span className="text-xs font-bold text-gray-700">Estándares</span>
                    </div>
                    {selectedMaquina.estandares ? (
                      <a 
                        href={selectedMaquina.estandares} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 bg-white text-[#324354] hover:bg-[#324354] hover:text-white rounded-lg border border-[#e2ded5] transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <span className="text-[10px] text-gray-400 uppercase font-bold">No adjunto</span>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-[#e2ded5] p-4 bg-slate-50 flex justify-between items-center">
              <span className="text-[11px] font-bold text-gray-400 uppercase">
                Última actualización: {selectedMaquina.updated_at ? new Date(selectedMaquina.updated_at).toLocaleDateString("es-CO") : "Sin registro"}
              </span>
              <button
                onClick={() => setSelectedMaquina(null)}
                className="px-6 py-2 bg-[#324354] hover:bg-[#25313e] text-white font-bold rounded-xl transition duration-150 text-sm uppercase tracking-wider border-none cursor-pointer"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {zoomImage && (
        <div 
          onClick={() => setZoomImage(null)}
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <button 
            onClick={() => setZoomImage(null)}
            className="absolute top-6 right-6 p-2 text-white/80 hover:text-white bg-white/10 rounded-full border-none cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={zoomImage} 
            alt="Detalle de Imagen" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
          />
        </div>
      )}
    </div>
  );
}
