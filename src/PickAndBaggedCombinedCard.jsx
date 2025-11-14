import React, { useState, useEffect } from "react";
import { db } from "./firebase";
import { doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import "./App.css";

const PICK_BAGGED_DOC = doc(db, "totes", "pickAndBagged");

export default function PickAndBaggedCombinedCard() {
  // --- Bagged Totes State ---
  const [currentAmbient, setCurrentAmbient] = useState("");
  const [currentChill, setCurrentChill] = useState("");
  const [neededAmbient, setNeededAmbient] = useState("");
  const [neededChill, setNeededChill] = useState("");
  const [resultAmbient, setResultAmbient] = useState(null);
  const [resultChill, setResultChill] = useState(null);

  // --- Pick Calculator State ---
  const [ambientPickers, setAmbientPickers] = useState("");
  const [chillPickers, setChillPickers] = useState("");
  const [ambientUPH, setAmbientUPH] = useState("");
  const [chillUPH, setChillUPH] = useState("");
  const [ambientOutstanding, setAmbientOutstanding] = useState("");
  const [chillOutstanding, setChillOutstanding] = useState("");

  // Load data from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(PICK_BAGGED_DOC, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentAmbient(data.currentAmbient || "");
        setCurrentChill(data.currentChill || "");
        setNeededAmbient(data.neededAmbient || "");
        setNeededChill(data.neededChill || "");
        setResultAmbient(data.resultAmbient || null);
        setResultChill(data.resultChill || null);

        setAmbientPickers(data.ambientPickers || "");
        setChillPickers(data.chillPickers || "");
        setAmbientUPH(data.ambientUPH || "");
        setChillUPH(data.chillUPH || "");
        setAmbientOutstanding(data.ambientOutstanding || "");
        setChillOutstanding(data.chillOutstanding || "");
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Helper Functions ---
  const calculateProjected = (uph, pickers) => (parseFloat(uph) || 0) * (parseFloat(pickers) || 0);

  const calculateFinishTime = (outstanding, projected) => {
  if (!projected || projected === 0) return "-";

  const now = new Date();

  // Extract today's date parts
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();

  // Create today's 2:25 AM and 3:10 AM timestamps
  const time225 = new Date(year, month, day, 2, 25, 0);
  const time310 = new Date(year, month, day, 3, 10, 0);

  // Calculate hours needed
  const hoursNeeded = outstanding / projected; // no buffer yet

  let finishTime;

  // BEFORE 2:25 AM → add 45 minutes buffer
  if (now < time225) {
    finishTime = new Date(now.getTime() + hoursNeeded * 3600000 + 45 * 60000);
  }

  // AFTER 3:10 AM → no buffer
  else if (now > time310) {
    finishTime = new Date(now.getTime() + hoursNeeded * 3600000);
  }

  // BETWEEN 2:25 and 3:10 → lock start time at 3:10 AM
  else {
    finishTime = new Date(time310.getTime() + hoursNeeded * 3600000);
  }

  // Format AM/PM display
  const hours = finishTime.getHours();
  const minutes = finishTime.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes.toString().padStart(2, "0");

  return `${displayHours}:${displayMinutes} ${ampm}`;
};


  // --- Bagged Totes Actions ---
  const calculateBaggedTotes = async () => {
    const ambient = (parseInt(currentAmbient, 10) || 0) - (parseInt(neededAmbient, 10) || 0);
    const chill = (parseInt(currentChill, 10) || 0) - (parseInt(neededChill, 10) || 0);
    setResultAmbient(ambient);
    setResultChill(chill);
    await setDoc(PICK_BAGGED_DOC, { currentAmbient, currentChill, neededAmbient, neededChill, resultAmbient: ambient, resultChill: chill }, { merge: true });
  };

  const clearBaggedTotes = async () => {
    setCurrentAmbient(""); setCurrentChill(""); setNeededAmbient(""); setNeededChill("");
    setResultAmbient(null); setResultChill(null);
    await setDoc(PICK_BAGGED_DOC, { currentAmbient: "", currentChill: "", neededAmbient: "", neededChill: "", resultAmbient: null, resultChill: null }, { merge: true });
  };

  // --- Pick Calculator Actions ---
  const calculatePickCalculator = async () => {
    await setDoc(PICK_BAGGED_DOC, { ambientPickers, chillPickers, ambientUPH, chillUPH, ambientOutstanding, chillOutstanding }, { merge: true });
  };

  const clearPickCalculator = async () => {
    setAmbientPickers(""); setChillPickers("");
    setAmbientUPH(""); setChillUPH("");
    setAmbientOutstanding(""); setChillOutstanding("");
    await setDoc(PICK_BAGGED_DOC, { ambientPickers: "", chillPickers: "", ambientUPH: "", chillUPH: "", ambientOutstanding: "", chillOutstanding: "" }, { merge: true });
  };

  // --- Calculated Values ---
  const ambientProjected = calculateProjected(ambientUPH, ambientPickers);
  const chillProjected = calculateProjected(chillUPH, chillPickers);
  const ambientFinish = calculateFinishTime(parseFloat(ambientOutstanding) || 0, ambientProjected);
  const chillFinish = calculateFinishTime(parseFloat(chillOutstanding) || 0, chillProjected);

  return (
    <section className="data-card pick-bagged-card">

      {/* --- Pick Calculator --- */}
      <h2 className="data-title">Pick Calculator</h2>
      <div className="table-container" style={{ marginTop: 24 }}>
        <table className="data-table pick-table">
          <thead>
            <tr>
              <th>Zone</th>
              <th>Pickers</th>
              <th>UPH</th>
              <th>Outstanding</th>
              <th>Projected Hourly Picks</th>
              <th>Finishing At</th>
            </tr>
          </thead>
          <tbody>
            {[
              { zone: "Ambient", pickers: ambientPickers, uph: ambientUPH, outstanding: ambientOutstanding, setPickers: setAmbientPickers, setUPH: setAmbientUPH, setOutstanding: setAmbientOutstanding, projected: ambientProjected, finish: ambientFinish },
              { zone: "Chill", pickers: chillPickers, uph: chillUPH, outstanding: chillOutstanding, setPickers: setChillPickers, setUPH: setChillUPH, setOutstanding: setChillOutstanding, projected: chillProjected, finish: chillFinish },
            ].map((row, i) => (
              <tr key={i}>
                <td>{row.zone}</td>
                <td><input type="number" value={row.pickers} onChange={e => row.setPickers(e.target.value)} className="picker-input" /></td>
                <td><input type="number" value={row.uph} onChange={e => row.setUPH(e.target.value)} className="uph-input" /></td>
                <td><input type="number" value={row.outstanding} onChange={e => row.setOutstanding(e.target.value)} className="outstanding-input" /></td>
                <td>{row.projected}</td>
                <td>{row.finish}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 8 }}>
          <button className="calculate-btn" onClick={calculatePickCalculator}>Save Pick Calculator</button>
          <button className="clear-btn" onClick={clearPickCalculator}>Clear Pick Calculator</button>
        </div>
      </div>

      <h2 className="data-title">Current Bagged Totes</h2>
      {/* --- Bagged Totes --- */}
      <div className="bagged-fields">
        {[
          { label: "Current totes ambient:", value: currentAmbient, setter: setCurrentAmbient },
          { label: "Current totes chill:", value: currentChill, setter: setCurrentChill },
          { label: "Totes needed ambient:", value: neededAmbient, setter: setNeededAmbient },
          { label: "Totes needed chill:", value: neededChill, setter: setNeededChill },
        ].map((field, i) => (
          <div key={i} className="bagged-row">
            <span>{field.label}</span>
            <input type="number" value={field.value} onChange={e => field.setter(e.target.value)} className="bagged-input" />
          </div>
        ))}
        <div style={{ marginTop: 8 }}>
          <button className="calculate-btn" onClick={calculateBaggedTotes}>Calculate & Save Bagged Totes</button>
          <button className="clear-btn" onClick={clearBaggedTotes}>Clear Bagged Totes</button>
        </div>
        
        {resultAmbient !== null && resultChill !== null && (
          <div className="bagged-result">
            <div className="result-line">
              <span>Ambient after pick:</span> <span>{resultAmbient}</span>
            </div>
            <div className="result-line">
              <span>Chill after pick:</span> <span>{resultChill}</span>
            </div>
          </div>
        )}
      </div>

    </section>
  );
}
