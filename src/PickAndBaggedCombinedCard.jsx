import React from "react";
import PickCalculatorCard from "./PickCalculatorCard";
import CurrentBaggedTotesCard from "./CurrentBaggedTotesCard";

export default function PickAndBaggedCombinedCard() {
  return (
    <div className="data-card adaptive-card pick-bagged-card">
      <div className="pick-bagged-section">
        <PickCalculatorCard />
        <div style={{ marginTop: "24px" }}>
          <CurrentBaggedTotesCard />
        </div>
      </div>
    </div>
  );
}
