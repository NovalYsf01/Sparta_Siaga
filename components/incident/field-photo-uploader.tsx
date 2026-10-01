"use client";

import React, { useRef, useState } from "react";
import { Camera, Image as ImageIcon, X, UploadCloud } from "lucide-react";
import { CameraCapture } from "./camera-capture";

export interface PhotoData {
  file: File | null;
  previewUrl: string | null;
  source: "camera" | "gallery" | null;
  reporterRelation: "self" | "received" | null;
  capturedAt: string | null;
}

interface FieldPhotoUploaderProps {
  label: string;
  description?: string;
  value: PhotoData;
  onChange: (data: PhotoData) => void;
  storeName?: string;
  reporterName?: string;
}

export function FieldPhotoUploader({ label, description, value, onChange, storeName = "", reporterName = "" }: FieldPhotoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, source: "camera" | "gallery") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    const capturedAt = new Date().toISOString(); // Simplified for demo
    
    onChange({
      ...value,
      file,
      previewUrl,
      source,
      capturedAt,
      reporterRelation: "self" // default, can be toggled
    });
  };

  const handleCameraCapture = (file: File, previewUrl: string) => {
    onChange({
      ...value,
      file,
      previewUrl,
      source: "camera",
      capturedAt: new Date().toISOString(),
      reporterRelation: "self"
    });
  };

  const handleRemove = () => {
    if (value.previewUrl) URL.revokeObjectURL(value.previewUrl);
    onChange({
      file: null,
      previewUrl: null,
      source: null,
      reporterRelation: null,
      capturedAt: null,
    });
  };

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/50">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{label}</h4>
        {description && <p className="text-[10px] text-slate-500 mt-0.5">{description}</p>}
      </div>

      {!value.previewUrl ? (
        <div className="flex gap-2">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef}
            className="hidden" 
            onChange={(e) => handleFileChange(e, "gallery")}
          />
          
          <button 
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-2 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-[#1D5AA6] hover:bg-[#EAF2FB] dark:hover:bg-blue-900/20 text-slate-500 hover:text-[#1D5AA6] transition-colors"
          >
            <Camera className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Kamera</span>
          </button>
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex flex-col items-center justify-center gap-2 h-24 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-[#1D5AA6] hover:bg-[#EAF2FB] dark:hover:bg-blue-900/20 text-slate-500 hover:text-[#1D5AA6] transition-colors"
          >
            <ImageIcon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Galeri</span>
          </button>
        </div>
      ) : (
        <div className="relative group">
          <img 
            src={value.previewUrl} 
            alt={label} 
            className="w-full h-32 md:h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-700 mb-3" 
          />
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <button 
              type="button"
              onClick={handleRemove}
              className="p-2 bg-red-500/90 backdrop-blur-sm text-white rounded-full hover:bg-red-600 shadow-sm"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-2 left-2 flex gap-1 z-10">
            <span className="text-[10px] bg-black/70 text-white px-2 py-1 rounded-md backdrop-blur-sm flex items-center gap-1 font-semibold">
              {value.source === "camera" ? <Camera className="w-3 h-3"/> : <ImageIcon className="w-3 h-3"/>}
              {value.source === "camera" ? "Kamera" : "Galeri"}
            </span>
          </div>

          {value.source !== "camera" && (
            <div className="bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-2">Sumber Foto ini:</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...value, reporterRelation: "self" })}
                  className={`flex-1 flex items-center gap-2 p-2 rounded-md border transition-colors text-xs font-semibold ${
                    value.reporterRelation === "self"
                      ? "bg-[#1D5AA6] border-[#1D5AA6] text-white"
                      : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0 ${value.reporterRelation === "self" ? "border-white" : "border-slate-300"}`}>
                    {value.reporterRelation === "self" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                  </div>
                  Diambil oleh saya
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...value, reporterRelation: "received" })}
                className={`flex-1 flex items-center gap-2 p-2 rounded-md border transition-colors text-xs font-semibold ${
                  value.reporterRelation === "received"
                    ? "bg-[#1D5AA6] border-[#1D5AA6] text-white"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"
                }`}
              >
                <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center shrink-0 ${value.reporterRelation === "received" ? "border-white" : "border-slate-300"}`}>
                  {value.reporterRelation === "received" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                Diterima dari pihak lain
              </button>
            </div>
          </div>
          )}
        </div>
      )}
      <CameraCapture 
        isOpen={isCameraOpen} 
        onClose={() => setIsCameraOpen(false)} 
        onCapture={handleCameraCapture} 
        storeName={storeName}
        reporterName={reporterName}
      />
    </div>
  );
}
