import React, { useState } from "react";
import "./App.css";

export default function PickCalculatorCard() {
  const [ambientPickers, setAmbientPickers] = useState("");
  const [chillPickers, setChillPickers] = useState("");
  const [ambientUPH, setAmbientUPH] = useState("");
  const [chillUPH, setChillUPH] = useState("");
  const [ambientOutstanding, setAmbientOutstanding] = useState("");
  const [chillOutstanding, setChillOutstanding] = useState("");

  const calculateProjected = (uph, pickers) =>
    (parseFloat(uph) || 0) * (parseFloat(pickers) || 0);

  const ambientProjected = calculateProjected(ambientUPH, ambientPickers);
  const chillProjected = calculateProjected(chillUPH, chillPickers);

  const calculateFinishTime = (outstanding, projected) => {
    if (!projected || projected === 0) return "-";

    const hoursNeeded = outstanding / projected;
    const now = new Date();

    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Convert to 24hr for AM times (2:25 AM = 2, 3:05 AM = 3)
    const reference225 = 2 * 60 + 25;
    const reference305 = 3 * 60 + 5;
    const currentMins = currentHours * 60 + currentMinutes;

    let baseTime = new Date(now);
    if (currentMins < reference225) {
      // before 2:25 AM → add 45 mins later
      baseTime.setMinutes(baseTime.getMinutes() + 45);
    } else if (currentMins >= reference225 && currentMins < reference305) {
      // between 2:25 and 3:05 → assume 3:05 AM
      baseTime.setHours(3, 5, 0, 0);
    } // if >3:05 AM → no adjustment

    const finishTime = new Date(baseTime.getTime() + hoursNeeded * 60 * 60 * 1000);

    const hours = finishTime.getHours();
    const minutes = finishTime.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinutes = minutes.toString().padStart(2, "0");

    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const ambientFinish = calculateFinishTime(parseFloat(ambientOutstanding) || 0, ambientProjected);
  const chillFinish = calculateFinishTime(parseFloat(chillOutstanding) || 0, chillProjected);

  const clearAll = () => {
    setAmbientPickers("");
    setChillPickers("");
    setAmbientUPH("");
    setChillUPH("");
    setAmbientOutstanding("");
    setChillOutstanding("");
  };

  return (
    <section className="data-card pick-card">
      <h2 className="data-title">Pick Calculator</h2>
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Zone</th>
              <th>Pickers</th>
              <th>UPH</th>
              <th>Outstanding Picks</th>
              <th>Projected Hourly Picks</th>
              <th>Finishing At</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Ambient</td>
              <td>
                <input
                  type="number"
                  value={ambientPickers}
                  onChange={(e) => setAmbientPickers(e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={ambientUPH}
                  onChange={(e) => setAmbientUPH(e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={ambientOutstanding}
                  onChange={(e) => setAmbientOutstanding(e.target.value)}
                />
              </td>
              <td>{ambientProjected || 0}</td>
              <td>{ambientFinish}</td>
            </tr>
            <tr>
              <td>Chill</td>
              <td>
                <input
                  type="number"
                  value={chillPickers}
                  onChange={(e) => setChillPickers(e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={chillUPH}
                  onChange={(e) => setChillUPH(e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  value={chillOutstanding}
                  onChange={(e) => setChillOutstanding(e.target.value)}
                />
              </td>
              <td>{chillProjected || 0}</td>
              <td>{chillFinish}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="button-row">
        <button onClick={clearAll} className="clear-btn">Clear</button>
      </div>
    </section>
  );
}
