import React from "react";

export default function BaggedTotesCard({
  receivedAmbient, receivedChill,
  currentAmbient, currentChill,
  setReceivedAmbient, setReceivedChill,
  setCurrentAmbient, setCurrentChill,
  baggedAmbient, baggedChill, totalBagged
}) {
  return (
    <section className="data-card bagged-card">
      <h2 className="data-title">Bagged Totes</h2>

      <div className="bagged-fields">
        <div className="bagged-row">
          <span>Ambient totes received:</span>
          <input
            type="number"
            value={receivedAmbient}
            onChange={(e) => setReceivedAmbient(e.target.value)}
          />
        </div>
        <div className="bagged-row">
          <span>Chill totes received:</span>
          <input
            type="number"
            value={receivedChill}
            onChange={(e) => setReceivedChill(e.target.value)}
          />
        </div>
        <div className="bagged-row">
          <span>Current totes in hive bagged ambient:</span>
          <input
            type="number"
            value={currentAmbient}
            onChange={(e) => setCurrentAmbient(e.target.value)}
          />
        </div>
        <div className="bagged-row">
          <span>Current totes in hive bagged chill:</span>
          <input
            type="number"
            value={currentChill}
            onChange={(e) => setCurrentChill(e.target.value)}
          />
        </div>
      </div>

      <div className="bagged-result">
        <div className="result-line">
          <span>Bagged Ambient Totes:</span>
          <span>{baggedAmbient}</span>
        </div>
        <div className="result-line">
          <span>Bagged Chill Totes:</span>
          <span>{baggedChill}</span>
        </div>
        <div className="result-line">
          <span>Total Bagged Totes:</span>
          <span>{totalBagged}</span>
        </div>
      </div>
    </section>
  );
}
