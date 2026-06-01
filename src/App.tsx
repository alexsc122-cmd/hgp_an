import { useState, useEffect, useCallback, useRef } from 'react';
import { AnexoType, Anexo10Data, Anexo11Data } from './types';
import {
  loadAnexo10, saveAnexo10, loadAnexo11, saveAnexo11,
  emptyEntries10, emptyEntries11,
  loadLockedDays, saveLockedDays,
  exportAllData, importAllData,
} from './utils/storage';
import HeaderForm from './components/HeaderForm';
import { Anexo10Table, Anexo11Table } from './components/RegistroTable';
import { PrintView10, PrintView11 } from './components/PrintView';
import MonthNavigation from './components/MonthNavigation';
import { Anexo10Chart, Anexo11Chart } from './components/TempChart';

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

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

  const [anexo10, setAnexo10] = useState<Anexo10Data>(() => loadAnexo10(currentYear, now.getMonth() + 1));
  const [anexo11, setAnexo11] = useState<Anexo11Data>(() => loadAnexo11(currentYear, now.getMonth() + 1));

  // Locked days state
  const [lockedDays10, setLockedDays10] = useState<Set<number>>(() =>
    loadLockedDays('locked10', currentYear, now.getMonth() + 1)
  );
  const [lockedDays11, setLockedDays11] = useState<Set<number>>(() =>
    loadLockedDays('locked11', currentYear, now.getMonth() + 1)
  );

  const [loadedKey10, setLoadedKey10] = useState(`${currentYear}-${currentMonth}`);
  const [loadedKey11, setLoadedKey11] = useState(`${currentYear}-${currentMonth}`);

  const printRef = useRef<HTMLDivElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

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

  // Save locked days immediately when they change
  useEffect(() => {
    const y = parseInt(anexo10.header.anio);
    const m = parseInt(anexo10.header.mes);
    if (!isNaN(y) && !isNaN(m)) saveLockedDays('locked10', y, m, lockedDays10);
  }, [lockedDays10, anexo10.header.anio, anexo10.header.mes]);

  useEffect(() => {
    const y = parseInt(anexo11.header.anio);
    const m = parseInt(anexo11.header.mes);
    if (!isNaN(y) && !isNaN(m)) saveLockedDays('locked11', y, m, lockedDays11);
  }, [lockedDays11, anexo11.header.anio, anexo11.header.mes]);

  // When header year/month changes, reload from storage for that period
  const handleHeader10Change = useCallback((header: Anexo10Data['header']) => {
    const newKey = `${header.anio}-${header.mes}`;
    if (newKey !== loadedKey10) {
      const y = parseInt(header.anio);
      const m = parseInt(header.mes);
      const loaded = loadAnexo10(y, m);
      const entries = loaded.entries.length > 0 ? loaded.entries : emptyEntries10(y, m);
      setAnexo10({ ...loaded, header, entries });
      setLockedDays10(loadLockedDays('locked10', y, m));
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
      setLockedDays11(loadLockedDays('locked11', y, m));
      setLoadedKey11(newKey);
    } else {
      setAnexo11(prev => ({ ...prev, header }));
    }
  }, [loadedKey11]);

  // Month navigation handlers
  const handleNavigate10 = useCallback((year: number, month: number) => {
    const mesStr = String(month).padStart(2, '0');
    handleHeader10Change({ ...anexo10.header, anio: String(year), mes: mesStr });
  }, [anexo10.header, handleHeader10Change]);

  const handleNavigate11 = useCallback((year: number, month: number) => {
    const mesStr = String(month).padStart(2, '0');
    handleHeader11Change({ ...anexo11.header, anio: String(year), mes: mesStr });
  }, [anexo11.header, handleHeader11Change]);

  const handlePrint = () => {
    setPrinting(true);
    setTimeout(() => {
      window.print();
      setPrinting(false);
    }, 150);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importAllData(file);
      alert('Respaldo importado correctamente. La página se recargará.');
      window.location.reload();
    } catch (err: unknown) {
      alert('Error al importar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      if (importFileRef.current) importFileRef.current.value = '';
    }
  };

  const tabCls = (tab: AnexoType) =>
    `px-6 py-3 text-sm font-semibold rounded-t-lg border-b-2 transition-colors cursor-pointer ${
      activeTab === tab
        ? 'bg-white text-blue-800 border-blue-600 shadow-sm'
        : 'bg-blue-50 text-blue-500 border-transparent hover:bg-blue-100 hover:text-blue-700'
    }`;

  const year10 = parseInt(anexo10.header.anio);
  const month10 = parseInt(anexo10.header.mes);
  const year11 = parseInt(anexo11.header.anio);
  const month11 = parseInt(anexo11.header.mes);

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
            {/* Data storage banner */}
            <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              <span className="flex items-center gap-1.5 font-medium">
                💾 Datos guardados localmente en este navegador
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={exportAllData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  ↓ Exportar respaldo (JSON)
                </button>
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-green-100 border border-green-300 text-green-800 text-xs font-semibold transition-colors shadow-sm"
                >
                  ↑ Importar respaldo
                </button>
                <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
              </div>
            </div>

            {/* Month navigation */}
            <MonthNavigation
              year={year10}
              month={month10}
              onNavigate={handleNavigate10}
              anexo="anexo10"
            />

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
              lockedDays={lockedDays10}
              onLockedDaysChange={setLockedDays10}
            />

            {/* Temperature / humidity charts */}
            <Anexo10Chart
              entries={anexo10.entries}
              year={year10}
              month={month10}
            />
          </div>
        )}

        {activeTab === 'anexo11' && (
          <div className="bg-white rounded-b-lg rounded-tr-lg shadow-md p-6">
            {/* Data storage banner */}
            <div className="flex flex-wrap items-center gap-3 mb-4 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              <span className="flex items-center gap-1.5 font-medium">
                💾 Datos guardados localmente en este navegador
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={exportAllData}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-800 text-white text-xs font-semibold transition-colors shadow-sm"
                >
                  ↓ Exportar respaldo (JSON)
                </button>
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-green-100 border border-green-300 text-green-800 text-xs font-semibold transition-colors shadow-sm"
                >
                  ↑ Importar respaldo
                </button>
                <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
              </div>
            </div>

            {/* Month navigation */}
            <MonthNavigation
              year={year11}
              month={month11}
              onNavigate={handleNavigate11}
              anexo="anexo11"
            />

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
              lockedDays={lockedDays11}
              onLockedDaysChange={setLockedDays11}
            />

            {/* Temperature chart */}
            <Anexo11Chart
              entries={anexo11.entries}
              year={year11}
              month={month11}
            />
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
