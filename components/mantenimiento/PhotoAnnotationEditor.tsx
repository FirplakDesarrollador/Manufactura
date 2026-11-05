'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Check, 
  RotateCcw, 
  Trash2, 
  PenTool, 
  Circle, 
  Square, 
  ArrowUpRight, 
  Maximize2,
  Type 
} from 'lucide-react';

interface PhotoAnnotationEditorProps {
  imageSrc: string;
  onSave: (annotatedDataUrl: string) => void;
  onCancel: () => void;
}

type ToolType = 'pen' | 'circle' | 'rect' | 'arrow' | 'text';

export default function PhotoAnnotationEditor({
  imageSrc,
  onSave,
  onCancel
}: PhotoAnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentTool, setCurrentTool] = useState<ToolType>('pen');
  const [lineWidth, setLineWidth] = useState<number>(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const startPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const snapshot = useRef<ImageData | null>(null);
  const imageObjRef = useRef<HTMLImageElement | null>(null);
  // Recuadro de texto en edición: posición en el canvas y en pantalla (relativa al contenedor)
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; left: number; top: number; scale: number; value: string } | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  // Copia síncrona del borrador: evita fijar el mismo texto dos veces (clic en la foto + blur)
  const textDraftRef = useRef<typeof textDraft>(null);
  const updateDraft = (d: typeof textDraft) => { textDraftRef.current = d; setTextDraft(d); };

  // Load and draw image on canvas
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;
    img.onload = () => {
      imageObjRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Max dimensions for working resolution
      const maxDim = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Save initial state in history
      const initialData = ctx.getImageData(0, 0, width, height);
      setHistory([initialData]);
    };
  }, [imageSrc]);

  // Helper to get exact canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Tamaño de letra del texto según el selector Fino / Med / Gru (en píxeles del canvas)
  const fontSizeFor = (w: number) => (w <= 3 ? 26 : w <= 6 ? 38 : 54);

  // Dibuja el texto en el canvas: recuadro blanco con borde rojo y texto rojo en negrita
  const commitText = () => {
    const draft = textDraftRef.current;
    updateDraft(null);
    const value = draft?.value.trim();
    if (!draft || !value) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const fontSize = fontSizeFor(lineWidth);
    const padding = Math.round(fontSize * 0.35);
    const lineHeight = Math.round(fontSize * 1.2);
    const lines = value.split(/\r?\n/);
    ctx.font = `bold ${fontSize}px Montserrat, Arial, sans-serif`;
    const textWidth = Math.max(...lines.map(l => ctx.measureText(l).width));
    const boxW = textWidth + padding * 2;
    const boxH = lineHeight * lines.length + padding * 2;
    // Mantener el recuadro dentro de la foto
    const x = Math.max(0, Math.min(draft.x, canvas.width - boxW));
    const y = Math.max(0, Math.min(draft.y, canvas.height - boxH));

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = Math.max(3, Math.round(fontSize / 10));
    ctx.beginPath();
    if (typeof (ctx as any).roundRect === 'function') (ctx as any).roundRect(x, y, boxW, boxH, padding * 0.6);
    else ctx.rect(x, y, boxW, boxH);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#dc2626';
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => ctx.fillText(line, x + padding, y + padding + i * lineHeight + (lineHeight - fontSize) / 2));
    ctx.restore();

    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, currentData]);
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    // Herramienta Texto: abre un recuadro editable en el punto tocado (si había otro, se fija primero)
    if (currentTool === 'text') {
      if (textDraftRef.current) commitText();
      const rect = canvas.getBoundingClientRect();
      const cont = containerRef.current?.getBoundingClientRect();
      const scale = rect.width / canvas.width;
      updateDraft({
        x: coords.x,
        y: coords.y,
        left: rect.left - (cont?.left || 0) + coords.x * scale,
        top: rect.top - (cont?.top || 0) + coords.y * scale,
        scale,
        value: ''
      });
      setTimeout(() => textInputRef.current?.focus(), 0);
      return;
    }
    startPos.current = coords;
    setIsDrawing(true);

    // Save snapshot of current state before drawing new stroke
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#dc2626'; // Vivid red
    ctx.fillStyle = '#dc2626';
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || currentTool === 'text') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const coords = getCanvasCoords(e);

    if (currentTool === 'pen') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (snapshot.current) {
      // Restore canvas state before redrawing shape
      ctx.putImageData(snapshot.current, 0, 0);

      ctx.strokeStyle = '#dc2626';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (currentTool === 'rect') {
        const width = coords.x - startPos.current.x;
        const height = coords.y - startPos.current.y;
        ctx.strokeRect(startPos.current.x, startPos.current.y, width, height);
      } else if (currentTool === 'circle') {
        const radiusX = Math.abs(coords.x - startPos.current.x) / 2;
        const radiusY = Math.abs(coords.y - startPos.current.y) / 2;
        const centerX = Math.min(startPos.current.x, coords.x) + radiusX;
        const centerY = Math.min(startPos.current.y, coords.y) + radiusY;

        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (currentTool === 'arrow') {
        drawArrow(ctx, startPos.current.x, startPos.current.y, coords.x, coords.y, lineWidth * 3.5);
      }
    }
  };

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    headLength: number
  ) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  };

  const endDraw = () => {
    if (!isDrawing || currentTool === 'text') return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Push new state to history
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory(prev => [...prev, currentData]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, -1);
    const lastState = newHistory[newHistory.length - 1];
    ctx.putImageData(lastState, 0, 0);
    setHistory(newHistory);
  };

  const handleReset = () => {
    if (history.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const initialState = history[0];
    ctx.putImageData(initialState, 0, 0);
    setHistory([initialState]);
  };

  const handleSave = () => {
    // Fijar el texto pendiente antes de exportar la foto
    if (textDraftRef.current?.value.trim()) commitText();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[12000] flex flex-col bg-slate-950/95 text-white animate-in fade-in select-none">
      
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-rose-600 animate-pulse"></div>
          <span className="text-xs sm:text-sm font-bold text-white">
            Editor de Marcado Rojo (Señalar anomalía)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
            <span>Cancelar</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md cursor-pointer transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Foto Marcada</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-3 sm:p-6 overflow-hidden relative bg-black/40 touch-none"
      >
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          className={`max-w-full max-h-[72vh] object-contain rounded-xl shadow-2xl border-2 border-slate-700 bg-neutral-900 ${currentTool === 'text' ? 'cursor-text' : 'cursor-crosshair'}`}
        />
        {textDraft && (
          <textarea
            ref={textInputRef}
            value={textDraft.value}
            onChange={e => textDraftRef.current && updateDraft({ ...textDraftRef.current, value: e.target.value })}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
              if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); updateDraft(null); }
            }}
            onBlur={commitText}
            rows={Math.max(1, textDraft.value.split('\n').length)}
            placeholder="Escribe y presiona Enter"
            className="absolute z-10 bg-white/95 text-red-600 font-bold border-2 border-red-600 rounded-md outline-none resize-none px-1.5 py-0.5 min-w-[160px] shadow-lg placeholder:text-red-300 placeholder:font-semibold"
            style={{ left: textDraft.left, top: textDraft.top, fontSize: Math.max(12, fontSizeFor(lineWidth) * textDraft.scale), lineHeight: 1.2 }}
          />
        )}
      </div>

      {/* Bottom Floating Tools Bar */}
      <div className="p-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-3 flex-wrap shrink-0">
        
        {/* Drawing Tools (Always in Red) */}
        <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-2xl border border-slate-700">
          
          <button
            type="button"
            onClick={() => setCurrentTool('pen')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTool === 'pen' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700'
            }`}
            title="Lápiz libre rojo"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trazo Libre</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool('circle')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTool === 'circle' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700'
            }`}
            title="Círculo rojo para señalar"
          >
            <Circle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Círculo</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool('arrow')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTool === 'arrow' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700'
            }`}
            title="Flecha roja"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Flecha</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool('rect')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTool === 'rect' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700'
            }`}
            title="Rectángulo rojo"
          >
            <Square className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Rectángulo</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentTool('text')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTool === 'text' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-700'
            }`}
            title="Recuadro de texto: toca la foto donde quieres escribir"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Texto</span>
          </button>

        </div>

        {/* Stroke Width Selector */}
        <div className="flex items-center gap-1.5 bg-slate-800 px-3 py-1.5 rounded-2xl border border-slate-700">
          <span className="text-[11px] text-slate-400 font-medium">{currentTool === 'text' ? 'Tamaño:' : 'Grosor:'}</span>
          {[3, 6, 10].map(w => (
            <button
              key={w}
              type="button"
              onClick={() => setLineWidth(w)}
              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer transition-all ${
                lineWidth === w ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:bg-slate-700'
              }`}
            >
              {w === 3 ? 'Fino' : w === 6 ? 'Med' : 'Gru'}
            </button>
          ))}
        </div>

        {/* History Actions: Undo / Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            title="Deshacer último trazo"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Deshacer</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={history.length <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold cursor-pointer transition-colors"
            title="Limpiar todos los trazos"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        </div>

      </div>

    </div>
  );
}
