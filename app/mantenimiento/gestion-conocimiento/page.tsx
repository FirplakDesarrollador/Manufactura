'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Lightbulb,
  Cpu,
  ShieldCheck,
  Wrench,
  Search,
  Plus,
  ArrowLeft,
  Calendar,
  User,
  Filter,
  CheckCircle2,
  FileText,
  HelpCircle,
  ExternalLink,
  Layers,
  Sparkles,
  ChevronRight,
  Eye,
  Trash2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Header from '@/components/opt-sistemica/Header';

export interface KnowledgeArticle {
  id: number | string;
  titulo: string;
  categoria: 'Lección LUP' | 'Principio Máquina' | 'Procedimiento LOTO' | 'Guía de Solución';
  maquina: string;
  descripcion: string;
  puntosClave: string[];
  autor: string;
  fecha: string;
  archivo_url?: string;
}

const DEFAULT_ARTICLES: KnowledgeArticle[] = [
  {
    id: 1,
    titulo: 'LUP: Calibración y purga de pistola de pintura tipo presión C-0154',
    categoria: 'Lección LUP',
    maquina: 'Cabina de Pintura C-0154',
    descripcion: 'Procedimiento estándar para desensamblar, lubricar el resorte de aguja y calibrar el abanico a 3.5 bar.',
    puntosClave: [
      'Desconectar la manguera de alimentación de aire antes del desarme.',
      'Limpiar orificios de la tobera únicamente con aguja no metálica.',
      'Lubricar resorte de aguja con vaselina industrial neutra.'
    ],
    autor: 'Equipo de Mantenimiento Planta',
    fecha: '2026-08-15'
  },
  {
    id: 2,
    titulo: 'Principio de Máquina: Circuito hidráulico de prensas de compactación',
    categoria: 'Principio Máquina',
    maquina: 'Prensas Hidráulicas',
    descripcion: 'Diagrama funcional de electroválvulas direccionales, presostatos y válvula de alivio proporcional.',
    puntosClave: [
      'Comprobación diaria de temperatura de aceite (< 55°C).',
      'Verificación de saturación de filtro de retorno mediante manómetro diferencial.',
      'Inspección visual de vástagos en busca de rayaduras.'
    ],
    autor: 'Ingeniería de Planta',
    fecha: '2026-07-20'
  },
  {
    id: 3,
    titulo: 'Procedimiento LOTO: Bloqueo de energía en mezcladoras industriales',
    categoria: 'Procedimiento LOTO',
    maquina: 'Mezcladoras de Resina',
    descripcion: 'Paso a paso para el candadeo eléctrico y despresurización de líneas neumáticas antes de ingresar al tambor.',
    puntosClave: [
      'Bajar disyuntor principal en tablero de fuerza.',
      'Instalar pinza portacandados con tarjeta de advertencia personalizada.',
      'Verificar energía cero intentando arranque manual.'
    ],
    autor: 'Seguridad y Salud en el Trabajo (SST)',
    fecha: '2026-08-30'
  },
  {
    id: 4,
    titulo: 'Guía de Solución: Detección y corrección de caída de vacío en moldes',
    categoria: 'Guía de Solución',
    maquina: 'Sistemas de Vacío RTM',
    descripcion: 'Árbol de diagnóstico para identificar fisuras en sellos de silicona o pérdidas en acoples rápidos.',
    puntosClave: [
      'Monitorear nivel de vacío mínimo: -0.85 bar.',
      'Aplicar prueba de humo o detector acústico en rebordes perimetrales.',
      'Sustituir tramo de manguera de poliuretano si presenta cristalización.'
    ],
    autor: 'Mantenimiento Preventivo',
    fecha: '2026-09-02'
  },
  {
    id: 5,
    titulo: 'LUP: Alineación láser y tensión de correas de transmisión en extractores',
    categoria: 'Lección LUP',
    maquina: 'Sistema de Extracción de Polvo',
    descripcion: 'Uso de tensiómetro acústico y alineador láser de poleas para evitar desgaste prematuro de rodamientos.',
    puntosClave: [
      'Verificar deflexión de 10mm por cada metro entre centros.',
      'Alinear poleas con tolerancia angular menor a 0.5°.',
      'Reapretar prisioneros de poleas cónicas con torquímetro.'
    ],
    autor: 'Mantenimiento Mecánico',
    fecha: '2026-09-05'
  }
];

export default function GestionConocimientoPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // Articles & Filters
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedArticleModal, setSelectedArticleModal] = useState<KnowledgeArticle | null>(null);

  // New Article Form
  const [newForm, setNewForm] = useState({
    titulo: '',
    categoria: 'Lección LUP' as KnowledgeArticle['categoria'],
    maquina: '',
    descripcion: '',
    puntosClave: '',
    autor: ''
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserEmail(user.email || '');
      
      // Load saved knowledge articles from localStorage if available
      const saved = localStorage.getItem('firplak_knowledge_articles');
      if (saved) {
        try {
          setArticles(JSON.parse(saved));
        } catch {
          setArticles(DEFAULT_ARTICLES);
        }
      } else {
        setArticles(DEFAULT_ARTICLES);
        localStorage.setItem('firplak_knowledge_articles', JSON.stringify(DEFAULT_ARTICLES));
      }

      setLoading(false);
    };
    checkUser();
  }, [router]);

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          a.titulo.toLowerCase().includes(q) ||
          a.maquina.toLowerCase().includes(q) ||
          a.descripcion.toLowerCase().includes(q) ||
          a.puntosClave.some(p => p.toLowerCase().includes(q)) ||
          a.autor.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedCategory !== 'Todas' && a.categoria !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [articles, searchQuery, selectedCategory]);

  const handleCreateArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.titulo.trim() || !newForm.maquina.trim()) {
      alert('Por favor completa el título y la máquina / equipo.');
      return;
    }

    const points = newForm.puntosClave
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const newDoc: KnowledgeArticle = {
      id: Date.now(),
      titulo: newForm.titulo.trim(),
      categoria: newForm.categoria,
      maquina: newForm.maquina.trim(),
      descripcion: newForm.descripcion.trim(),
      puntosClave: points.length > 0 ? points : ['Procedimiento registrado conforme al estándar FIRPLAK.'],
      autor: newForm.autor.trim() || userEmail.split('@')[0] || 'Técnico FIRPLAK',
      fecha: new Date().toISOString().split('T')[0]
    };

    const updated = [newDoc, ...articles];
    setArticles(updated);
    localStorage.setItem('firplak_knowledge_articles', JSON.stringify(updated));

    setNewForm({
      titulo: '',
      categoria: 'Lección LUP',
      maquina: '',
      descripcion: '',
      puntosClave: '',
      autor: ''
    });
    setShowCreateModal(false);
  };

  const handleDeleteArticle = (id: number | string) => {
    if (confirm('¿Estás seguro de eliminar este documento de la base de conocimiento?')) {
      const updated = articles.filter(a => a.id !== id);
      setArticles(updated);
      localStorage.setItem('firplak_knowledge_articles', JSON.stringify(updated));
      if (selectedArticleModal?.id === id) {
        setSelectedArticleModal(null);
      }
    }
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
      {/* Background Decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-slate-200/40 blur-[100px]"></div>
        <div className="absolute top-[20%] -right-[10%] w-[35%] h-[35%] rounded-full bg-slate-100/50 blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-[#324354]/5 blur-[120px]"></div>
      </div>

      {/* Main Top Header */}
      <Header
        title="Mantenimiento"
        subtitle="Gestión del Conocimiento y Lecciones LUP"
        userEmail={userEmail}
        showLogout={true}
        onLogout={async () => {
          await supabase.auth.signOut();
          router.push('/login');
        }}
      />

      {/* Main Content Area */}
      <main className="relative z-10 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 flex-1 flex flex-col gap-6">
        
        {/* Navigation & Action Top Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <button
            onClick={() => router.push('/mantenimiento')}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 text-[#324354] font-bold text-xs rounded-xl border border-[#e2ded5] shadow-xs transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Mantenimiento</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md shadow-[#324354]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Lección / Documento LUP</span>
          </button>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-[#324354] flex items-center justify-center font-bold shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-[#324354]">{articles.length}</div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total Documentos</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Lightbulb className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-blue-600">
                {articles.filter(a => a.categoria === 'Lección LUP').length}
              </div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Lecciones LUP 💡</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold shrink-0">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-purple-700">
                {articles.filter(a => a.categoria === 'Principio Máquina').length}
              </div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Principio Máquina ⚙️</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#e2ded5] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-600">
                {articles.filter(a => a.categoria === 'Procedimiento LOTO').length}
              </div>
              <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Procedimientos LOTO 🔒</div>
            </div>
          </div>
        </div>

        {/* Filter & Category Selector Bar */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#e2ded5] shadow-xs flex flex-col gap-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide w-full md:w-auto pb-1 md:pb-0">
              {['Todas', 'Lección LUP', 'Principio Máquina', 'Procedimiento LOTO', 'Guía de Solución'].map((cat) => {
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 ${
                      isActive
                        ? 'bg-[#324354] text-white shadow-md'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat === 'Todas' && 'Todos los Documentos'}
                    {cat === 'Lección LUP' && '💡 Lecciones LUP'}
                    {cat === 'Principio Máquina' && '⚙️ Principios de Máquina'}
                    {cat === 'Procedimiento LOTO' && '🔒 Procedimientos LOTO'}
                    {cat === 'Guía de Solución' && '🛠️ Guías de Solución'}
                  </button>
                );
              })}
            </div>

            {/* Clear Filter */}
            {selectedCategory !== 'Todas' || searchQuery ? (
              <button
                onClick={() => {
                  setSelectedCategory('Todas');
                  setSearchQuery('');
                }}
                className="text-xs text-[#7B8E90] hover:text-[#324354] font-semibold underline cursor-pointer shrink-0 self-end md:self-auto"
              >
                Limpiar Filtros
              </button>
            ) : null}
          </div>

          {/* Search Input */}
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en la base de conocimiento por título, máquina, autor o procedimiento..."
              className="w-full pl-11 pr-4 py-3 bg-[#F6F3EE] rounded-2xl border border-[#e2ded5] text-xs sm:text-sm font-medium focus:outline-none focus:border-[#324354] transition-all"
            />
          </div>
        </div>

        {/* Knowledge Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full bg-white rounded-3xl p-16 text-center text-gray-400 border border-[#e2ded5] flex flex-col items-center gap-3">
              <HelpCircle className="w-12 h-12 text-gray-300" />
              <h3 className="text-base font-bold text-[#324354]">No se encontraron documentos de conocimiento</h3>
              <p className="text-xs text-gray-500 max-w-md">
                Prueba ajustando tus términos de búsqueda o selecciona otra categoría para ver más documentos técnicos.
              </p>
            </div>
          ) : (
            filteredArticles.map(article => {
              const isLUP = article.categoria === 'Lección LUP';
              const isPrinciple = article.categoria === 'Principio Máquina';
              const isLOTO = article.categoria === 'Procedimiento LOTO';

              return (
                <div
                  key={article.id}
                  className="bg-white rounded-3xl p-6 border border-[#e2ded5] shadow-xs flex flex-col justify-between gap-5 hover:border-[#324354] hover:shadow-md transition-all group"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header: Category Badge & Date */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                        isLUP ? 'bg-blue-100 text-blue-800' :
                        isPrinciple ? 'bg-purple-100 text-purple-800' :
                        isLOTO ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {article.categoria}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {article.fecha}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-[#324354] group-hover:text-black transition-colors leading-snug">
                      {article.titulo}
                    </h3>

                    {/* Machine Tag */}
                    <div className="text-xs font-semibold text-[#7B8E90] flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[#324354] font-medium">
                        ⚙️ {article.maquina}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-600 leading-relaxed bg-[#F6F3EE] p-3 rounded-2xl border border-gray-200">
                      {article.descripcion}
                    </p>

                    {/* Key points preview */}
                    <div className="mt-1">
                      <div className="text-[10px] font-bold text-[#324354] uppercase tracking-wider mb-1.5">
                        Criterios Clave:
                      </div>
                      <ul className="list-disc list-inside text-xs text-gray-600 flex flex-col gap-1 pl-1">
                        {article.puntosClave.slice(0, 3).map((pt, idx) => (
                          <li key={idx} className="line-clamp-1 leading-snug">{pt}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <span className="truncate max-w-[150px]">Por: <strong>{article.autor}</strong></span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedArticleModal(article)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#324354]/10 hover:bg-[#324354] text-[#324354] hover:text-white font-bold rounded-xl transition-all text-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Guía</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </main>

      {/* Modal: View Full Knowledge Document */}
      {selectedArticleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-[#e2ded5] flex flex-col gap-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-gray-200 pb-4">
              <div>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-block mb-2 ${
                  selectedArticleModal.categoria === 'Lección LUP' ? 'bg-blue-100 text-blue-800' :
                  selectedArticleModal.categoria === 'Principio Máquina' ? 'bg-purple-100 text-purple-800' :
                  selectedArticleModal.categoria === 'Procedimiento LOTO' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {selectedArticleModal.categoria}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#324354] leading-tight">
                  {selectedArticleModal.titulo}
                </h2>
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                  <span>⚙️ Equipo: <strong>{selectedArticleModal.maquina}</strong></span>
                  <span>📅 Fecha: <strong>{selectedArticleModal.fecha}</strong></span>
                  <span>👤 Autor: <strong>{selectedArticleModal.autor}</strong></span>
                </div>
              </div>

              <button
                onClick={() => setSelectedArticleModal(null)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <h4 className="text-xs font-bold text-[#324354] uppercase tracking-wider mb-1">Descripción General / Objetivo:</h4>
                <div className="text-sm text-gray-700 bg-[#F6F3EE] p-4 rounded-2xl border border-gray-200 leading-relaxed">
                  {selectedArticleModal.descripcion}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-[#324354] uppercase tracking-wider mb-2">Puntos Clave y Procedimiento Estándar:</h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200">
                  <ul className="flex flex-col gap-2.5 text-xs sm:text-sm text-gray-700">
                    {selectedArticleModal.puntosClave.map((pt, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={() => handleDeleteArticle(selectedArticleModal.id)}
                className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Eliminar Documento</span>
              </button>

              <button
                onClick={() => setSelectedArticleModal(null)}
                className="px-5 py-2.5 bg-[#324354] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create New Knowledge Article */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#324354]/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl border border-[#e2ded5] flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-[#324354]">Registrar Nuevo Documento de Conocimiento</h3>
                <p className="text-xs text-gray-500">Publica una nueva Lección de Un Punto (LUP), Principio Máquina o Procedimiento LOTO.</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateArticle} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-[#324354] block mb-1">Título del Documento *</label>
                <input
                  type="text"
                  required
                  value={newForm.titulo}
                  onChange={(e) => setNewForm({ ...newForm, titulo: e.target.value })}
                  placeholder="Ej: LUP: Mantenimiento y Purga de Electroválvula 02"
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border text-xs focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#324354] block mb-1">Categoría *</label>
                  <select
                    value={newForm.categoria}
                    onChange={(e) => setNewForm({ ...newForm, categoria: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border text-xs font-semibold focus:outline-none"
                  >
                    <option value="Lección LUP">💡 Lección LUP</option>
                    <option value="Principio Máquina">⚙️ Principio Máquina</option>
                    <option value="Procedimiento LOTO">🔒 Procedimiento LOTO</option>
                    <option value="Guía de Solución">🛠️ Guía de Solución</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#324354] block mb-1">Máquina o Equipo *</label>
                  <input
                    type="text"
                    required
                    value={newForm.maquina}
                    onChange={(e) => setNewForm({ ...newForm, maquina: e.target.value })}
                    placeholder="Ej: Prensa Hidráulica 01"
                    className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border text-xs focus:outline-none focus:border-[#324354]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-[#324354] block mb-1">Descripción / Objetivo</label>
                <textarea
                  rows={3}
                  value={newForm.descripcion}
                  onChange={(e) => setNewForm({ ...newForm, descripcion: e.target.value })}
                  placeholder="Explica brevemente el propósito o la falla que resuelve esta lección..."
                  className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border text-xs focus:outline-none focus:border-[#324354] resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#324354] block mb-1">Puntos Clave / Procedimiento (Uno por línea)</label>
                <textarea
                  rows={4}
                  value={newForm.puntosClave}
                  onChange={(e) => setNewForm({ ...newForm, puntosClave: e.target.value })}
                  placeholder="1. Desenergizar el equipo con candado LOTO&#10;2. Purgar la presión acumulada en el manómetro&#10;3. Verificar estanqueidad antes de energizar"
                  className="w-full p-2.5 bg-[#F6F3EE] rounded-xl border text-xs focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#324354] block mb-1">Autor / Responsable</label>
                <input
                  type="text"
                  value={newForm.autor}
                  onChange={(e) => setNewForm({ ...newForm, autor: e.target.value })}
                  placeholder="Ej: Mantenimiento Preventivo Planta"
                  className="w-full px-3 py-2 bg-[#F6F3EE] rounded-xl border text-xs focus:outline-none focus:border-[#324354]"
                />
              </div>

              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#324354] hover:bg-[#324354]/90 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer"
                >
                  Publicar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
