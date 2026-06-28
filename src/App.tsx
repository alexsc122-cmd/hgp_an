import { useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { useReactToPrint } from 'react-to-print';
import { Termohigrometro, Anexo10Data, Anexo11Data, MESES, Usuario } from './types';
import {
  emptyEntries10, emptyEntries11,
  getSession, setSession,
} from './utils/storage';
import {
  fsLoadTermos, fsSaveTermo, fsDeleteTermo,
  fsLoadUsuarios, fsSaveUsuario, fsDeleteUsuario,
  fsLoadRegistro, fsSaveRegistro,
  fsLoadLockedDays, fsSaveLockedDays,
  fsGetMonthsWithData,
  fsLoadUbicaciones, fsSaveUbicacion, fsDeleteUbicacion, fsRenameUbicacion,
  fsAuthCreateUser, fsAuthLogout, fsSendPasswordReset,
  fsGetUsuarioByLogin,
  fsLoadConfig, fsSaveConfig, AppConfig,
  fsExportAllData, fsDeleteAllData, fsImportData, ExportRow,
  fsLoadExceptionalDays, fsSaveExceptionalDay, fsDeleteExceptionalDay,
} from './utils/firestore';
import { isWorkday } from './utils/holidays';
import HeaderForm from './components/HeaderForm';
import { Anexo10Table, Anexo11Table } from './components/RegistroTable';
import { Anexo10Chart, Anexo11Chart } from './components/TempChart';
import Sidebar from './components/Sidebar';
import TermoCard from './components/TermoCard';
import TermoModal from './components/TermoModal';
import LoginScreen from './components/LoginScreen';
import UserModal from './components/UserModal';
import ReportesTab from './components/ReportesTab';
import PrintHeader from './components/PrintHeader';
import VerificationPage from './components/VerificationPage';
import ComplianceReport from './components/ComplianceReport';
import CalibrationHistory from './components/CalibrationHistory';
import PublicReportPage from './components/PublicReportPage';
import { QRCodeSVG } from 'qrcode.react';

function clearUnlockedNombres<T extends { dia: number; nombre: string }>(entries: T[], locked: Set<number>): T[] {
  return entries.map(e => locked.has(e.dia) ? e : { ...e, nombre: '' });
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ─── QR Label (printable poster) ─────────────────────────────────────────────

function QRLabelSection() {
  const publicUrl = `${window.location.origin}${window.location.pathname}?publico=1`;
  const labelRef = useRef<HTMLDivElement>(null);
  const handlePrintLabel = useReactToPrint({
    contentRef: labelRef,
    documentTitle: 'Rotulo_QR_Reporte_Publico',
    pageStyle: `
      @page { size: A5 portrait; margin: 0; }
      body { margin: 0; background: white; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    `,
  });

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl border border-teal-100">
      <h2 className="text-base font-bold text-teal-900 mb-1">📲 QR — Reporte público del mes</h2>
      <p className="text-xs text-gray-500 mb-4">
        Imprime el rótulo y colócalo en la puerta del área. Los inspectores del ARCSA/MSP pueden escanearlo para ver el estado de todos los equipos del mes en curso.
      </p>

      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Preview */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex flex-col items-center gap-1.5 shrink-0">
          <QRCodeSVG value={publicUrl} size={120} level="M" includeMargin />
          <p className="text-xs text-gray-400 font-medium">Vista previa del QR</p>
        </div>

        <div className="flex-1 space-y-3">
          <div className="bg-teal-50 border border-teal-100 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-teal-800 mb-1">URL del reporte público:</p>
            <code className="text-xs text-teal-700 break-all">{publicUrl}</code>
          </div>
          <ul className="text-xs text-gray-600 space-y-1.5">
            <li>✅ No requiere inicio de sesión</li>
            <li>✅ Muestra datos en tiempo real del mes en curso</li>
            <li>✅ El inspector puede imprimir desde su celular</li>
          </ul>
          <button
            onClick={() => handlePrintLabel()}
            className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            🖨️ Imprimir rótulo QR
          </button>
        </div>
      </div>

      {/* Hidden print label — A5 poster */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={labelRef}>
          <div style={{
            width: '148mm', minHeight: '210mm', background: 'white',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '12mm', boxSizing: 'border-box',
            fontFamily: 'system-ui, sans-serif',
          }}>
            {/* Top teal bar */}
            <div style={{
              width: '100%', background: 'linear-gradient(90deg, #0f766e, #0d9488)',
              borderRadius: '10px', padding: '14px 20px', marginBottom: '24px', textAlign: 'center',
            }}>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '9px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
                Clínica Renal El Puyo — VIVENS
              </div>
              <div style={{ color: 'white', fontSize: '16px', fontWeight: 800, lineHeight: 1.3 }}>
                Control de Temperatura y Humedad
              </div>
            </div>

            {/* Instruction */}
            <div style={{ fontSize: '13px', color: '#374151', textAlign: 'center', marginBottom: '20px', lineHeight: 1.5 }}>
              Escanea el código QR para ver el estado de los registros de temperatura del mes en curso.
            </div>

            {/* QR */}
            <div style={{
              border: '3px solid #0d9488', borderRadius: '16px', padding: '16px',
              background: 'white', marginBottom: '20px',
              boxShadow: '0 4px 20px rgba(13,148,136,0.15)',
            }}>
              <QRCodeSVG value={publicUrl} size={180} level="H" includeMargin={false} />
            </div>

            {/* URL */}
            <div style={{
              background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px',
              padding: '8px 16px', marginBottom: '24px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '8px', color: '#0f766e', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '3px' }}>
                URL del reporte
              </div>
              <div style={{ fontSize: '10px', color: '#0f766e', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                {publicUrl}
              </div>
            </div>

            {/* Footer note */}
            <div style={{
              fontSize: '9px', color: '#9ca3af', textAlign: 'center', lineHeight: 1.6,
              borderTop: '1px solid #e5e7eb', paddingTop: '12px', width: '100%',
            }}>
              Documento para uso de organismos de control (ARCSA / MSP)<br />
              No requiere inicio de sesión · Datos en tiempo real
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Configuración Tab ───────────────────────────────────────────────────────

function ConfigTab({ config, onSave, termos, exceptionalDays, onExceptionalDaysChange }: {
  config: AppConfig;
  onSave: (c: AppConfig) => void;
  termos: Termohigrometro[];
  exceptionalDays: string[];
  onExceptionalDaysChange: (days: string[]) => void;
}) {
  const [form, setForm] = useState<AppConfig>(config);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Export/Import/Reset state
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [resetStep, setResetStep] = useState<0 | 1 | 2>(0);
  const [resetting, setResetting] = useState(false);

  // Días excepcionales
  const [newDay, setNewDay] = useState('');
  const [savingDay, setSavingDay] = useState(false);

  const handleAddExceptionalDay = async () => {
    if (!newDay || exceptionalDays.includes(newDay)) return;
    setSavingDay(true);
    try {
      await fsSaveExceptionalDay(newDay);
      onExceptionalDaysChange([...exceptionalDays, newDay].sort());
      setNewDay('');
    } catch { alert('Error al guardar el día.'); }
    setSavingDay(false);
  };

  const handleDeleteExceptionalDay = async (fecha: string) => {
    try {
      await fsDeleteExceptionalDay(fecha);
      onExceptionalDaysChange(exceptionalDays.filter(d => d !== fecha));
    } catch { alert('Error al eliminar el día.'); }
  };

  const fmtFecha = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const field = (label: string, key: keyof AppConfig, placeholder: string) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-teal-800 uppercase tracking-wide">{label}</label>
      <input
        className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        placeholder={placeholder}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await fsSaveConfig(form);
      onSave(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Error al guardar configuración.'); }
    setSaving(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await fsExportAllData(termos);
      if (rows.length === 0) { alert('No hay datos para exportar.'); return; }
      const headers = Object.keys(rows[0]) as (keyof ExportRow)[];
      const csvLines = [
        headers.join(','),
        ...rows.map(r => headers.map(h => {
          const v = String(r[h] ?? '');
          return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(',')),
      ];
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `datos_vivens_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Error al exportar datos.'); }
    setExporting(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) { alert('El archivo CSV está vacío o no tiene datos.'); return; }
      const headers = lines[0].split(',');
      const rows: ExportRow[] = lines.slice(1).map(line => {
        const vals = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(v => v.startsWith('"') ? v.slice(1, -1).replace(/""/g, '"') : v) ?? [];
        const obj: Record<string, unknown> = {};
        headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
        return {
          ...obj,
          year: parseInt(obj.year as string),
          month: parseInt(obj.month as string),
          dia: parseInt(obj.dia as string),
          tsManana: obj.tsManana ? parseInt(obj.tsManana as string) : '',
          tsTarde: obj.tsTarde ? parseInt(obj.tsTarde as string) : '',
          locked: obj.locked === 'true',
          lockedAt: obj.lockedAt ? parseInt(obj.lockedAt as string) : '',
        } as ExportRow;
      });
      await fsImportData(rows);
      alert(`✅ Importación completada: ${rows.length} registros importados.`);
    } catch { alert('Error al importar datos. Verifica el formato del archivo.'); }
    setImporting(false);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await fsDeleteAllData(termos);
      alert('✅ Todos los datos han sido eliminados.');
    } catch { alert('Error al eliminar datos.'); }
    setResetting(false);
    setResetStep(0);
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-teal-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">Valores por defecto para el encabezado de todos los registros</p>
      </div>

      {/* Header config */}
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('Institución', 'institucion', 'Ej. Clínica Renal El Puyo')}
          {field('Estrategia / Programa / Proyecto', 'estrategia', 'Ej. Control Farmacéutico')}
          {field('Establecimiento', 'establecimiento', 'Ej. VIVENS')}
          {field('Dirección', 'direccion', 'Ej. Av. Principal, El Puyo')}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Guardando...' : 'Guardar configuración'}
          </button>
          {saved && <span className="text-teal-600 text-sm font-medium">✓ Guardado</span>}
        </div>
        <p className="text-xs text-gray-400">Estos valores se pre-llenan automáticamente en todos los formularios de registro.</p>
      </div>

      {/* Export / Import */}
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl mb-6">
        <h2 className="text-base font-bold text-teal-900 mb-1">Exportar / Importar datos</h2>
        <p className="text-xs text-gray-500 mb-4">Descarga todos los registros en formato CSV o carga datos previamente exportados.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            {exporting ? '⏳ Exportando...' : '📥 Exportar CSV'}
          </button>
          <label className={`cursor-pointer bg-green-700 hover:bg-green-800 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${importing ? 'opacity-50 pointer-events-none' : ''}`}>
            {importing ? '⏳ Importando...' : '📤 Importar CSV'}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
        </div>
        <p className="text-xs text-gray-400 mt-3">El archivo importado debe tener el mismo formato que el exportado. Los datos existentes se fusionarán.</p>
      </div>

      {/* Días no laborables excepcionales */}
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl mb-6">
        <h2 className="text-base font-bold text-teal-900 mb-1">📅 Días no laborables adicionales</h2>
        <p className="text-xs text-gray-500 mb-1">Los sábados, domingos y feriados nacionales del Ecuador ya están excluidos automáticamente.</p>
        <p className="text-xs text-gray-500 mb-4">Agrega aquí feriados móviles (Carnaval, Semana Santa) o días de cierre excepcionales.</p>
        <div className="flex gap-2 mb-4">
          <input
            type="date"
            value={newDay}
            onChange={e => setNewDay(e.target.value)}
            className="flex-1 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button
            onClick={handleAddExceptionalDay}
            disabled={savingDay || !newDay}
            className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Agregar
          </button>
        </div>
        {exceptionalDays.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">No hay días excepcionales configurados.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {exceptionalDays.map(d => (
              <li key={d} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-800">📅 {fmtFecha(d)}</span>
                <button onClick={() => handleDeleteExceptionalDay(d)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Eliminar</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* QR Reporte Público */}
      <QRLabelSection />

      {/* Reset */}
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-2xl border border-red-100">
        <h2 className="text-base font-bold text-red-800 mb-1">⚠️ Resetear todos los datos</h2>
        <p className="text-xs text-gray-500 mb-4">Elimina permanentemente todos los registros de temperatura y humedad de todos los equipos. Esta acción no se puede deshacer.</p>
        {resetStep === 0 && (
          <button
            onClick={() => setResetStep(1)}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            Resetear todos los datos
          </button>
        )}
        {resetStep === 1 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-red-800">¿Estás seguro? Esto eliminará TODOS los registros de todos los equipos.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setResetStep(2)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-1.5 rounded-lg text-sm"
              >
                Sí, continuar
              </button>
              <button
                onClick={() => setResetStep(0)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-1.5 rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
        {resetStep === 2 && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-4 space-y-3">
            <p className="text-sm font-bold text-red-900">⚠️ Confirmación final: esta acción es IRREVERSIBLE. ¿Deseas eliminar todos los datos?</p>
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-lg text-sm"
              >
                {resetting ? 'Eliminando...' : 'Sí, eliminar todo'}
              </button>
              <button
                onClick={() => setResetStep(0)}
                disabled={resetting}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Ubicaciones Tab ──────────────────────────────────────────────────────────

function UbicacionesTab({ ubicaciones, onRename }: { ubicaciones: string[]; onRename: (oldNombre: string, newNombre: string) => void }) {
  const [lista, setLista] = useState<string[]>(ubicaciones);
  const [nueva, setNueva] = useState('');
  const [loading, setLoading] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');

  const handleAdd = async () => {
    const trimmed = nueva.trim();
    if (!trimmed || lista.includes(trimmed)) return;
    setLoading(true);
    try {
      await fsSaveUbicacion(trimmed);
      setLista(prev => [...prev, trimmed].sort());
      setNueva('');
    } catch { alert('Error al guardar ubicación.'); }
    setLoading(false);
  };

  const handleDelete = async (u: string) => {
    if (!confirm(`¿Eliminar la ubicación "${u}"?`)) return;
    try {
      await fsDeleteUbicacion(u);
      setLista(prev => prev.filter(x => x !== u));
    } catch { alert('Error al eliminar ubicación.'); }
  };

  const handleEdit = (u: string) => {
    setEditando(u);
    setEditVal(u);
  };

  const handleSaveEdit = async (oldNombre: string) => {
    const newNombre = editVal.trim();
    if (!newNombre || newNombre === oldNombre) { setEditando(null); return; }
    if (lista.includes(newNombre)) { alert('Ya existe una ubicación con ese nombre.'); return; }
    try {
      await fsRenameUbicacion(oldNombre, newNombre);
      setLista(prev => prev.map(x => x === oldNombre ? newNombre : x).sort());
      onRename(oldNombre, newNombre);
      setEditando(null);
    } catch { alert('Error al renombrar ubicación.'); }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-teal-900">Ubicaciones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Define los lugares donde se instalan los equipos</p>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm p-6 max-w-lg">
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="Ej. Bodega Principal, Sala de Almacenamiento"
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={loading || !nueva.trim()}
            className="bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Agregar
          </button>
        </div>
        {lista.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No hay ubicaciones registradas.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lista.map(u => (
              <li key={u} className="flex items-center gap-2 py-2.5">
                {editando === u ? (
                  <>
                    <input
                      autoFocus
                      className="flex-1 border border-teal-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(u); if (e.key === 'Escape') setEditando(null); }}
                    />
                    <button onClick={() => handleSaveEdit(u)} className="text-teal-700 hover:text-teal-900 text-xs font-semibold">Guardar</button>
                    <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancelar</button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm text-gray-800 flex items-center gap-2">📍 {u}</span>
                    <button onClick={() => handleEdit(u)} className="text-teal-600 hover:text-teal-800 text-xs font-semibold">Editar</button>
                    <button onClick={() => handleDelete(u)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Eliminar</button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// ─── Screen 1: Dashboard ──────────────────────────────────────────────────────

interface DashboardProps {
  termos: Termohigrometro[];
  ubicaciones: string[];
  config: AppConfig;
  onConfigSave: (c: AppConfig) => void;
  currentUser: Usuario;
  onView: (t: Termohigrometro) => void;
  onAdd: () => void;
  onEdit: (t: Termohigrometro) => void;
  onDelete: (id: string) => void;
  onLogout: () => void;
  onReport?: () => void;
  onUbicacionRename?: (oldNombre: string, newNombre: string) => void;
  exceptionalDays: string[];
  onExceptionalDaysChange: (days: string[]) => void;
}

function Dashboard({ termos, ubicaciones, config, onConfigSave, currentUser, onView, onAdd, onEdit, onDelete, onLogout, onReport, onUbicacionRename, exceptionalDays, onExceptionalDaysChange }: DashboardProps) {
  const [tab, setTab] = useState<'equipos' | 'reportes' | 'usuarios' | 'ubicaciones' | 'configuracion'>('equipos');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<Usuario | null>(null);
  const [calibrationTermo, setCalibrationTermo] = useState<Termohigrometro | null>(null);
  const isAdmin = currentUser.rol === 'admin';

  const pendingCount = (() => {
    const today = new Date();
    if (!isWorkday(today, exceptionalDays)) return 0;
    return termos.filter(t => {
      const s = todayStatus[t.id];
      if (!s || s.locked) return false;
      return !s.manana || !s.tarde;
    }).length;
  })();
  const [sortBy, setSortBy] = useState<'nombre' | 'ubicacion' | 'tipo'>('nombre');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterUbicacion, setFilterUbicacion] = useState<string | null>(null);
  const [filterTipo, setFilterTipo] = useState<'ambiental' | 'refrigeracion' | null>(null);
  const [todayStatus, setTodayStatus] = useState<Record<string, { manana: boolean; tarde: boolean; locked: boolean }>>({});

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();

    Promise.all(
      termos.map(async t => {
        try {
          const [registro, locked] = await Promise.all([
            fsLoadRegistro(t.id, year, month),
            fsLoadLockedDays(t.id, year, month),
          ]);
          const isLocked = locked.days.has(today);
          let manana = false;
          let tarde = false;
          if (registro) {
            const entry = (registro as { entries: Array<{ dia: number; tempManana: string; tempTarde: string; humManana?: string; humTarde?: string }> })
              .entries?.find((e: { dia: number }) => e.dia === today);
            if (entry) {
              if (t.tipo === 'ambiental') {
                manana = !!entry.tempManana?.trim() && !!entry.humManana?.trim();
                tarde = !!entry.tempTarde?.trim() && !!entry.humTarde?.trim();
              } else {
                manana = !!entry.tempManana?.trim();
                tarde = !!entry.tempTarde?.trim();
              }
            }
          }
          return { id: t.id, manana, tarde, locked: isLocked };
        } catch {
          return { id: t.id, manana: false, tarde: false, locked: false };
        }
      })
    ).then(results => {
      const map: Record<string, { manana: boolean; tarde: boolean; locked: boolean }> = {};
      results.forEach(r => { map[r.id] = { manana: r.manana, tarde: r.tarde, locked: r.locked }; });
      setTodayStatus(map);
    });
  }, [termos]);

  useEffect(() => {
    fsLoadUsuarios().then(setUsuarios).catch(() => {
      alert('Error al cargar usuarios.');
    });
  }, []);

  const handleSaveUser = async (u: Usuario) => {
    try {
      await fsSaveUsuario(u);
      await fsAuthCreateUser(u.email);
      const updated = editUser ? usuarios.map(x => x.id === u.id ? u : x) : [...usuarios, u];
      setUsuarios(updated);
      setUserModalOpen(false);
      setEditUser(null);
    } catch {
      alert('Error al guardar usuario.');
    }
  };

  const handleResetPassword = async (u: Usuario) => {
    if (!u.email || u.email.endsWith('@vivens.local')) {
      alert(`El usuario "${u.nombre}" no tiene un correo real configurado. Edítalo y agrega un correo válido.`);
      return;
    }
    if (!confirm(`¿Enviar email de recuperación de contraseña a ${u.email}?`)) return;
    try {
      await fsSendPasswordReset(u.email);
      alert(`✅ Email enviado a ${u.email}. El usuario recibirá un link para restablecer su contraseña.`);
    } catch {
      alert('Error al enviar el email. Verifica que el correo sea válido.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (id === currentUser.id) { alert('No puedes eliminar tu propio usuario.'); return; }
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await fsDeleteUsuario(id);
      setUsuarios(usuarios.filter(u => u.id !== id));
    } catch {
      alert('Error al eliminar usuario.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100">
      {/* Nav */}
      <nav className="text-white px-6 py-3 flex items-center gap-3 shadow-lg" style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>
        {/* Vivens logo mark mini */}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <svg width="20" height="20" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="22" cy="24" r="12" fill="#f97316" fillOpacity="0.9"/>
            <circle cx="34" cy="24" r="12" fill="white" fillOpacity="0.7"/>
            <circle cx="28" cy="34" r="12" fill="#fb923c" fillOpacity="0.6"/>
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-base leading-tight">VIVENS — Control de Temperatura y Humedad</div>
          <div className="text-xs text-teal-100">Clínica Renal El Puyo — Ecuador</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-white">{currentUser.nombre}</div>
            <div className="text-xs text-teal-200">{currentUser.rol === 'admin' ? '👑 Administrador' : currentUser.rol === 'validador' ? '🔏 Validador' : '👤 Operador'}</div>
          </div>
          {onReport && (
            <button
              onClick={onReport}
              className="relative text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              📊 Reporte
              {pendingCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                  {pendingCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={onLogout}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {/* Tabs — scrollable on mobile */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="overflow-x-auto scrollbar-none">
          <div className="flex gap-1 max-w-6xl mx-auto px-2 min-w-max">
            {(['equipos', 'reportes', ...(isAdmin ? ['usuarios', 'ubicaciones', 'configuracion'] : [])] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t as typeof tab)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
                  tab === t ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'equipos' ? '🌡️ Equipos' : t === 'reportes' ? '📊 Reportes' : t === 'usuarios' ? '👥 Usuarios' : t === 'ubicaciones' ? '📍 Ubicaciones' : '⚙️ Config'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* ─── Reportes tab ─── */}
        {tab === 'reportes' && (
          <>
            {(isAdmin || currentUser.rol === 'validador') && (
              <div className="mb-6 bg-blue-900 rounded-xl p-5 flex items-center justify-between shadow">
                <div>
                  <div className="text-white font-bold text-base">📊 Reporte de Cumplimiento de Horarios</div>
                  <div className="text-blue-200 text-sm mt-1">
                    Verifica si los registros de temperatura se tomaron en el horario establecido por la norma farmacéutica.
                    Exporta a Excel o PDF.
                  </div>
                </div>
                <button
                  onClick={onReport}
                  className="ml-6 shrink-0 bg-white text-blue-900 font-bold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors text-sm"
                >
                  Ver reporte →
                </button>
              </div>
            )}
            <ReportesTab termos={termos} />
          </>
        )}

        {/* ─── Equipos tab ─── */}
        {tab === 'equipos' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-teal-900">Equipos registrados</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {termos.length === 0 ? 'Sin equipos aún' : `${termos.length} equipo${termos.length !== 1 ? 's' : ''}`}
                </p>

              </div>
              {isAdmin && (
                <button
                  onClick={onAdd}
                  className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
                >
                  ➕ Agregar equipo
                </button>
              )}
            </div>
            {termos.length > 0 && (
              <div className="space-y-2 mb-4">
                {/* Row 1: search + view toggle */}
                <div className="flex gap-2 items-center">
                  <input
                    type="search"
                    placeholder="Buscar por nombre…"
                    value={filterSearch}
                    onChange={e => setFilterSearch(e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden shrink-0">
                    <button onClick={() => setViewMode('grid')} title="Vista cuadrícula"
                      className={`px-2.5 py-1.5 transition-colors ${viewMode === 'grid' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                        <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                        <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
                      </svg>
                    </button>
                    <button onClick={() => setViewMode('list')} title="Vista lista"
                      className={`px-2.5 py-1.5 border-l border-gray-200 transition-colors ${viewMode === 'list' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                        <rect x="1" y="2" width="14" height="2.5" rx="1"/><rect x="1" y="6.75" width="14" height="2.5" rx="1"/>
                        <rect x="1" y="11.5" width="14" height="2.5" rx="1"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Row 2: sort + tipo filter + ubicacion filter */}
                <div className="flex gap-2 flex-wrap items-center">
                  {(filterSearch || filterTipo || filterUbicacion) && (
                    <button onClick={() => { setFilterSearch(''); setFilterTipo(null); setFilterUbicacion(null); }}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                      ✕ Limpiar filtros
                    </button>
                  )}
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Ordenar:</span>
                  {(['nombre', 'ubicacion', 'tipo'] as const).map(opt => (
                    <button key={opt} onClick={() => setSortBy(opt)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${sortBy === opt ? 'bg-teal-700 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {opt === 'nombre' ? 'Nombre' : opt === 'ubicacion' ? 'Ubicación' : 'Tipo'}
                    </button>
                  ))}

                  <span className="text-gray-200 mx-1 select-none">|</span>
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Tipo:</span>
                  {([null, 'ambiental', 'refrigeracion'] as const).map(t => (
                    <button key={String(t)} onClick={() => setFilterTipo(t)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterTipo === t ? 'bg-blue-700 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                      {t === null ? 'Todos' : t === 'ambiental' ? '🌡 Ambiente' : '❄️ Refrigeración'}
                    </button>
                  ))}

                  {(() => {
                    const ubicsUnicas = [...new Set(termos.map(t => t.ubicacion).filter(Boolean))].sort();
                    if (ubicsUnicas.length < 2) return null;
                    return <>
                      <span className="text-gray-200 mx-1 select-none">|</span>
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Ubicación:</span>
                      <button onClick={() => setFilterUbicacion(null)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterUbicacion === null ? 'bg-blue-700 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        Todas
                      </button>
                      {ubicsUnicas.map(u => (
                        <button key={u} onClick={() => setFilterUbicacion(filterUbicacion === u ? null : u)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${filterUbicacion === u ? 'bg-blue-700 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          {u}
                        </button>
                      ))}
                    </>;
                  })()}
                </div>
              </div>
            )}
            {(() => {
              const q = filterSearch.trim().toLowerCase();
              const filteredTermos = termos
                .filter(t => !q || t.nombre.toLowerCase().includes(q))
                .filter(t => !filterTipo || t.tipo === filterTipo)
                .filter(t => !filterUbicacion || t.ubicacion === filterUbicacion);
              const sortedTermos = [...filteredTermos].sort((a, b) => {
                if (sortBy === 'nombre') return a.nombre.localeCompare(b.nombre);
                if (sortBy === 'ubicacion') return (a.ubicacion || '').localeCompare(b.ubicacion || '');
                if (sortBy === 'tipo') return a.tipo.localeCompare(b.tipo);
                return 0;
              });
              return termos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-16 h-16 rounded-full bg-teal-100 flex items-center justify-center mb-4 text-3xl">🌡️</div>
                  <h2 className="text-lg font-bold text-teal-900 mb-1">No hay equipos registrados</h2>
                  <p className="text-sm text-gray-500 mb-6 max-w-xs">Agrega tu primer termohigrómetro para comenzar.</p>
                  {isAdmin && (
                    <button onClick={onAdd} className="bg-teal-700 hover:bg-teal-800 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors shadow">
                      Agregar primer equipo
                    </button>
                  )}
                </div>
              ) : sortedTermos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="text-3xl mb-3">🔍</div>
                  <p className="text-sm font-semibold text-gray-600 mb-1">Sin resultados</p>
                  <p className="text-xs text-gray-400">Prueba con otros filtros.</p>
                  <button onClick={() => { setFilterSearch(''); setFilterTipo(null); setFilterUbicacion(null); }}
                    className="mt-3 text-xs text-teal-600 hover:underline">Limpiar filtros</button>
                </div>
              ) : (
                <div className={viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
                  : 'flex flex-col gap-2'
                }>
                  {sortedTermos.map(t => (
                    <TermoCard
                      key={t.id}
                      termo={t}
                      onView={onView}
                      onEdit={isAdmin ? onEdit : undefined}
                      onDelete={isAdmin ? onDelete : undefined}
                      onCalibration={setCalibrationTermo}
                      todayAlert={todayStatus[t.id]}
                      listMode={viewMode === 'list'}
                    />
                  ))}
                </div>
              );
            })()}
          </>
        )}

        {/* ─── Usuarios tab (admin only) ─── */}
        {tab === 'usuarios' && isAdmin && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-teal-900">Usuarios del sistema</h1>
                <p className="text-sm text-gray-500 mt-0.5">{usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => { setEditUser(null); setUserModalOpen(true); }}
                className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors shadow-sm"
              >
                ➕ Nuevo usuario
              </button>
            </div>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-teal-50 text-teal-900 text-xs font-semibold uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Rol</th>
                    <th className="px-4 py-3 text-left">Creado</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.nombre}</td>
                      <td className="px-4 py-3 font-mono text-gray-600">{u.usuario}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${u.rol === 'admin' ? 'bg-amber-100 text-amber-800' : u.rol === 'validador' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'}`}>
                          {u.rol === 'admin' ? '👑 Admin' : u.rol === 'validador' ? '🔏 Validador' : '👤 Operador'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{new Date(u.creadoEn).toLocaleDateString('es-EC')}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => { setEditUser(u); setUserModalOpen(true); }} className="text-teal-600 hover:text-teal-800 text-xs font-semibold mr-3">Editar</button>
                        <button onClick={() => handleResetPassword(u)} className="text-orange-500 hover:text-orange-700 text-xs font-semibold mr-3" title="Enviar email de recuperación">🔑 Reset</button>
                        <button onClick={() => handleDeleteUser(u.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ─── Ubicaciones tab (admin only) ─── */}
        {tab === 'ubicaciones' && isAdmin && (
          <UbicacionesTab
            ubicaciones={ubicaciones}
            onRename={(oldNombre, newNombre) => onUbicacionRename?.(oldNombre, newNombre)}
          />
        )}

        {tab === 'configuracion' && isAdmin && (
          <ConfigTab config={config} onSave={onConfigSave} termos={termos} exceptionalDays={exceptionalDays} onExceptionalDaysChange={onExceptionalDaysChange} />
        )}
      </main>

      {userModalOpen && (
        <UserModal initial={editUser} termos={termos} onSave={handleSaveUser} onCancel={() => { setUserModalOpen(false); setEditUser(null); }} />
      )}
      {calibrationTermo && (
        <CalibrationHistory
          termo={calibrationTermo}
          isAdmin={isAdmin}
          onClose={() => setCalibrationTermo(null)}
        />
      )}
    </div>
  );
}

// ─── Screen 2: Registro mensual ───────────────────────────────────────────────

interface RegistroScreenProps {
  termo: Termohigrometro;
  currentUser: Usuario;
  config: AppConfig;
  onBack: () => void;
}

function RegistroScreen({ termo, currentUser, config, onBack }: RegistroScreenProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthNum = now.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNum);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [loading, setLoading] = useState(true);
  const [monthsWithData, setMonthsWithData] = useState<{ year: number; month: number }[]>([]);

  const isAmbiental = termo.tipo === 'ambiental';

  const defaultHeader = { institucion: config.institucion, estrategia: config.estrategia, establecimiento: config.establecimiento, direccion: config.direccion, noEquipo: termo.numero, anio: String(currentYear), mes: String(currentMonthNum).padStart(2, '0') };

  // ─── Anexo 10 state ───
  const [anexo10, setAnexo10] = useState<Anexo10Data>({
    header: defaultHeader,
    footer: { revisadoPor: termo.revisadoPor || currentUser.nombre, cargo: termo.cargo || '', fecha: '' },
    entries: emptyEntries10(currentYear, currentMonthNum),
  });
  const [lockedDays10, setLockedDays10] = useState<Set<number>>(new Set());
  const [lockedAt10, setLockedAt10] = useState<Record<number, number>>({});
  const [loadedKey10, setLoadedKey10] = useState(`${currentYear}-${String(currentMonthNum).padStart(2, '0')}`);

  // ─── Anexo 11 state ───
  const [anexo11, setAnexo11] = useState<Anexo11Data>({
    header: defaultHeader,
    footer: { revisadoPor: termo.revisadoPor || currentUser.nombre, cargo: termo.cargo || '', fecha: '' },
    entries: emptyEntries11(currentYear, currentMonthNum),
  });
  const [lockedDays11, setLockedDays11] = useState<Set<number>>(new Set());
  const [lockedAt11, setLockedAt11] = useState<Record<number, number>>({});
  const [loadedKey11, setLoadedKey11] = useState(`${currentYear}-${String(currentMonthNum).padStart(2, '0')}`);

  const printRef = useRef<HTMLDivElement>(null);
  // Tracks whether locked days were successfully loaded — prevents a failed
  // load (which leaves lockedDays as empty Set) from overwriting Firestore.
  const lockedDaysReady = useRef(false);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `RPIS_${termo.nombre}_${MESES[selectedMonth - 1]}_${selectedYear}`,
    pageStyle: `
      @page { size: A4 portrait; margin: 8mm; }
      body { background: white !important; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .screen-header { display: none !important; }
      .no-print { display: none !important; }
      .mobile-cards { display: none !important; }
      .print-only { display: block !important; }
      .desktop-table { display: block !important; overflow: visible !important; }
      .desktop-table table { width: 100% !important; min-width: unset !important; border-collapse: collapse !important; table-layout: fixed !important; }
      .desktop-table *, .desktop-table input, .desktop-table span, .desktop-table th, .desktop-table td { font-size: 7px !important; line-height: 1.2 !important; padding: 1px 3px !important; height: auto !important; }
      .desktop-table table th:nth-child(1), .desktop-table table td:nth-child(1) { width: 18px !important; white-space: nowrap; }
      .desktop-table table td:nth-child(2), .desktop-table table td:nth-child(3), .desktop-table table td:nth-child(4), .desktop-table table td:nth-child(5), .desktop-table table td:nth-child(6), .desktop-table table td:nth-child(7) { width: 30px !important; white-space: nowrap; overflow: hidden; }
      .desktop-table table td:nth-child(8) { white-space: normal !important; word-break: break-word; }
      .desktop-table table td:nth-child(9) { white-space: normal !important; }
      .print-container { display: flex !important; flex-direction: column !important; min-height: 277mm !important; }
      .footer-screen { display: none !important; }
      .footer-print { display: flex !important; margin-top: auto !important; }
      .print-charts-row { display: flex !important; flex-direction: row !important; gap: 8px !important; margin-top: 8px !important; page-break-inside: avoid !important; }
      .print-charts-single { display: block !important; margin-top: 8px !important; page-break-inside: avoid !important; }
    `,
  });

  // Initial load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [registro, locked, mwd] = await Promise.all([
          fsLoadRegistro(termo.id, currentYear, currentMonthNum),
          fsLoadLockedDays(termo.id, currentYear, currentMonthNum),
          fsGetMonthsWithData(termo.id),
        ]);
        if (cancelled) return;
        const mesStr = String(currentMonthNum).padStart(2, '0');
        const fallbackHeader = { institucion: config.institucion, estrategia: config.estrategia, establecimiento: config.establecimiento, direccion: config.direccion, noEquipo: termo.numero, anio: String(currentYear), mes: mesStr };
        if (isAmbiental) {
          const base = registro as Anexo10Data | null;
          const rawEntries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries10(currentYear, currentMonthNum);
          const entries = clearUnlockedNombres(rawEntries, locked.days);
          const savedHeader = base?.header;
          const header = {
            // Config fields always win — changing config updates all records
            institucion: config.institucion || savedHeader?.institucion || '',
            estrategia: config.estrategia || savedHeader?.estrategia || '',
            establecimiento: config.establecimiento || savedHeader?.establecimiento || '',
            direccion: config.direccion || savedHeader?.direccion || '',
            noEquipo: savedHeader?.noEquipo || termo.numero,
            anio: savedHeader?.anio || String(currentYear),
            mes: savedHeader?.mes || mesStr,
          };
          const footer = base?.footer ?? { revisadoPor: termo.revisadoPor || currentUser.nombre, cargo: termo.cargo || '', fecha: '' };
          if (!footer.revisadoPor) footer.revisadoPor = currentUser.nombre;
          setAnexo10({ ...(base ?? { header: fallbackHeader, footer }), header, footer, entries });
          setLockedDays10(locked.days);
          setLockedAt10(locked.lockedAt);
        } else {
          const base = registro as Anexo11Data | null;
          const rawEntries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries11(currentYear, currentMonthNum);
          const entries = clearUnlockedNombres(rawEntries, locked.days);
          const savedHeader = base?.header;
          const header = {
            // Config fields always win — changing config updates all records
            institucion: config.institucion || savedHeader?.institucion || '',
            estrategia: config.estrategia || savedHeader?.estrategia || '',
            establecimiento: config.establecimiento || savedHeader?.establecimiento || '',
            direccion: config.direccion || savedHeader?.direccion || '',
            noEquipo: savedHeader?.noEquipo || termo.numero,
            anio: savedHeader?.anio || String(currentYear),
            mes: savedHeader?.mes || mesStr,
          };
          const footer = base?.footer ?? { revisadoPor: termo.revisadoPor || currentUser.nombre, cargo: termo.cargo || '', fecha: '' };
          if (!footer.revisadoPor) footer.revisadoPor = currentUser.nombre;
          setAnexo11({ ...(base ?? { header: fallbackHeader, footer }), header, footer, entries });
          setLockedDays11(locked.days);
          setLockedAt11(locked.lockedAt);
        }
        lockedDaysReady.current = true;
        setMonthsWithData(mwd);
      } catch {
        if (!cancelled) alert('Error al cargar datos. Verifica tu conexión.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync config fields into open headers whenever the admin changes config
  useEffect(() => {
    if (loading) return;
    const configPatch = {
      institucion: config.institucion,
      estrategia: config.estrategia,
      establecimiento: config.establecimiento,
      direccion: config.direccion,
    };
    setAnexo10(prev => ({ ...prev, header: { ...prev.header, ...configPatch } }));
    setAnexo11(prev => ({ ...prev, header: { ...prev.header, ...configPatch } }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.institucion, config.estrategia, config.establecimiento, config.direccion]);

  // Auto-save with debounce
  const debouncedAnexo10 = useDebounce(anexo10, 800);
  const debouncedAnexo11 = useDebounce(anexo11, 800);

  useEffect(() => {
    if (loading) return;
    const y = parseInt(debouncedAnexo10.header.anio);
    const m = parseInt(debouncedAnexo10.header.mes);
    if (!isNaN(y) && !isNaN(m)) {
      fsSaveRegistro(termo.id, y, m, debouncedAnexo10).catch(() => {
        alert('Error al guardar datos de Anexo 10.');
      });
    }
  }, [debouncedAnexo10, termo.id, loading]);

  useEffect(() => {
    if (loading) return;
    const y = parseInt(debouncedAnexo11.header.anio);
    const m = parseInt(debouncedAnexo11.header.mes);
    if (!isNaN(y) && !isNaN(m)) {
      fsSaveRegistro(termo.id, y, m, debouncedAnexo11).catch(() => {
        alert('Error al guardar datos de Anexo 11.');
      });
    }
  }, [debouncedAnexo11, termo.id, loading]);

  useEffect(() => {
    if (!lockedDaysReady.current) return;
    const y = parseInt(anexo10.header.anio);
    const m = parseInt(anexo10.header.mes);
    if (!isNaN(y) && !isNaN(m)) {
      fsSaveLockedDays(termo.id, y, m, lockedDays10, lockedAt10).catch(() => {
        alert('Error al guardar días bloqueados.');
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedDays10, lockedAt10, termo.id]);

  useEffect(() => {
    if (!lockedDaysReady.current) return;
    const y = parseInt(anexo11.header.anio);
    const m = parseInt(anexo11.header.mes);
    if (!isNaN(y) && !isNaN(m)) {
      fsSaveLockedDays(termo.id, y, m, lockedDays11, lockedAt11).catch(() => {
        alert('Error al guardar días bloqueados.');
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedDays11, lockedAt11, termo.id]);

  // Navigation handler — loads data for selected year/month
  const handleNavigate = useCallback(async (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    const mesStr = String(month).padStart(2, '0');
    const newKey = `${year}-${mesStr}`;

    try {
      if (isAmbiental) {
        if (newKey !== loadedKey10) {
          const [registro, locked] = await Promise.all([
            fsLoadRegistro(termo.id, year, month),
            fsLoadLockedDays(termo.id, year, month),
          ]);
          const base = registro as Anexo10Data | null;
          const rawEntries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries10(year, month);
          const entries = clearUnlockedNombres(rawEntries, locked.days);
          const header = { ...(base?.header ?? { institucion: '', estrategia: '', establecimiento: '', direccion: '', noEquipo: '', anio: String(year), mes: mesStr }), anio: String(year), mes: mesStr, noEquipo: base?.header?.noEquipo || termo.numero };
          const footer10 = base?.footer ?? { revisadoPor: termo.revisadoPor || currentUser.nombre, cargo: termo.cargo || '', fecha: '' };
          if (!footer10.revisadoPor) footer10.revisadoPor = currentUser.nombre;
          setAnexo10({ ...(base ?? { header, footer: footer10 }), header, footer: footer10, entries });
          setLockedDays10(locked.days);
          setLockedAt10(locked.lockedAt);
          setLoadedKey10(newKey);
          lockedDaysReady.current = true;
        }
      } else {
        if (newKey !== loadedKey11) {
          const [registro, locked] = await Promise.all([
            fsLoadRegistro(termo.id, year, month),
            fsLoadLockedDays(termo.id, year, month),
          ]);
          const base = registro as Anexo11Data | null;
          const rawEntries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries11(year, month);
          const entries = clearUnlockedNombres(rawEntries, locked.days);
          const header = { ...(base?.header ?? { institucion: '', estrategia: '', establecimiento: '', direccion: '', noEquipo: '', anio: String(year), mes: mesStr }), anio: String(year), mes: mesStr, noEquipo: base?.header?.noEquipo || termo.numero };
          const footer11 = base?.footer ?? { revisadoPor: termo.revisadoPor || currentUser.nombre, cargo: termo.cargo || '', fecha: '' };
          if (!footer11.revisadoPor) footer11.revisadoPor = currentUser.nombre;
          setAnexo11({ ...(base ?? { header, footer: footer11 }), header, footer: footer11, entries });
          setLockedDays11(locked.days);
          setLockedAt11(locked.lockedAt);
          setLoadedKey11(newKey);
          lockedDaysReady.current = true;
        }
      }
    } catch {
      alert('Error al cargar datos del mes seleccionado.');
    }

    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, [isAmbiental, loadedKey10, loadedKey11, termo.id, termo.numero]);

  const handleHeader10Change = useCallback(async (header: Anexo10Data['header']) => {
    const newKey = `${header.anio}-${header.mes}`;
    if (newKey !== loadedKey10) {
      const y = parseInt(header.anio);
      const m = parseInt(header.mes);
      try {
        const [registro, locked] = await Promise.all([
          fsLoadRegistro(termo.id, y, m),
          fsLoadLockedDays(termo.id, y, m),
        ]);
        const base = registro as Anexo10Data | null;
        const entries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries10(y, m);
        setAnexo10({ ...(base ?? { header, footer: { revisadoPor: '', cargo: '', fecha: '' } }), header, entries });
        setLockedDays10(locked.days);
        setLockedAt10(locked.lockedAt);
        setLoadedKey10(newKey);
        setSelectedYear(y);
        setSelectedMonth(m);
      } catch {
        alert('Error al cargar datos del mes.');
      }
    } else {
      setAnexo10(prev => ({ ...prev, header }));
    }
  }, [loadedKey10, termo.id]);

  const handleHeader11Change = useCallback(async (header: Anexo11Data['header']) => {
    const newKey = `${header.anio}-${header.mes}`;
    if (newKey !== loadedKey11) {
      const y = parseInt(header.anio);
      const m = parseInt(header.mes);
      try {
        const [registro, locked] = await Promise.all([
          fsLoadRegistro(termo.id, y, m),
          fsLoadLockedDays(termo.id, y, m),
        ]);
        const base = registro as Anexo11Data | null;
        const entries = (base?.entries && base.entries.length > 0) ? base.entries : emptyEntries11(y, m);
        setAnexo11({ ...(base ?? { header, footer: { revisadoPor: '', cargo: '', fecha: '' } }), header, entries });
        setLockedDays11(locked.days);
        setLockedAt11(locked.lockedAt);
        setLoadedKey11(newKey);
        setSelectedYear(y);
        setSelectedMonth(m);
      } catch {
        alert('Error al cargar datos del mes.');
      }
    } else {
      setAnexo11(prev => ({ ...prev, header }));
    }
  }, [loadedKey11, termo.id]);

  const year10 = parseInt(anexo10.header.anio);
  const month10 = parseInt(anexo10.header.mes);
  const year11 = parseInt(anexo11.header.anio);
  const month11 = parseInt(anexo11.header.mes);

  const mesNombre = MESES[selectedMonth - 1];
  const verifyUrl = `https://hgp-an.vercel.app/?verify=${termo.id}_${selectedYear}_${String(selectedMonth).padStart(2, '0')}`;

  // Wrap lock changes to also record the timestamp when a day is locked
  const handleLockChange10 = useCallback((newDays: Set<number>) => {
    setLockedAt10(prev => {
      const next = { ...prev };
      newDays.forEach(d => { if (!lockedDays10.has(d)) next[d] = Date.now(); });
      lockedDays10.forEach(d => { if (!newDays.has(d)) delete next[d]; });
      return next;
    });
    setLockedDays10(newDays);
  }, [lockedDays10]);

  const handleLockChange11 = useCallback((newDays: Set<number>) => {
    setLockedAt11(prev => {
      const next = { ...prev };
      newDays.forEach(d => { if (!lockedDays11.has(d)) next[d] = Date.now(); });
      lockedDays11.forEach(d => { if (!newDays.has(d)) delete next[d]; });
      return next;
    });
    setLockedDays11(newDays);
  }, [lockedDays11]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex flex-col">
      {/* Top nav */}
      <nav className="bg-blue-900 text-white px-6 py-3 flex items-center gap-3 shadow-lg no-print z-50 relative">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0"
          title="Volver al menú principal"
        >
          ← Menú
        </button>
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-xs shrink-0">R</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm leading-tight truncate">
            {termo.nombre}{termo.numero ? ` · N° ${termo.numero}` : ''}
          </div>
          <div className="text-xs text-blue-200 truncate">
            <span className={isAmbiental ? 'text-blue-300' : 'text-teal-300'}>
              {isAmbiental ? 'Anexo 10 — Ambiente' : 'Anexo 11 — Refrigeración'}
            </span>
            {' · '}{currentUser.nombre}
          </div>
        </div>
        {/* Print / PDF button */}
        <button
          onClick={() => handlePrint()}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shrink-0 no-print"
          title="Imprimir / Exportar PDF"
        >
          🖨️ Imprimir
        </button>
      </nav>

      <div className="flex flex-1 relative no-print">
        {/* Sidebar */}
        <Sidebar
          termo={termo}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onNavigate={handleNavigate}
          onBack={onBack}
          monthsWithData={monthsWithData}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
        />

        {/* Main content — shifts right when sidebar is open on desktop */}
        <main
          className={`flex-1 px-4 md:px-6 py-6 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'ml-0'}`}
          style={{ paddingLeft: sidebarOpen ? undefined : '3.5rem' }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-blue-600">Cargando...</p>
            </div>
          ) : (
            <>
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
                <div ref={printRef} className="bg-white rounded-xl shadow-md p-6 print-container">
                  <PrintHeader
                    title="ANEXO 10 — REGISTRO DE TEMPERATURA Y HUMEDAD AMBIENTAL"
                    subtitle="Almacén / Bodega Farmacéutica"
                    header={anexo10.header}
                    verifyUrl={verifyUrl}
                    diasConfirmados={lockedDays10.size}
                    totalDias={anexo10.entries.length}
                  />
                  <HeaderForm
                    data={anexo10.header}
                    onChange={handleHeader10Change}
                    equipoLabel="No. Termohigrómetro"
                    anexoTitle="ANEXO 10 — REGISTRO DE TEMPERATURA Y HUMEDAD AMBIENTAL"
                    anexoSubtitle="Almacén / Bodega Farmacéutica"
                    lockedFields={(['institucion','estrategia','establecimiento','direccion','noEquipo'] as const).filter(k => k === 'noEquipo' || !!config[k as keyof AppConfig])}
                  />
                  <Anexo10Table
                    entries={anexo10.entries}
                    onChange={entries => setAnexo10(prev => ({ ...prev, entries }))}
                    footer={anexo10.footer}
                    onFooterChange={footer => setAnexo10(prev => ({ ...prev, footer }))}
                    lockedDays={lockedDays10}
                    onLockedDaysChange={handleLockChange10}
                    currentUserName={currentUser.nombre}
                    canUnlock={currentUser.rol === 'admin' || currentUser.rol === 'validador'}
                  />
                  <Anexo10Chart
                    entries={anexo10.entries}
                    year={year10}
                    month={month10}
                  />
                </div>
              ) : (
                <div ref={printRef} className="bg-white rounded-xl shadow-md p-6 print-container">
                  <PrintHeader
                    title="ANEXO 11 — REGISTRO DE TEMPERATURA DE REFRIGERACIÓN"
                    subtitle="Almacén / Cadena de Frío Farmacéutica"
                    header={anexo11.header}
                    verifyUrl={verifyUrl}
                    diasConfirmados={lockedDays11.size}
                    totalDias={anexo11.entries.length}
                  />
                  <HeaderForm
                    data={anexo11.header}
                    onChange={handleHeader11Change}
                    equipoLabel="No. Equipo de Refrigeración"
                    anexoTitle="ANEXO 11 — REGISTRO DE TEMPERATURA DE REFRIGERACIÓN"
                    anexoSubtitle="Almacén / Cadena de Frío Farmacéutica"
                    lockedFields={(['institucion','estrategia','establecimiento','direccion','noEquipo'] as const).filter(k => k === 'noEquipo' || !!config[k as keyof AppConfig])}
                  />
                  <Anexo11Table
                    entries={anexo11.entries}
                    onChange={entries => setAnexo11(prev => ({ ...prev, entries }))}
                    footer={anexo11.footer}
                    onFooterChange={footer => setAnexo11(prev => ({ ...prev, footer }))}
                    lockedDays={lockedDays11}
                    onLockedDaysChange={handleLockChange11}
                    currentUserName={currentUser.nombre}
                    canUnlock={currentUser.rol === 'admin' || currentUser.rol === 'validador'}
                  />
                  <Anexo11Chart
                    entries={anexo11.entries}
                    year={year11}
                    month={month11}
                  />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [currentUser, setCurrentUser] = useState<Usuario | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [termos, setTermos] = useState<Termohigrometro[]>([]);
  const [ubicaciones, setUbicaciones] = useState<string[]>([]);
  const [exceptionalDays, setExceptionalDays] = useState<string[]>([]);

  // Wait for Firebase Auth to initialize, then restore session
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const saved = getSession();
        if (saved) {
          setCurrentUser(saved);
          setAuthReady(true);
        } else {
          const email = firebaseUser.email ?? '';
          const usuario = email.includes('@vivens.local')
            ? email.replace('@vivens.local', '')
            : email.split('@')[0];
          fsGetUsuarioByLogin(usuario)
            .then((found) => {
              if (found) { setSession(found); setCurrentUser(found); }
            })
            .finally(() => setAuthReady(true));
        }
      } else {
        setCurrentUser(null);
        setAuthReady(true);
      }
    });
    return unsub;
  }, []);

  const [appConfig, setAppConfig] = useState<AppConfig>({ institucion: '', estrategia: '', establecimiento: '', direccion: '' });

  // Load data only after Firebase Auth is ready and user is logged in
  useEffect(() => {
    if (!authReady || !currentUser) return;
    fsLoadTermos().then(setTermos).catch(() => {
      alert('Error al cargar equipos. Verifica tu conexión.');
    });
    fsLoadUbicaciones().then(setUbicaciones).catch(() => {});
    fsLoadConfig().then(setAppConfig).catch(() => {});
    fsLoadExceptionalDays().then(setExceptionalDays).catch(() => {});
  }, [authReady, currentUser?.id]);

  // Visible termos: admin sees all, operador/validador see only assigned ones
  const visibleTermos = currentUser
    ? currentUser.rol === 'admin'
      ? termos
      : termos.filter(t => currentUser.termosAsignados.includes(t.id))
    : [];
  const [selectedTermo, setSelectedTermo] = useState<Termohigrometro | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Termohigrometro | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Push a history entry when entering a sub-screen so the browser back
  // button returns to the dashboard instead of leaving the app.
  useEffect(() => {
    if (showReport || selectedTermo) {
      window.history.pushState({ screen: 'sub' }, '');
    }
  }, [showReport, selectedTermo]);

  useEffect(() => {
    const handlePop = () => {
      if (showReport) setShowReport(false);
      else if (selectedTermo) setSelectedTermo(null);
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [showReport, selectedTermo]);

  const handleLogin = (user: Usuario) => setCurrentUser(user);

  const handleLogout = async () => {
    await fsAuthLogout();
    setSession(null);
    setCurrentUser(null);
    setSelectedTermo(null);
  };

  const handleSaveTermo = async (t: Termohigrometro) => {
    try {
      await fsSaveTermo(t);
      const updated = editTarget ? termos.map(x => x.id === t.id ? t : x) : [...termos, t];
      setTermos(updated);
      setModalOpen(false);
      setEditTarget(null);
    } catch {
      alert('Error al guardar equipo.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este equipo y todos sus registros?')) return;
    try {
      await fsDeleteTermo(id);
      setTermos(termos.filter(t => t.id !== id));
    } catch {
      alert('Error al eliminar equipo.');
    }
  };

  // Check for public URL params
  const urlParams = new URLSearchParams(window.location.search);
  const verifyParam = urlParams.get('verify');
  if (verifyParam) {
    return <VerificationPage verifyParam={verifyParam} />;
  }
  if (urlParams.get('publico') === '1') {
    return <PublicReportPage />;
  }

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium opacity-80">Iniciando sesión...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (selectedTermo) {
    return (
      <RegistroScreen
        termo={selectedTermo}
        currentUser={currentUser}
        config={appConfig}
        onBack={() => setSelectedTermo(null)}
      />
    );
  }

  if (showReport && (currentUser.rol === 'admin' || currentUser.rol === 'validador')) {
    return (
      <ComplianceReport
        termos={visibleTermos}
        onBack={() => setShowReport(false)}
      />
    );
  }

  return (
    <>
      <Dashboard
        termos={visibleTermos}
        ubicaciones={ubicaciones}
        config={appConfig}
        onConfigSave={setAppConfig}
        currentUser={currentUser}
        onView={setSelectedTermo}
        onAdd={() => { setEditTarget(null); setModalOpen(true); }}
        onEdit={t => { setEditTarget(t); setModalOpen(true); }}
        onDelete={handleDelete}
        onLogout={handleLogout}
        onReport={currentUser.rol !== 'operador' ? () => setShowReport(true) : undefined}
        onUbicacionRename={(oldNombre, newNombre) => {
          setTermos(prev => prev.map(t => t.ubicacion === oldNombre ? { ...t, ubicacion: newNombre } : t));
          setUbicaciones(prev => prev.map(u => u === oldNombre ? newNombre : u));
        }}
        exceptionalDays={exceptionalDays}
        onExceptionalDaysChange={setExceptionalDays}
      />
      {modalOpen && (
        <TermoModal
          initial={editTarget}
          ubicaciones={ubicaciones}
          onSave={handleSaveTermo}
          onCancel={() => { setModalOpen(false); setEditTarget(null); }}
        />
      )}
    </>
  );
}
