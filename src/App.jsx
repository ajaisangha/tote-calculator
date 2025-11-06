import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

// --- Firebase Config ---
const firebaseConfig = {
  apiKey: "AIzaSyDbGd7qUUDgLo3HsrbsCbK8GySajQeKFu0",
  authDomain: "tote-calculator.firebaseapp.com",
  projectId: "tote-calculator",
  storageBucket: "tote-calculator.firebasestorage.app",
  messagingSenderId: "256755403923",
  appId: "1:256755403923:web:1931c6e83190d77eaa1166",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const DATA_DOC = doc(db, "totes", "data");

// --- Header Component ---
function Header() {
  return (
    <header
      style={{
        width: "100%",
        background: "#1e293b",
        color: "white",
        textAlign: "center",
        padding: "16px 0",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 1000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "24px" }}>Totes Calculator</h1>
    </header>
  );
}

// --- Main App ---
export default function App() {
  const [rows, setRows] = useState([]); // each row: {consignment, ambient, chilled, freezer}
  const [loading, setLoading] = useState(true);
  const [grandTotals, setGrandTotals] = useState({ ambient: 0, chilled: 0, freezer: 0, total: 0 });
  const [consignmentSet, setConsignmentSet] = useState(new Set());

  // --- Parse totes from cell
  const parseToteCell = (cell) => {
    if (!cell && cell !== 0) return 0;
    const str = String(cell).trim();
    if (str === "") return 0;
    const matches = str.match(/-?\d+/g);
    if (!matches) return 0;
    const nums = matches.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
    return nums.length ? Math.max(...nums.map(Math.abs)) : 0;
  };

  // --- Get CSV column keys
  const getColumnKeys = (headers) => {
    const pickCol = (pattern) => headers.find((h) => new RegExp(pattern, "i").test(h));
    return {
      ambientKey: pickCol("Completed\\s*Totes.*Ambient") || pickCol("ambient"),
      chilledKey: pickCol("Completed\\s*Totes.*Chill") || pickCol("chill|chilled"),
      freezerKey: pickCol("Completed\\s*Totes.*Freezer") || pickCol("freezer"),
      consignmentKey: pickCol("Consignment") || pickCol("consignment"),
    };
  };

  // --- Real-time Firestore listener ---
  useEffect(() => {
    const unsubscribe = onSnapshot(DATA_DOC, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const savedRows = data.rows || [];
        setRows(savedRows);
        setConsignmentSet(new Set(savedRows.map((r) => r.consignment)));

        // Calculate totals
        const totals = { ambient: 0, chilled: 0, freezer: 0, total: 0 };
        savedRows.forEach((r) => {
          totals.ambient += r.ambient;
          totals.chilled += r.chilled;
          totals.freezer += r.freezer;
        });
        totals.total = totals.ambient + totals.chilled + totals.freezer;
        setGrandTotals(totals);
      } else {
        setRows([]);
        setConsignmentSet(new Set());
        setGrandTotals({ ambient: 0, chilled: 0, freezer: 0, total: 0 });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- Handle CSV Upload ---
  const handleFiles = (files) => {
    const arr = Array.from(files);
    arr.forEach((file) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim(),
        complete: async (results) => {
          const dataRows = results.data;
          if (!dataRows.length) return;

          const headers = Object.keys(dataRows[0]);
          const { ambientKey, chilledKey, freezerKey, consignmentKey } = getColumnKeys(headers);

          const newRows = [];
          const newConsignments = new Set(consignmentSet);

          dataRows.forEach((r) => {
            const consignment = (r[consignmentKey] || "").trim();
            if (!consignment || newConsignments.has(consignment)) return;

            newConsignments.add(consignment);
            newRows.push({
              consignment,
              ambient: ambientKey ? parseToteCell(r[ambientKey]) : 0,
              chilled: chilledKey ? parseToteCell(r[chilledKey]) : 0,
              freezer: freezerKey ? parseToteCell(r[freezerKey]) : 0,
            });
          });

          if (newRows.length) {
            const updatedRows = [...rows, ...newRows];
            try {
              await setDoc(DATA_DOC, { rows: updatedRows });
            } catch (err) {
              console.error("Firestore upload error:", err);
            }
          }
        },
      });
    });
  };

  const onFileChange = (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    handleFiles(files);
    e.target.value = null;
  };

  const clearAll = async () => {
    try {
      await deleteDoc(DATA_DOC);
    } catch (err) {
      console.error("Firestore clear error:", err);
    }
  };

  if (loading) return <p style={{ marginTop: 120, textAlign: "center" }}>Loading...</p>;

  return (
    <div>
      <Header />
      <main style={{ display: "flex", marginTop: 100 }}>
        <section
          style={{
            flex: 1,
            padding: 32,
            paddingTop: 32,
            marginTop: 24,
            marginLeft: 24,
            background: "white",
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h2 style={{ fontSize: 22, marginBottom: 16 }}>Totes Used</h2>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
            <input type="file" accept=".csv" multiple onChange={onFileChange} />
            <button
              onClick={clearAll}
              disabled={rows.length === 0}
              style={{ padding: "8px 12px" }}
            >
              Clear uploaded data
            </button>
          </div>

          {rows.length === 0 ? (
            <p style={{ color: "#777" }}>No data available yet.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ padding: 8 }}>Consignment</th>
                    <th style={{ padding: 8 }}>Ambient</th>
                    <th style={{ padding: 8 }}>Chilled</th>
                    <th style={{ padding: 8 }}>Freezer</th>
                    <th style={{ padding: 8 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={i}
                      style={{ background: i % 2 === 0 ? "#fafafa" : "#fff" }}
                    >
                      <td style={{ padding: 8 }}>{r.consignment}</td>
                      <td style={{ padding: 8 }}>{r.ambient}</td>
                      <td style={{ padding: 8 }}>{r.chilled}</td>
                      <td style={{ padding: 8 }}>{r.freezer}</td>
                      <td style={{ padding: 8, fontWeight: 600 }}>
                        {r.ambient + r.chilled + r.freezer}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 style={{ marginTop: 24 }}>Grand Totals</h3>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ padding: 8 }}>Ambient</th>
                    <th style={{ padding: 8 }}>Chilled</th>
                    <th style={{ padding: 8 }}>Freezer</th>
                    <th style={{ padding: 8 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ background: "#fafafa" }}>
                    <td style={{ padding: 8 }}>{grandTotals.ambient}</td>
                    <td style={{ padding: 8 }}>{grandTotals.chilled}</td>
                    <td style={{ padding: 8 }}>{grandTotals.freezer}</td>
                    <td style={{ padding: 8, fontWeight: 600 }}>{grandTotals.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
