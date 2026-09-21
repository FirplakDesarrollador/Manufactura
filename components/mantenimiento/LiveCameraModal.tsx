'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
}

export default function LiveCameraModal({
  isOpen,
  onCapture,
  onClose
}: LiveCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera(facingMode);

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      }).catch(() => {});
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: 'environment' | 'user') => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La cámara en vivo no es soportada directamente en este navegador.');
      }

      let constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      let newStream: MediaStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // Fallback with basic video constraint if specific facingMode fails on PC/laptop
        newStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.error('Error accediendo a la cámara:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Por favor habilita el permiso de cámara en tu navegador.'
          : err.name === 'NotFoundError'
          ? 'No se detectó ninguna cámara disponible en este equipo.'
          : 'No se pudo iniciar la cámara en vivo. Puedes usar la cámara nativa de tu dispositivo a continuación.'
      );
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (!video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

    stopCamera();
    onCapture(dataUrl);
  };

  const toggleFacingMode = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleNativeFallback = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          stopCamera();
          onCapture(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="p-3.5 sm:p-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm sm:text-base">Cámara de Evidencia TPM</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors cursor-pointer"
            title="Cerrar cámara"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder / Video Feed */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[320px] sm:min-h-[440px] overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-300 flex flex-col items-center gap-3.5 max-w-sm">
              <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-800/80 text-rose-400 flex items-center justify-center">
                <AlertCircle className="w-7 h-7" />
              </div>
              <p className="text-xs text-rose-300 font-medium leading-relaxed">{cameraError}</p>
              
              {/* Fallback directly to native system camera input */}
              <label 
                htmlFor="live-fallback-camera-input"
                className="mt-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4 text-slate-950" />
                <span>Abrir Cámara del Dispositivo</span>
              </label>
              <input
                id="live-fallback-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNativeFallback}
                className="sr-only"
              />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain max-h-[65vh]"
              />

              {/* Guías de encuadre en retícula */}
              <div className="absolute inset-8 sm:inset-14 border-2 border-white/25 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-6 h-6 border-t-2 border-l-2 border-amber-400 absolute top-0 left-0 -mt-1 -ml-1"></div>
                <div className="w-6 h-6 border-t-2 border-r-2 border-amber-400 absolute top-0 right-0 -mt-1 -mr-1"></div>
                <div className="w-6 h-6 border-b-2 border-l-2 border-amber-400 absolute bottom-0 left-0 -mb-1 -ml-1"></div>
                <div className="w-6 h-6 border-b-2 border-r-2 border-amber-400 absolute bottom-0 right-0 -mb-1 -mr-1"></div>
              </div>

              {/* Botón para alternar cámara Frontal / Trasera */}
              {hasMultipleCameras && (
                <button
                  type="button"
                  onClick={toggleFacingMode}
                  className="absolute top-3 right-3 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition-all shadow-md cursor-pointer"
                  title="Cambiar Cámara Frontal / Trasera"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer / Controls */}
        <div className="p-3.5 sm:p-4 bg-slate-800 border-t border-slate-700 flex items-center justify-between gap-2.5 flex-wrap">
          {/* Opción cámara nativa del sistema / galería */}
          <label 
            htmlFor="live-modal-footer-native-input"
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-xl cursor-pointer transition-colors select-none"
            title="Abrir app de cámara del sistema operativo o galería"
          >
            <ImageIcon className="w-4 h-4 text-slate-300" />
            <span className="hidden sm:inline">Cámara del Sistema</span>
            <span className="sm:hidden">App Cámara</span>
          </label>
          <input
            id="live-modal-footer-native-input"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleNativeFallback}
            className="sr-only"
          />

          {/* Botón Shutter Grande de Captura */}
          {!cameraError && (
            <button
              type="button"
              onClick={handleTakePhoto}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-2xl shadow-lg transition-all transform active:scale-95 cursor-pointer"
            >
              <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-900 bg-white animate-ping"></div>
              <span>Tomar Foto</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  );
}
