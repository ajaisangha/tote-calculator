import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, deleteDoc } from "firebase/firestore";
import "./App.css";
import CurrentBaggedTotesCard from "./CurrentBaggedTotesCard";
import TotesUsedCard from "./TotesUsedCard";
import BaggedTotesCard from "./BaggedTotesCard";
import PickCalculatorCard from "./PickCalculatorCard";
import PickAndBaggedCombinedCard from "./PickAndBaggedCombinedCard";


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

// --- Header ---
function Header() {
  return (
    <header className="header">
      <h1 className="header-title">Calculator</h1>
    </header>
  );
}

// --- Helpers ---
function parseToteCell(cell) {
  if (!cell && cell !== 0) return 0;
  const str = String(cell).trim();
  if (str === "") return 0;
  const matches = str.match(/-?\d+/g);
  if (!matches) return 0;
  const nums = matches.map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
  return nums.length ? Math.max(...nums.map(Math.abs)) : 0;
}

function getColumnKeys(headers) {
  const pickCol = (pattern) => headers.find((h) => new RegExp(pattern, "i").test(h));
  return {
    consignmentKey: pickCol("Consignment") || pickCol("consignment"),
    ambientKey: pickCol("Completed\\s*Totes.*Ambient") || pickCol("ambient"),
    chilledKey: pickCol("Completed\\s*Totes.*Chill") || pickCol("chill|chilled"),
    freezerKey: pickCol("Completed\\s*Totes.*Freezer") || pickCol("freezer"),
    shipmentKey: pickCol("Shipment") || pickCol("shipment"),
    dispatchKey: pickCol("Dispatch time") || pickCol("dispatch time") || pickCol("Dispatch Time"),
  };
}

function getRouteName(row, shipmentKey, dispatchKey) {
  const shipment = row[shipmentKey] || "";
  const dispatch = row[dispatchKey] || "";
  if (/route-/i.test(shipment)) return "Vans";
  const timeMatch = dispatch.match(/(\d{1,2}:\d{2})/);
  const dispatchTime = timeMatch ? timeMatch[1] : null;
  if (!dispatchTime) return "Spoke";
  if (["11:15","11:16","11:17"].includes(dispatchTime)) return "Ottawa";
  if (dispatchTime==="2:30") return "Etobicoke 1";
  if (dispatchTime==="3:00") return "Etobicoke 2";
  if (dispatchTime==="5:30") return "Etobicoke 3";
  if (dispatchTime==="8:45") return "Etobicoke 4";
  if (dispatchTime==="9:15") return "Etobicoke 5";
  return "Spoke";
}

// --- Main App ---
export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [consignmentSet, setConsignmentSet] = useState(new Set());
  const [routesInfo, setRoutesInfo] = useState({});
  const [grandTotals, setGrandTotals] = useState({ ambient:0, chilled:0, freezer:0, total:0 });
  const [duplicateMessage, setDuplicateMessage] = useState("");

  // Bagged Totes state
  const [receivedAmbient, setReceivedAmbient] = useState("");
  const [receivedChill, setReceivedChill] = useState("");
  const [currentAmbient, setCurrentAmbient] = useState("");
  const [currentChill, setCurrentChill] = useState("");

  // Firestore real-time sync
  useEffect(() => {
    const unsubscribe = onSnapshot(DATA_DOC, (docSnap) => {
      if(docSnap.exists()){
        const savedRows = docSnap.data().rows || [];
        setRows(savedRows);
        setConsignmentSet(new Set(savedRows.map(r=>r.consignment)));
        const routeMap = {};
        let grand={ambient:0,chilled:0,freezer:0,total:0};
        savedRows.forEach(r=>{
          if(!routeMap[r.route]) routeMap[r.route]={totals:{ambient:0,chilled:0,freezer:0,total:0}, rows:[]};
          routeMap[r.route].totals.ambient += r.ambient;
          routeMap[r.route].totals.chilled += r.chilled;
          routeMap[r.route].totals.freezer += r.freezer;
          routeMap[r.route].totals.total += r.ambient+r.chilled+r.freezer;
          routeMap[r.route].rows.push(r);
          grand.ambient+=r.ambient;
          grand.chilled+=r.chilled;
          grand.freezer+=r.freezer;
        });
        grand.total = grand.ambient + grand.chilled + grand.freezer;
        setRoutesInfo(routeMap);
        setGrandTotals(grand);
      } else {
        setRows([]);
        setConsignmentSet(new Set());
        setRoutesInfo({});
        setGrandTotals({ambient:0,chilled:0,freezer:0,total:0});
      }
      setLoading(false);
    });
    return ()=>unsubscribe();
  },[]);

  // CSV upload
  const handleFiles = (files)=>{
    Array.from(files).forEach(file=>{
      Papa.parse(file,{
        header:true,
        skipEmptyLines:true,
        transformHeader:(h)=>h.trim(),
        complete: async (results)=>{
          const dataRows = results.data;
          if(!dataRows.length) return;
          const headers = Object.keys(dataRows[0]);
          const { consignmentKey, ambientKey, chilledKey, freezerKey, shipmentKey, dispatchKey } = getColumnKeys(headers);
          const newRows=[];
          const newConsignments = new Set(consignmentSet);
          let duplicatesDetected=0;
          dataRows.forEach(r=>{
            const consignment = (r[consignmentKey]||"").trim();
            if(!consignment || newConsignments.has(consignment)){
              if(consignment) duplicatesDetected++;
              return;
            }
            newConsignments.add(consignment);
            const route = getRouteName(r, shipmentKey, dispatchKey);
            newRows.push({
              consignment,
              route,
              ambient: ambientKey?parseToteCell(r[ambientKey]):0,
              chilled: chilledKey?parseToteCell(r[chilledKey]):0,
              freezer: freezerKey?parseToteCell(r[freezerKey]):0,
            });
          });
          if(duplicatesDetected>0){
            setDuplicateMessage(`${duplicatesDetected} duplicate line${duplicatesDetected>1?"s":""} ignored`);
            setTimeout(()=>setDuplicateMessage(""),5000);
          }
          if(newRows.length){
            try{await setDoc(DATA_DOC,{rows:[...rows,...newRows]});}
            catch(err){console.error("Firestore upload error:",err);}
          }
        }
      });
    });
  };

  const onFileChange=(e)=>{
    const files = e.target.files;
    if(!files || files.length===0) return;
    handleFiles(files);
    e.target.value=null;
  };

  const clearAll=async()=>{
    try{await deleteDoc(DATA_DOC);}catch(err){console.error("Firestore clear error:",err);}
  };

  // Bagged Totes calculations
  const baggedAmbient = (parseInt(currentAmbient,10)||0)+(grandTotals.ambient||0)-(parseInt(receivedAmbient,10)||0);
  const baggedChill = (parseInt(currentChill,10)||0)+(grandTotals.chilled||0)-(parseInt(receivedChill,10)||0);
  const totalBagged = baggedAmbient + baggedChill;

  if(loading) return <p style={{marginTop:120,textAlign:"center"}}>Loading...</p>;

  return (
    <div className="app-container">
      <Header />
      <div className="content">
        <TotesUsedCard
          rows={rows}
          routesInfo={routesInfo}
          grandTotals={grandTotals}
          duplicateMessage={duplicateMessage}
          onFileChange={onFileChange}
          clearAll={clearAll}
        />
        <BaggedTotesCard
          receivedAmbient={receivedAmbient}
          receivedChill={receivedChill}
          currentAmbient={currentAmbient}
          currentChill={currentChill}
          setReceivedAmbient={setReceivedAmbient}
          setReceivedChill={setReceivedChill}
          setCurrentAmbient={setCurrentAmbient}
          setCurrentChill={setCurrentChill}
          baggedAmbient={baggedAmbient}
          baggedChill={baggedChill}
          totalBagged={totalBagged}
        />
        <PickAndBaggedCombinedCard />

      </div>
    </div>
  );
}
