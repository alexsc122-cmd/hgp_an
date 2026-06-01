import { useRef } from 'react';
import { exportAllData, importAllData } from '../utils/storage';

interface Props {
  onImported: () => void;
}

export default function DataStorageBar({ onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importAllData(file);
      alert('Respaldo importado correctamente. La página se recargará.');
      onImported();
    } catch (err: unknown) {
      alert('Error al importar: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      // Reset file input
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="no-print flex flex-wrap items-center gap-3 mb-4 px-4 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
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
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-green-100 border border-green-300 text-green-800 text-xs font-semibold transition-colors shadow-sm"
        >
          ↑ Importar respaldo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
    </div>
  );
}
