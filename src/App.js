import React, { useState, useEffect } from "react";

const STAT_CONFIG = {
  physics: ["Oblivious", "Learned", "Scholarly", "Encyclopedic", "Erudite"],
  selfCare: ["Neglected", "Aware", "Balanced", "Mindful", "Zen Master"],
  chores: ["Messy", "Tidy", "Organized", "Disciplined", "Domestic Hero"],
  social: ["Shy", "Casual", "Friendly", "Charming", "Social Star"],
  entertainment: ["Bored", "Amused", "Enthralled", "Immersed", "Culture Queen"]
};

const StatCard = ({ name, value, onIncrease }) => {
  const levels = STAT_CONFIG[name];
  const level = Math.min(Math.floor(value / 10), levels.length - 1);
  const title = levels[level];

  return (
    <div className="bg-black text-white rounded-2xl p-4 shadow-lg w-full max-w-sm border border-red-500">
      <h2 className="text-red-500 text-xl font-bold capitalize">{name.replace(/([A-Z])/g, " $1")}</h2>
      <p className="text-white text-lg">Rank {level + 1}: <span className="text-yellow-300 font-semibold">{title}</span></p>
      <p className="text-sm text-gray-400">XP: {value}</p>
      <button
        onClick={onIncrease}
        className="mt-2 px-4 py-1 bg-red-600 hover:bg-red-700 rounded-xl text-white shadow"
      >
        +1 XP
      </button>
    </div>
  );
};

export default function App() {
  const [stats, setStats] = useState({
    physics: 0,
    selfCare: 0,
    chores: 0,
    social: 0,
    entertainment: 0
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("persona_stats");
    if (saved) setStats(JSON.parse(saved));
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("persona_stats", JSON.stringify(stats));
  }, [stats]);

  const increaseStat = (key) => {
    setStats((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-gray-900 text-white p-4 flex flex-col items-center space-y-4">
      <h1 className="text-3xl font-bold text-red-500 mb-4">Stat Tracker</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.keys(stats).map((key) => (
          <StatCard
            key={key}
            name={key}
            value={stats[key]}
            onIncrease={() => increaseStat(key)}
          />
        ))}
      </div>
    </div>
  );
}
