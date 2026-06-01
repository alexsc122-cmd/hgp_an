import React from 'react';
import { Anexo10Data, Anexo11Data, MESES } from '../types';
import { calcProm, monthlyAverage, isOutOfRangeTemp10, isOutOfRangeHum10, isOutOfRangeTemp11 } from '../utils/calculations';

function cellStyle(outOfRange: boolean): React.CSSProperties {
  return outOfRange ? { backgroundColor: '#fee2e2', color: '#b91c1c', fontWeight: 600 } : {};
}

interface PrintView10Props {
  data: Anexo10Data;
}

export function PrintView10({ data }: PrintView10Props) {
  const { header, footer, entries } = data;
  const mesNombre = MESES[parseInt(header.mes) - 1] || header.mes;

  const avgTempM = monthlyAverage(entries.map(e => e.tempManana));
  const avgTempT = monthlyAverage(entries.map(e => e.tempTarde));
  const avgTempP = monthlyAverage(entries.map(e => calcProm(e.tempManana, e.tempTarde)));
  const avgHumM = monthlyAverage(entries.map(e => e.humManana));
  const avgHumT = monthlyAverage(entries.map(e => e.humTarde));
  const avgHumP = monthlyAverage(entries.map(e => calcProm(e.humManana, e.humTarde)));

  const thStyle: React.CSSProperties = {
    border: '1px solid #93c5fd',
    padding: '4px 6px',
    backgroundColor: '#dbeafe',
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
    color: '#1e3a8a',
  };
  const tdStyle: React.CSSProperties = {
    border: '1px solid #bfdbfe',
    padding: '3px 4px',
    fontSize: 10,
    textAlign: 'center',
  };
  const tdLeftStyle: React.CSSProperties = { ...tdStyle, textAlign: 'left' };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24, color: '#1e293b' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
          Red Pública Integral de Salud — Ecuador
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>
          ANEXO 10 — REGISTRO DE TEMPERATURA Y HUMEDAD AMBIENTAL
        </div>
      </div>

      {/* Institution info */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 10 }}>
        <tbody>
          <tr>
            <td style={{ padding: '2px 6px', fontWeight: 600, width: '20%' }}>Institución:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8', width: '30%' }}>{header.institucion}</td>
            <td style={{ padding: '2px 6px', fontWeight: 600, width: '20%' }}>Estrategia / Programa:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8', width: '30%' }}>{header.estrategia}</td>
          </tr>
          <tr>
            <td style={{ padding: '2px 6px', fontWeight: 600 }}>Establecimiento:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8' }}>{header.establecimiento}</td>
            <td style={{ padding: '2px 6px', fontWeight: 600 }}>Dirección:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8' }}>{header.direccion}</td>
          </tr>
          <tr>
            <td style={{ padding: '2px 6px', fontWeight: 600 }}>No. Termohigrómetro:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8' }}>{header.noEquipo}</td>
            <td style={{ padding: '2px 6px', fontWeight: 600 }}>Año / Mes:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8' }}>{header.anio} / {mesNombre}</td>
          </tr>
        </tbody>
      </table>

      {/* Main table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle} rowSpan={2}>DÍA</th>
            <th style={thStyle} colSpan={3}>TEMPERATURA (°C) — MÁX 30°C</th>
            <th style={thStyle} colSpan={3}>HUMEDAD (%) — MÁX 70%</th>
            <th style={thStyle} rowSpan={2}>NOMBRE / FIRMA RESPONSABLE</th>
            <th style={thStyle} rowSpan={2}>OBSERVACIONES</th>
          </tr>
          <tr>
            <th style={thStyle}>MAÑANA</th>
            <th style={thStyle}>TARDE</th>
            <th style={thStyle}>PROM</th>
            <th style={thStyle}>MAÑANA</th>
            <th style={thStyle}>TARDE</th>
            <th style={thStyle}>PROM</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const tProm = calcProm(e.tempManana, e.tempTarde);
            const hProm = calcProm(e.humManana, e.humTarde);
            const rowBg = i % 2 === 0 ? '#ffffff' : '#f0f9ff';
            return (
              <tr key={e.dia} style={{ backgroundColor: rowBg }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{e.dia}</td>
                <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp10(e.tempManana)) }}>{e.tempManana}</td>
                <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp10(e.tempTarde)) }}>{e.tempTarde}</td>
                <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp10(tProm)) }}>{tProm}</td>
                <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeHum10(e.humManana)) }}>{e.humManana}</td>
                <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeHum10(e.humTarde)) }}>{e.humTarde}</td>
                <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeHum10(hProm)) }}>{hProm}</td>
                <td style={tdLeftStyle}>{e.nombre}</td>
                <td style={tdLeftStyle}>{e.observaciones}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#bfdbfe' }}>
            <td style={{ ...tdStyle, fontWeight: 700 }}>PROM MES</td>
            <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp10(avgTempM)) }}>{avgTempM}</td>
            <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp10(avgTempT)) }}>{avgTempT}</td>
            <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp10(avgTempP)) }}>{avgTempP}</td>
            <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeHum10(avgHumM)) }}>{avgHumM}</td>
            <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeHum10(avgHumT)) }}>{avgHumT}</td>
            <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeHum10(avgHumP)) }}>{avgHumP}</td>
            <td style={tdStyle}></td>
            <td style={tdStyle}></td>
          </tr>
        </tfoot>
      </table>

      {/* Footer */}
      <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 10 }}>
        <tbody>
          <tr>
            <td style={{ width: '33%', padding: '4px 8px' }}>
              <div style={{ fontWeight: 600 }}>Revisado por:</div>
              <div style={{ borderBottom: '1px solid #94a3b8', minHeight: 18, paddingBottom: 2 }}>{footer.revisadoPor}</div>
            </td>
            <td style={{ width: '33%', padding: '4px 8px' }}>
              <div style={{ fontWeight: 600 }}>Cargo:</div>
              <div style={{ borderBottom: '1px solid #94a3b8', minHeight: 18, paddingBottom: 2 }}>{footer.cargo}</div>
            </td>
            <td style={{ width: '33%', padding: '4px 8px' }}>
              <div style={{ fontWeight: 600 }}>Fecha:</div>
              <div style={{ borderBottom: '1px solid #94a3b8', minHeight: 18, paddingBottom: 2 }}>{footer.fecha}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

interface PrintView11Props {
  data: Anexo11Data;
}

export function PrintView11({ data }: PrintView11Props) {
  const { header, footer, entries } = data;
  const mesNombre = MESES[parseInt(header.mes) - 1] || header.mes;

  const avgTempM = monthlyAverage(entries.map(e => e.tempManana));
  const avgTempT = monthlyAverage(entries.map(e => e.tempTarde));
  const avgTempP = monthlyAverage(entries.map(e => calcProm(e.tempManana, e.tempTarde)));

  const thStyle: React.CSSProperties = {
    border: '1px solid #93c5fd',
    padding: '4px 6px',
    backgroundColor: '#dbeafe',
    fontSize: 10,
    fontWeight: 700,
    textAlign: 'center',
    color: '#1e3a8a',
  };
  const tdStyle: React.CSSProperties = {
    border: '1px solid #bfdbfe',
    padding: '3px 4px',
    fontSize: 10,
    textAlign: 'center',
  };
  const tdLeftStyle: React.CSSProperties = { ...tdStyle, textAlign: 'left' };

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: 24, color: '#1e293b' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1 }}>
          Red Pública Integral de Salud — Ecuador
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#1e3a8a' }}>
          ANEXO 11 — REGISTRO DE TEMPERATURA DE REFRIGERACIÓN
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10, fontSize: 10 }}>
        <tbody>
          <tr>
            <td style={{ padding: '2px 6px', fontWeight: 600, width: '20%' }}>Institución:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8', width: '30%' }}>{header.institucion}</td>
            <td style={{ padding: '2px 6px', fontWeight: 600, width: '20%' }}>Estrategia / Programa:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8', width: '30%' }}>{header.estrategia}</td>
          </tr>
          <tr>
            <td style={{ padding: '2px 6px', fontWeight: 600 }}>Establecimiento:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8' }}>{header.establecimiento}</td>
            <td style={{ padding: '2px 6px', fontWeight: 600 }}>Dirección:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8' }}>{header.direccion}</td>
          </tr>
          <tr>
            <td style={{ padding: '2px 6px', fontWeight: 600 }}>No. Equipo:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8' }}>{header.noEquipo}</td>
            <td style={{ padding: '2px 6px', fontWeight: 600 }}>Año / Mes:</td>
            <td style={{ padding: '2px 6px', borderBottom: '1px solid #94a3b8' }}>{header.anio} / {mesNombre}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle} rowSpan={2}>DÍA</th>
            <th style={thStyle} colSpan={3}>TEMPERATURA DE REFRIGERACIÓN (°C) — RANGO 2–8°C</th>
            <th style={thStyle} rowSpan={2}>NOMBRE / FIRMA RESPONSABLE</th>
            <th style={thStyle} rowSpan={2}>OBSERVACIONES</th>
          </tr>
          <tr>
            <th style={thStyle}>MAÑANA</th>
            <th style={thStyle}>TARDE</th>
            <th style={thStyle}>PROM</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            const tProm = calcProm(e.tempManana, e.tempTarde);
            const rowBg = i % 2 === 0 ? '#ffffff' : '#f0f9ff';
            return (
              <tr key={e.dia} style={{ backgroundColor: rowBg }}>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{e.dia}</td>
                <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp11(e.tempManana)) }}>{e.tempManana}</td>
                <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp11(e.tempTarde)) }}>{e.tempTarde}</td>
                <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp11(tProm)) }}>{tProm}</td>
                <td style={tdLeftStyle}>{e.nombre}</td>
                <td style={tdLeftStyle}>{e.observaciones}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#bfdbfe' }}>
            <td style={{ ...tdStyle, fontWeight: 700 }}>PROM MES</td>
            <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp11(avgTempM)) }}>{avgTempM}</td>
            <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp11(avgTempT)) }}>{avgTempT}</td>
            <td style={{ ...tdStyle, ...cellStyle(isOutOfRangeTemp11(avgTempP)) }}>{avgTempP}</td>
            <td style={tdStyle}></td>
            <td style={tdStyle}></td>
          </tr>
        </tfoot>
      </table>

      <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse', fontSize: 10 }}>
        <tbody>
          <tr>
            <td style={{ width: '33%', padding: '4px 8px' }}>
              <div style={{ fontWeight: 600 }}>Revisado por:</div>
              <div style={{ borderBottom: '1px solid #94a3b8', minHeight: 18, paddingBottom: 2 }}>{footer.revisadoPor}</div>
            </td>
            <td style={{ width: '33%', padding: '4px 8px' }}>
              <div style={{ fontWeight: 600 }}>Cargo:</div>
              <div style={{ borderBottom: '1px solid #94a3b8', minHeight: 18, paddingBottom: 2 }}>{footer.cargo}</div>
            </td>
            <td style={{ width: '33%', padding: '4px 8px' }}>
              <div style={{ fontWeight: 600 }}>Fecha:</div>
              <div style={{ borderBottom: '1px solid #94a3b8', minHeight: 18, paddingBottom: 2 }}>{footer.fecha}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
