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
    <div className="print-only" style={{ marginBottom: '6px' }}>
      {/* Top row: logo + title + QR — compact */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #0f766e', paddingBottom: '5px', marginBottom: '5px' }}>
        {/* Logo smaller */}
        <div style={{ marginRight: '10px', flexShrink: 0 }}>
          <svg width="36" height="36" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="28" cy="28" r="27" stroke="#0f766e" strokeWidth="2" fill="white"/>
            <circle cx="22" cy="24" r="10" fill="#f97316" fillOpacity="0.9"/>
            <circle cx="34" cy="24" r="10" fill="#0d9488" fillOpacity="0.7"/>
            <circle cx="28" cy="33" r="10" fill="#fb923c" fillOpacity="0.6"/>
          </svg>
        </div>
        {/* Title block */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '9px', color: '#0f766e', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Clínica Renal El Puyo — VIVENS
          </div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#134e4a', marginTop: '2px', lineHeight: 1.2 }}>{title}</div>
          <div style={{ fontSize: '9px', color: '#0f766e', marginTop: '2px' }}>{subtitle}</div>
        </div>
        {/* QR Code — smaller */}
        <div style={{ flexShrink: 0, textAlign: 'center', marginLeft: '12px' }}>
          <QRCodeSVG value={verifyUrl} size={52} level="M" />
          <div style={{ fontSize: '6px', color: '#6b7280', marginTop: '1px' }}>Verificar autenticidad</div>
        </div>
      </div>

      {/* Info grid — single row, all 6 fields */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
        <tbody>
          <tr>
            {[
              ['INSTITUCIÓN', header.institucion, '22%'],
              ['ESTRATEGIA / PROG. / PROYECTO', header.estrategia, '22%'],
              ['ESTABLECIMIENTO', header.establecimiento, '18%'],
              ['DIRECCIÓN', header.direccion, '18%'],
              ['NO. EQUIPO', header.noEquipo, '9%'],
              ['AÑO', header.anio, '5%'],
              ['MES', mesNombre, '6%'],
            ].map(([label, value, width]) => (
              <td key={label} style={{ border: '1px solid #99f6e4', padding: '4px 6px', verticalAlign: 'top', width }}>
                <div style={{ fontSize: '7px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                <div style={{ fontSize: '10px', color: '#134e4a', marginTop: '2px', fontWeight: 700 }}>{value || '—'}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Status bar */}
      <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          background: diasConfirmados === totalDias ? '#f0fdf4' : '#fefce8',
          border: `1px solid ${diasConfirmados === totalDias ? '#86efac' : '#fde68a'}`,
          borderRadius: '3px', padding: '1px 6px', fontSize: '7px', fontWeight: 700,
          color: diasConfirmados === totalDias ? '#166534' : '#92400e'
        }}>
          {diasConfirmados === totalDias ? '✓ Completo' : `! ${diasConfirmados}/${totalDias} días confirmados`}
        </div>
        <div style={{ fontSize: '6.5px', color: '#9ca3af' }}>
          Verificar en: {verifyUrl}
        </div>
      </div>
    </div>
  );
}
