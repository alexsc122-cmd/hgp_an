import { QRCodeSVG } from 'qrcode.react';
import { HeaderInfo, MESES } from '../types';

interface Props {
  title: string;
  subtitle: string;
  header: HeaderInfo;
  verifyUrl: string;
  diasConfirmados: number;
  totalDias: number;
}

export default function PrintHeader({ title, subtitle, header, verifyUrl, diasConfirmados, totalDias }: Props) {
  const mesNombre = MESES[parseInt(header.mes) - 1] ?? header.mes;

  return (
    <div className="print-only mb-4">
      {/* Top header: logo + title */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #0f766e', paddingBottom: '8px', marginBottom: '8px' }}>
        {/* Logo */}
        <div style={{ marginRight: '16px', flexShrink: 0 }}>
          <svg width="48" height="48" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="27" stroke="#0f766e" strokeWidth="2" fill="white"/>
            <circle cx="22" cy="24" r="10" fill="#f97316" fillOpacity="0.9"/>
            <circle cx="34" cy="24" r="10" fill="#0d9488" fillOpacity="0.7"/>
            <circle cx="28" cy="33" r="10" fill="#fb923c" fillOpacity="0.6"/>
          </svg>
        </div>
        {/* Title block */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', color: '#0f766e', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Clínica Renal El Puyo — VIVENS
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#134e4a', marginTop: '2px' }}>{title}</div>
          <div style={{ fontSize: '10px', color: '#0f766e', marginTop: '1px' }}>{subtitle}</div>
        </div>
        {/* QR Code */}
        <div style={{ flexShrink: 0, textAlign: 'center', marginLeft: '16px' }}>
          <QRCodeSVG value={verifyUrl} size={64} level="M" />
          <div style={{ fontSize: '7px', color: '#6b7280', marginTop: '2px' }}>Verificar documento</div>
        </div>
      </div>

      {/* Info grid */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
        <tbody>
          <tr>
            {[
              ['INSTITUCIÓN', header.institucion],
              ['ESTRATEGIA / PROGRAMA / PROYECTO', header.estrategia],
              ['ESTABLECIMIENTO', header.establecimiento],
              ['DIRECCIÓN', header.direccion],
            ].map(([label, value]) => (
              <td key={label} style={{ border: '1px solid #99f6e4', padding: '4px 6px', verticalAlign: 'top', width: '25%' }}>
                <div style={{ fontSize: '7px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '9px', color: '#134e4a', marginTop: '2px', fontWeight: 500 }}>{value || '—'}</div>
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ border: '1px solid #99f6e4', padding: '4px 6px' }} colSpan={2}>
              <div style={{ fontSize: '7px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>No. Equipo</div>
              <div style={{ fontSize: '9px', color: '#134e4a', fontWeight: 500, marginTop: '2px' }}>{header.noEquipo || '—'}</div>
            </td>
            <td style={{ border: '1px solid #99f6e4', padding: '4px 6px' }}>
              <div style={{ fontSize: '7px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>Año</div>
              <div style={{ fontSize: '9px', color: '#134e4a', fontWeight: 500, marginTop: '2px' }}>{header.anio}</div>
            </td>
            <td style={{ border: '1px solid #99f6e4', padding: '4px 6px' }}>
              <div style={{ fontSize: '7px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase' }}>Mes</div>
              <div style={{ fontSize: '9px', color: '#134e4a', fontWeight: 500, marginTop: '2px' }}>{mesNombre}</div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Completeness badge */}
      <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          background: diasConfirmados === totalDias ? '#f0fdf4' : '#fefce8',
          border: `1px solid ${diasConfirmados === totalDias ? '#86efac' : '#fde68a'}`,
          borderRadius: '4px', padding: '2px 8px', fontSize: '8px', fontWeight: 600,
          color: diasConfirmados === totalDias ? '#166534' : '#92400e'
        }}>
          {diasConfirmados === totalDias ? '✓' : '!'} {diasConfirmados}/{totalDias} días confirmados
        </div>
        <div style={{ fontSize: '7px', color: '#9ca3af' }}>
          Verificar autenticidad: {verifyUrl}
        </div>
      </div>
    </div>
  );
}
