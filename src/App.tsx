import { useState, useEffect, useCallback, useRef } from 'react';
import { Termohigrometro, Anexo10Data, Anexo11Data, MESES } from './types';
import {
  loadTermos, saveTermos,
  loadAnexo10, saveAnexo10,
  loadAnexo11, saveAnexo11,
  emptyEntries10, emptyEntries11,
  loadLockedDays, saveLockedDays,
  exportAllData, importAllData,
} from './utils/storage';
import HeaderForm from './components/HeaderForm';
import { Anexo10Table, Anexo11Table } from './components/RegistroTable';
import { Anexo10Chart, Anexo11Chart } from './components/TempChart';
import Sidebar from './components/Sidebar';
import TermoCard from './components/TermoCard';
import TermoModal from './components/TermoModal';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── Screen 1: Dashboard ──────────────────────────────────────────────────────

interface DashboardProps {
  termos: Termohigrometro[];
  onView: (t: Termohigrometro) => void;
  onAdd: () => void;
  onEdit: (t: Termohigrometro) => void;
  onDelete: (id: string) => void;
}

function Dashboard({ termos, onView, onAdd, onEdit, onDelete }: DashboardProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      {/* Nav */}
      <nav className="bg-blue-900 text-white px-6 py-3 flex items-center gap-3 shadow-lg">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">R</div>
        <div>
          <div className="font-bold text-base leading-tight">RPIS — Control de Temperatura y Humedad</div>
          <div className="text-xs text-blue-200">Almacén Farmacéutico — Ecuador</div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">Equipos registrados</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {termos.length === 0
                ? 'Sin equipos aún — agrega el primero'
                : `${termos.length} equipo${termos.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
          >
            ➕ Agregar equipo
          </button>
        </div>

        {termos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4 text-3xl">🌡️</div>
            <h2 className="text-lg font-bold text-blue-900 mb-1">No hay equipos registrados</h2>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              Agrega tu primer termohigrómetro para comenzar a registrar temperatura y humedad.
            </p>
            <button
              onClick={onAdd}
              className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow"
            >
              Agregar primer equipo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {termos.map(t => (
              <TermoCard
                key={t.id}
                termo={t}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Screen 2: Registro mensual ───────────────────────────────────────────────

interface RegistroScreenProps {
  termo: Termohigrometro;
  onBack: () => void;
}

function RegistroScreen({ termo, onBack }: RegistroScreenProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);

  const isAmbiental = termo.tipo === 'ambiental';

  // ─── Anexo 10 state ───
  const [anexo10, setAnexo10] = useState<Anexo10Data>(() => {
    const loaded = loadAnexo10(currentYear, currentMonthNum, termo.id);
    const entries = loaded.entries.length > 0 ? loaded.entries : emptyEntries10(currentYear, currentMonthNum);
    const header = { ...loaded.header, noEquipo: loaded.header.noEquipo || termo.numero };
    return { ...loaded, header, entries };
  });
  const [lockedDays10, setLockedDays10] = useState<Set<number>>(() =>
    loadLockedDays(termo.id, currentYear, currentMonthNum)
  );
  const [loadedKey10, setLoadedKey10] = useState(`${currentYear}-${String(currentMonthNum).padStart(2, '0')}`);

  // ─── Anexo 11 state ───
  const [anexo11, setAnexo11] = useState<Anexo11Data>(() => {
    const loaded = loadAnexo11(currentYear, currentMonthNum, termo.id);
    const entries = loaded.entries.length > 0 ? loaded.entries : emptyEntries11(currentYear, currentMonthNum);
    const header = { ...loaded.header, noEquipo: loaded.header.noEquipo || termo.numero };
    return { ...loaded, header, entries };
  });
  const [lockedDays11, setLockedDays11] = useState<Set<number>>(() =>
    loadLockedDays(termo.id, currentYear, currentMonthNum)
  );
  const [loadedKey11, setLoadedKey11] = useState(`${currentYear}-${String(currentMonthNum).padStart(2, '0')}`);

  const importFileRef = useRef<HTMLInputElement>(null);

  // Auto-save with debounce
  const debouncedAnexo10 = useDebounce(anexo10, 800);
  const debouncedAnexo11 = useDebounce(anexo11, 800);

  useEffect(() => {
    const y = parseInt(debouncedAnexo10.header.anio);
    const m = parseInt(debouncedAnexo10.header.mes);
    if (!isNaN(y) && !isNaN(m)) saveAnexo10(y, m, debouncedAnexo10, termo.id);
  }, [debouncedAnexo10, termo.id]);

  useEffect(() => {
    const y = parseInt(debouncedAnexo11.header.anio);
    const m = parseInt(debouncedAnexo11.header.mes);
    if (!isNaN(y) && !isNaN(m)) saveAnexo11(y, m, debouncedAnexo11, termo.id);
  }, [debouncedAnexo11, termo.id]);

  useEffect(() => {
    const y = parseInt(anexo10.header.anio);
    const m = parseInt(anexo10.header.mes);
    if (!isNaN(y) && !isNaN(m)) saveLockedDays(termo.id, y, m, lockedDays10);
  }, [lockedDays10, anexo10.header.anio, anexo10.header.mes, termo.id]);

  useEffect(() => {
    const y = parseInt(anexo11.header.anio);
    const m = parseInt(anexo11.header.mes);
    if (!isNaN(y) && !isNaN(m)) saveLockedDays(termo.id, y, m, lockedDays11);
  }, [lockedDays11, anexo11.header.anio, anexo11.header.mes, termo.id]);

  // Navigation handler — loads data for selected year/month
  const handleNavigate = useCallback((year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    const mesStr = String(month).padStart(2, '0');
    const newKey = `${year}-${mesStr}`;

    if (isAmbiental) {
      if (newKey !== loadedKey10) {
        const loaded = loadAnexo10(year, month, termo.id);
        const entries = loaded.entries.length > 0 ? loaded.entries : emptyEntries10(year, month);
        const header = { ...loaded.header, anio: String(year), mes: mesStr, noEquipo: loaded.header.noEquipo || termo.numero };
        setAnexo10({ ...loaded, header, entries });
        setLockedDays10(loadLockedDays(termo.id, year, month));
        setLoadedKey10(newKey);
      }
    } else {
      if (newKey !== loadedKey11) {
        const loaded = loadAnexo11(year, month, termo.id);
        const entries = loaded.entries.length > 0 ? loaded.entries : emptyEntries11(year, month);
        const header = { ...loaded.header, anio: String(year), mes: mesStr, noEquipo: loaded.header.noEquipo || termo.numero };
        setAnexo11({ ...loaded, header, entries });
        setLockedDays11(loadLockedDays(termo.id, year, month));
        setLoadedKey11(newKey);
      }
    }

    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [isAmbiental, loadedKey10, loadedKey11, termo.id, termo.numero]);

  const handleHeader10Change = useCallback((header: Anexo10Data['header']) => {
    const newKey = `${header.anio}-${header.mes}`;
    if (newKey !== loadedKey10) {
      const y = parseInt(header.anio);
      const m = parseInt(header.mes);
      const loaded = loadAnexo10(y, m, termo.id);
      const entries = loaded.entries.length > 0 ? loaded.entries : emptyEntries10(y, m);
      setAnexo10({ ...loaded, header, entries });
      setLockedDays10(loadLockedDays(termo.id, y, m));
      setLoadedKey10(newKey);
      setSelectedYear(y);
      setSelectedMonth(m);
    } else {
      setAnexo10(prev => ({ ...prev, header }));
    }
  }, [loadedKey10, termo.id]);

  const handleHeader11Change = useCallback((header: Anexo11Data['header']) => {
    const newKey = `${header.anio}-${header.mes}`;
    if (newKey !== loadedKey11) {
      const y = parseInt(header.anio);
      const m = parseInt(header.mes);
      const loaded = loadAnexo11(y, m, termo.id);
      const entries = loaded.entries.length > 0 ? loaded.entries : emptyEntries11(y, m);
      setAnexo11({ ...loaded, header, entries });
      setLockedDays11(loadLockedDays(termo.id, y, m));
      setLoadedKey11(newKey);
      setSelectedYear(y);
      setSelectedMonth(m);
    } else {
      setAnexo11(prev => ({ ...prev, header }));
    }
  }, [loadedKey11, termo.id]);

  const handleImportFile = async (file: File) => {
    try {
      await importAllData(file);
      alert('Respaldo importado correctamente. La página se recargará.');
      window.location.reload();
    } catch (err: unknown) {
      alert('Error al importar: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const year10 = parseInt(anexo10.header.anio);
  const month10 = parseInt(anexo10.header.mes);
  const year11 = parseInt(anexo11.header.anio);
  const month11 = parseInt(anexo11.header.mes);

  const mesNombre = MESES[selectedMonth - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col">
      {/* Top nav */}
      <nav className="bg-blue-900 text-white px-6 py-3 flex items-center gap-3 shadow-lg no-print z-50 relative">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm">R</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base leading-tight">RPIS — Control de Temperatura y Humedad</div>
          <div className="text-xs text-blue-200 truncate">
            {termo.nombre}
            {termo.numero ? ` · N° ${termo.numero}` : ''}
            {' · '}
            <span className={isAmbiental ? 'text-blue-300' : 'text-teal-300'}>
              {isAmbiental ? 'Anexo 10 — Ambiente' : 'Anexo 11 — Refrigeración'}
            </span>
          </div>
        </div>
      </nav>

      <div className="flex flex-1 relative no-print">
        {/* Sidebar */}
        <Sidebar
          termo={termo}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onNavigate={handleNavigate}
          onBack={onBack}
          onExport={exportAllData}
          onImport={handleImportFile}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
        />

        {/* Main content — shifts right when sidebar is open on desktop */}
        <main
          className={`flex-1 px-4 md:px-6 py-6 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'ml-0'}`}
          style={{ paddingLeft: sidebarOpen ? undefined : '3.5rem' }}
        >
          {/* Month/year heading */}
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-lg font-bold text-blue-900">
              {mesNombre} {selectedYear}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                isAmbiental ? 'bg-blue-100 text-blue-800' : 'bg-teal-100 text-teal-800'
              }`}
            >
              {isAmbiental ? 'Temperatura y Humedad Ambiental' : 'Temperatura de Refrigeración'}
            </span>
          </div>

          {isAmbiental ? (
            <div className="bg-white rounded-xl shadow-md p-6">
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
              <Anexo10Chart
                entries={anexo10.entries}
                year={year10}
                month={month10}
              />
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-6">
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
              <Anexo11Chart
                entries={anexo11.entries}
                year={year11}
                month={month11}
              />
            </div>
          )}
        </main>
      </div>

      {/* Hidden import input */}
      <input ref={importFileRef} type="file" accept=".json" className="hidden" />
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [termos, setTermos] = useState<Termohigrometro[]>(() => loadTermos());
  const [selectedTermo, setSelectedTermo] = useState<Termohigrometro | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Termohigrometro | null>(null);

  const handleSaveTermo = (t: Termohigrometro) => {
    const updated = editTarget
      ? termos.map(x => x.id === t.id ? t : x)
      : [...termos, t];
    saveTermos(updated);
    setTermos(updated);
    setModalOpen(false);
    setEditTarget(null);
  };

  const handleDelete = (id: string) => {
    const updated = termos.filter(t => t.id !== id);
    saveTermos(updated);
    setTermos(updated);
  };

  const openAdd = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const openEdit = (t: Termohigrometro) => {
    setEditTarget(t);
    setModalOpen(true);
  };

  // If viewing a specific termo
  if (selectedTermo) {
    return (
      <RegistroScreen
        termo={selectedTermo}
        onBack={() => setSelectedTermo(null)}
      />
    );
  }

  return (
    <>
      <Dashboard
        termos={termos}
        onView={setSelectedTermo}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={handleDelete}
      />
      {modalOpen && (
        <TermoModal
          initial={editTarget}
          onSave={handleSaveTermo}
          onCancel={() => { setModalOpen(false); setEditTarget(null); }}
        />
      )}
    </>
  );
}
