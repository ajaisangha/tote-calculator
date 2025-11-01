// App.jsx — updated: show duplicates with first occurrence and default to 'Spoke'
import React, { useState, useRef } from 'react';
import Papa from 'papaparse';

export default function App() {
  const [routesInfo, setRoutesInfo] = useState({});
  const [grandTotals, setGrandTotals] = useState({ ambient: 0, chilled: 0, freezer: 0 });
  const globalConsignments = useRef(new Set());

  function parseToteCell(cell) {
    if (!cell && cell !== 0) return 0;
    const str = String(cell).trim();
    if (str === '') return 0;
    const matches = str.match(/-?\d+/g);
    if (!matches) return 0;
    const nums = matches.map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
    if (nums.length === 0) return 0;
    return Math.max(...nums.map(n => Math.abs(n)));
  }

  function computeTotalsFromRows(rows, seenGlobal) {
    let ambient = 0, chilled = 0, freezer = 0;
    let duplicateCount = 0;
    const seenConsignments = new Set();

    const processedRows = [];
    rows.forEach(r => {
      const consignment = (r['Consignment'] || r['consignment'] || r['CONSignment'] || '').trim();
      if (!consignment) {
        processedRows.push(r);
        return;
      }
      if (seenConsignments.has(consignment) || seenGlobal.has(consignment)) {
        duplicateCount++;
        processedRows.push(r); // include with first occurrence logic handled outside
        return;
      }
      seenConsignments.add(consignment);
      seenGlobal.add(consignment);
      processedRows.push(r);
    });

    const headers = processedRows.length > 0 ? Object.keys(processedRows[0]) : [];
    const pickCol = (pattern) => headers.find(h => new RegExp(pattern, 'i').test(h));
    const ambientKey = pickCol('Completed\\s*Totes.*Ambient') || pickCol('ambient');
    const chilledKey = pickCol('Completed\\s*Totes.*Chilled') || pickCol('chill|chilled');
    const freezerKey = pickCol('Completed\\s*Totes.*Freezer') || pickCol('freezer');

    processedRows.forEach(r => {
      if (ambientKey) ambient += parseToteCell(r[ambientKey]);
      if (chilledKey) chilled += parseToteCell(r[chilledKey]);
      if (freezerKey) freezer += parseToteCell(r[freezerKey]);
    });

    return { ambient, chilled, freezer, duplicateCount, rowsCount: rows.length };
  }

  function getRouteName(row) {
    let dispatch = row['Dispatch time'] || row['dispatch time'] || row['Dispatch Time'] || '';
    const shipment = row['Shipment'] || row['shipment'] || '';
    if (/route-/i.test(shipment)) return 'Vans';

    const timeMatch = dispatch.match(/(\d{1,2}:\d{2})/);
    const dispatchTime = timeMatch ? timeMatch[1] : null;

    if (!dispatchTime) return 'Spoke';

    if (['11:15', '11:16', '11:17'].includes(dispatchTime)) return 'Ottawa Spoke';
    if (dispatchTime === '2:30') return 'Etobicoke Spoke 1';
    if (dispatchTime === '3:00') return 'Etobicoke Spoke 2';
    if (dispatchTime === '5:30') return 'Etobicoke Spoke 3';
    if (dispatchTime === '8:45') return 'Etobicoke Spoke 4';
    if (dispatchTime === '9:15') return 'Etobicoke Spoke 5';

    return 'Spoke';
  }

  function handleFiles(files) {
    const arr = Array.from(files);
    arr.forEach(file => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: h => h.trim(),
        complete: (results) => {
          const rows = results.data;
          const newRoutesInfo = { ...routesInfo };

          rows.forEach(r => {
            const route = getRouteName(r);
            if (!route) return;
            const totals = computeTotalsFromRows([r], globalConsignments.current);

            if (!newRoutesInfo[route]) {
              newRoutesInfo[route] = { totals: { ...totals }, rows: [r] };
            } else {
              newRoutesInfo[route].totals.ambient += totals.ambient;
              newRoutesInfo[route].totals.chilled += totals.chilled;
              newRoutesInfo[route].totals.freezer += totals.freezer;
              newRoutesInfo[route].totals.duplicateCount += totals.duplicateCount;
              newRoutesInfo[route].rows.push(r);
            }
          });

          setRoutesInfo(newRoutesInfo);
          const newGrand = Object.values(newRoutesInfo).reduce((acc, cur) => {
            acc.ambient += cur.totals.ambient;
            acc.chilled += cur.totals.chilled;
            acc.freezer += cur.totals.freezer;
            return acc;
          }, { ambient: 0, chilled: 0, freezer: 0 });
          setGrandTotals(newGrand);
        },
        error: (err) => {
          console.error('Failed to parse', file.name, err);
          alert(`Failed to parse ${file.name}: ${err}`);
        }
      });
    });
  }

  function onFileChange(e) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleFiles(files);
    e.target.value = null;
  }

  function clearAll() {
    setRoutesInfo({});
    setGrandTotals({ ambient: 0, chilled: 0, freezer: 0 });
    globalConsignments.current.clear();
  }

  return (
    <div style={{ fontFamily: 'system-ui, Arial', padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24 }}>Totes Calculator</h1>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
        <input type="file" accept=".csv" multiple onChange={onFileChange} />
        <button onClick={clearAll} disabled={Object.keys(routesInfo).length === 0} style={{ padding: '8px 12px' }}>
          Clear uploaded data
        </button>
      </div>

      <section style={{ marginTop: 20, borderTop: '1px solid #eee', paddingTop: 16 }}>
        <h2 style={{ fontSize: 18 }}>Routes</h2>
        {Object.keys(routesInfo).length === 0 && <p style={{ color: '#777' }}>No data available yet.</p>}
        {Object.keys(routesInfo).length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                <th style={{ padding: '8px' }}>Route</th>
                <th style={{ padding: '8px' }}>Ambient totes</th>
                <th style={{ padding: '8px' }}>Chilled totes</th>
                <th style={{ padding: '8px' }}>Freezer totes</th>
                <th style={{ padding: '8px' }}>Duplicates included</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(routesInfo).map(([route, data], i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px' }}>{route}</td>
                  <td style={{ padding: '8px' }}>{data.totals.ambient}</td>
                  <td style={{ padding: '8px' }}>{data.totals.chilled}</td>
                  <td style={{ padding: '8px' }}>{data.totals.freezer}</td>
                  <td style={{ padding: '8px', color: data.totals.duplicateCount > 0 ? 'orange' : '#666' }}>
                    {data.totals.duplicateCount > 0 ? `${data.totals.duplicateCount} duplicate${data.totals.duplicateCount>1?'s':''} ` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 700 }}>
                <td style={{ padding: '8px' }}>Grand totals</td>
                <td style={{ padding: '8px' }}>{grandTotals.ambient}</td>
                <td style={{ padding: '8px' }}>{grandTotals.chilled}</td>
                <td style={{ padding: '8px' }}>{grandTotals.freezer}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        )}
      </section>
    </div>
  );
}
