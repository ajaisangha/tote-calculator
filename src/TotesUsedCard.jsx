import React from "react";

export default function TotesUsedCard({
  rows,
  routesInfo,
  grandTotals,
  duplicateMessage,
  onFileChange,
  clearAll
}) {
  return (
    <section className="data-card adaptive-card">
      <h2 className="data-title">Totes Used</h2>
      <div className="file-controls">
        <input type="file" accept=".csv" multiple onChange={onFileChange} />
        <button onClick={clearAll} disabled={rows.length === 0} className="clear-btn">
          Clear uploaded data
        </button>
      </div>
      {duplicateMessage && <p className="duplicate-warning">{duplicateMessage}</p>}
      {Object.keys(routesInfo).length === 0 ? (
        <p className="no-data">No data available yet.</p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Route</th>
                <th>Consignments</th>
                <th>Ambient</th>
                <th>Chilled</th>
                <th>Freezer</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(routesInfo).map(([route, data], i) => (
                <tr key={i}>
                  <td>{route}</td>
                  <td>{data.rows.length}</td>
                  <td>{data.totals.ambient}</td>
                  <td>{data.totals.chilled}</td>
                  <td>{data.totals.freezer}</td>
                  <td className="bold">{data.totals.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="grand-totals">
            <h3>Grand Totals</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ambient</th>
                  <th>Chilled</th>
                  <th>Freezer</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{grandTotals.ambient}</td>
                  <td>{grandTotals.chilled}</td>
                  <td>{grandTotals.freezer}</td>
                  <td className="bold">{grandTotals.total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
