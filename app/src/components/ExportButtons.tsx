'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  filename: string;
  className?: string;
}

/**
 * Botón "Descargar PNG" que captura el elemento referenciado.
 * Usa html-to-image para convertir DOM → PNG y dispara la descarga.
 */
export function ExportPNGButton({ targetRef, filename, className = '' }: ExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (!targetRef.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(targetRef.current, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) => {
          // Excluir el propio botón de exportación de la captura
          if (node instanceof HTMLElement && node.dataset.exportIgnore === 'true') return false;
          return true;
        },
      });
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exportando PNG:', err);
      alert('No se pudo generar la imagen. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      data-export-ignore="true"
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gob-green-300 text-gray-600 hover:text-gob-green-700 transition-all disabled:opacity-50 ${className}`}
      title="Descargar gráfica como imagen PNG"
      aria-label="Descargar imagen PNG"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {busy ? 'Generando…' : 'PNG'}
    </button>
  );
}

/**
 * Botón "Imprimir" — abre el diálogo de impresión nativo.
 * Combinado con @media print en globals.css genera PDF limpio.
 */
export function PrintButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      data-export-ignore="true"
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gob-green-300 text-gray-600 hover:text-gob-green-700 transition-all ${className}`}
      title="Imprimir o guardar como PDF"
      aria-label="Imprimir"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      Imprimir / PDF
    </button>
  );
}
