import { useState, useEffect, useCallback, useRef } from 'react';
import { AnexoType, Anexo10Data, Anexo11Data } from './types';
import { loadAnexo10, saveAnexo10, loadAnexo11, saveAnexo11, emptyEntries10, emptyEntries11 } from './utils/storage';
import HeaderForm from './components/HeaderForm';
import { Anexo10Table, Anexo11Table } from './components/RegistroTable';
import { PrintView10, PrintView11 } from './components/PrintView';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AnexoType>('anexo10');
  const [printing, setPrinting] = useState(false);

  // Current year/month driven by the header for each anexo
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

  const [anexo10, setAnexo10] = useState<Anexo10Data>(() => loadAnexo10(currentYear, now.getMonth() + 1));
  const [anexo11, setAnexo11] = useState<Anexo11Data>(() => loadAnexo11(currentYear, now.getMonth() + 1));

  // Track which year/month we last loaded for each anexo to handle month switching
  const [loadedKey10, setLoadedKey10] = useState(`${currentYear}-${currentMonth}`);
  const [loadedKey11, setLoadedKey11] = useState(`${currentYear}-${currentMonth}`);

  const printRef = useRef<HTMLDivElement>(null);

  // Auto-save with debounce
  const debouncedAnexo10 = useDebounce(anexo10, 800);
  const debouncedAnexo11 = useDebounce(anexo11, 800);

  useEffect(() => {
    const y = parseInt(debouncedAnexo10.header.anio);
    const m = parseInt(debouncedAnexo10.header.mes);
    if (!isNaN(y) && !isNaN(m)) saveAnexo10(y, m, debouncedAnexo10);
  }, [debouncedAnexo10]);

  useEffect(() => {
    const y = parseInt(debouncedAnexo11.header.anio);
    const m = parseInt(debouncedAnexo11.header.mes);
    if (!isNaN(y) && !isNaN(m)) saveAnexo11(y, m, debouncedAnexo11);
  }, [debouncedAnexo11]);

  // When header year/month changes, reload from storage for that period
  const handleHeader10Change = useCallback((header: Anexo10Data['header']) => {
    const newKey = `${header.anio}-${header.mes}`;
    if (newKey !== loadedKey10) {
      const y = parseInt(header.anio);
      const m = parseInt(header.mes);
      const loaded = loadAnexo10(y, m);
      // Keep entries count aligned to new month
      const entries = loaded.entries.length > 0 ? loaded.entries : emptyEntries10(y, m);
      setAnexo10({ ...loaded, header, entries });
      setLoadedKey10(newKey);
    } else {
      setAnexo10(prev => ({ ...prev, header }));
    }
  }, [loadedKey10]);

  const handleHeader11Change = useCallback((header: Anexo11Data['header']) => {
    const newKey = `${header.anio}-${header.mes}`;
    if (newKey !== loadedKey11) {
      const y = parseInt(header.anio);
      const m = parseInt(header.mes);
      const loaded = loadAnexo11(y, m);
      const entries = loaded.entries.length > 0 ? loaded.entries : emptyEntries11(y, m);
      setAnexo11({ ...loaded, header, entries });
      setLoadedKey11(newKey);
    } else {
      setAnexo11(prev => ({ ...prev, header }));
    }
  }, [loadedKey11]);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  };

  const tabCls = (tab: AnexoType) =>
    `px-6 py-3 text-sm font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'bg-white text-blue-800 border-blue-600 shadow-sm'
        : 'bg-blue-50 text-blue-500 border-transparent hover:bg-blue-100 hover:text-blue-700'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Top nav bar */}
      <nav className="bg-blue-900 text-white px-6 py-3 flex items-center justify-between no-print shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">R</div>
          <div>
            <div className="font-bold text-base leading-tight">RPIS — Ecuador</div>
            <div className="text-xs text-blue-200">Control de Temperatura y Humedad — Almacén Farmacéutico</div>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Imprimir / Exportar
        </button>
      </nav>

      {/* Tab bar */}
      <div className="px-6 pt-4 flex gap-2 no-print">
        <button className={tabCls('anexo10')} onClick={() => setActiveTab('anexo10')}>
          Anexo 10 — Temperatura y Humedad Ambiental
        </button>
        <button className={tabCls('anexo11')} onClick={() => setActiveTab('anexo11')}>
          Anexo 11 — Temperatura de Refrigeración
        </button>
      </div>

      {/* Main content */}
      <main className="px-6 pb-8 no-print">
        {activeTab === 'anexo10' && (
          <div className="bg-white rounded-b-lg rounded-tr-lg shadow-md p-6">
            <HeaderForm
              data={anexo10.header}
              onChange={handleHeader10Change}
              equipoLabel="No. Termohigrómetro"
              anexoTitle="ANEXO 10 — REGISTRO DE TEMPERATURA Y HUMEDAD AMBIENTAL"
              anexoSubtitle="Almacén / Bodega Farmacéutica"
            />
            <Anexo10Table
              entries={anexo10.entries}
              onChange={entries => setAnexo10(prev => ({ ...prev, entries }))}
              footer={anexo10.footer}
              onFooterChange={footer => setAnexo10(prev => ({ ...prev, footer }))}
            />
            <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Los datos se guardan automáticamente en este navegador.
            </div>
          </div>
        )}

        {activeTab === 'anexo11' && (
          <div className="bg-white rounded-b-lg rounded-tr-lg shadow-md p-6">
            <HeaderForm
              data={anexo11.header}
              onChange={handleHeader11Change}
              equipoLabel="No. Equipo de Refrigeración"
              anexoTitle="ANEXO 11 — REGISTRO DE TEMPERATURA DE REFRIGERACIÓN"
              anexoSubtitle="Almacén / Cadena de Frío Farmacéutica"
            />
            <Anexo11Table
              entries={anexo11.entries}
              onChange={entries => setAnexo11(prev => ({ ...prev, entries }))}
              footer={anexo11.footer}
              onFooterChange={footer => setAnexo11(prev => ({ ...prev, footer }))}
            />
            <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Los datos se guardan automáticamente en este navegador.
            </div>
          </div>
        )}
      </main>

      {/* Print area — always rendered, only visible when printing */}
      <div id="print-area" ref={printRef} style={{ display: printing ? 'block' : 'none' }}>
        {activeTab === 'anexo10' && <PrintView10 data={anexo10} />}
        {activeTab === 'anexo11' && <PrintView11 data={anexo11} />}
      </div>
    </div>
  );
}
