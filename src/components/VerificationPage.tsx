import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Termohigrometro, Anexo10Data, Anexo11Data, MESES } from '../types';
import { fsLoadRegistroPublic, fsLoadTermoPublic } from '../utils/firestore';

interface Props {
  verifyParam: string; // e.g. "termoId_2026_06"
}

export default function VerificationPage({ verifyParam }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [termo, setTermo] = useState<Termohigrometro | null>(null);
  const [registro, setRegistro] = useState<Anexo10Data | Anexo11Data | null>(null);
  const [lockedCount, setLockedCount] = useState(0);

  useEffect(() => {
    // Parse "termoId_year_month" — termoId may contain underscores so split from the end
    const parts = verifyParam.split('_');
    if (parts.length < 3) { setError('Código de verificación inválido.'); setLoading(false); return; }
    const month = parseInt(parts[parts.length - 1]);
    const year = parseInt(parts[parts.length - 2]);
    const termoId = parts.slice(0, parts.length - 2).join('_');
    if (!termoId || isNaN(year) || isNaN(month)) { setError('Código de verificación inválido.'); setLoading(false); return; }

    Promise.all([
      fsLoadTermoPublic(termoId),
      fsLoadRegistroPublic(termoId, year, month),
    ]).then(([t, r]) => {
      setTermo(t);
      setRegistro(r);
      if (r) {
        // Count entries with at least one temperature value as a proxy for "filled"
        const entries = r.entries as Array<{ tempManana?: string; tempTarde?: string }>;
        setLockedCount(entries.filter(e => e.tempManana?.trim() || e.tempTarde?.trim()).length);
      }
      setLoading(false);
    }).catch(() => {
      setError('No se pudo verificar el documento. Es posible que se requiera acceso autorizado.');
      setLoading(false);
    });
  }, [verifyParam]);

  const verifyUrl = `https://hgp-an.vercel.app/?verify=${verifyParam}`;
  const parts2 = verifyParam.split('_');
  const month2 = parseInt(parts2[parts2.length - 1]);
  const year2 = parseInt(parts2[parts2.length - 2]);
  const mesNombre = MESES[month2 - 1] ?? '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 flex items-center gap-4" style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>
          <svg width="44" height="44" viewBox="0 0 56 56" fill="none">
            <circle cx="28" cy="28" r="27" stroke="white" strokeWidth="2" fill="white" fillOpacity="0.1"/>
            <circle cx="22" cy="24" r="10" fill="#f97316" fillOpacity="0.9"/>
            <circle cx="34" cy="24" r="10" fill="white" fillOpacity="0.7"/>
            <circle cx="28" cy="33" r="10" fill="#fb923c" fillOpacity="0.6"/>
          </svg>
          <div>
            <div className="text-white font-bold text-base leading-tight">VIVENS — Verificación de Documento</div>
            <div className="text-teal-100 text-xs mt-0.5">Clínica Renal El Puyo</div>
          </div>
        </div>

        <div className="px-6 py-6">
          {loading && <p className="text-center text-gray-500 py-8">Verificando documento...</p>}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-2xl mb-2">⚠️</div>
              <p className="text-red-700 font-semibold text-sm">{error}</p>
              <p className="text-red-500 text-xs mt-1">Código: {verifyParam}</p>
            </div>
          )}
          {!loading && !error && (
            <>
              {/* Verified badge */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-4 py-1.5">
                  <span className="text-teal-600 font-bold text-sm">✓ Documento verificado</span>
                </div>
              </div>

              {/* Summary cards */}
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Equipo</div>
                  <div className="font-bold text-teal-900">{termo?.nombre ?? '—'}</div>
                  {termo?.numero && <div className="text-xs text-gray-500 mt-0.5">N° {termo.numero}</div>}
                  {termo?.ubicacion && <div className="text-xs text-gray-500">📍 {termo.ubicacion}</div>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Período</div>
                    <div className="font-bold text-teal-900">{mesNombre} {year2}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Registros</div>
                    <div className="font-bold text-teal-900">{lockedCount} días con datos</div>
                  </div>
                </div>
                {registro?.footer && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Responsable</div>
                    <div className="font-semibold text-gray-800">{registro.footer.revisadoPor || '—'}</div>
                    {registro.footer.cargo && <div className="text-xs text-gray-500">{registro.footer.cargo}</div>}
                  </div>
                )}
              </div>

              {/* QR */}
              <div className="flex flex-col items-center gap-2 mt-5 pt-5 border-t border-gray-100">
                <QRCodeSVG value={verifyUrl} size={96} level="M" />
                <p className="text-xs text-gray-400 text-center">Este código QR verifica la autenticidad de este documento</p>
              </div>
            </>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs text-teal-700 opacity-60">© Clínica Renal El Puyo – VIVENS · Desarrollado por Alex Naranjo</p>
    </div>
  );
}
