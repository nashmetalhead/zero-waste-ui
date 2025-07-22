import jsPDF from "jspdf";
import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";

function CropPlanner() {
  const [land, setLand] = useState(100);
  const [crops, setCrops] = useState(["rice", "wheat"]);
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const cropOptions = ["rice", "wheat"];
  const colors = ["#8884d8", "#82ca9d"];

  const handleOptimize = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ land, crops }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
        setError("");
      } else {
        setResults([]);
        setError(data.error || "Something went wrong.");
      }
    } catch (err) {
      setError("Could not connect to backend.");
      setResults([]);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Zero Waste Crop Optimization Report", 20, 20);

    doc.setFontSize(12);
    doc.text(`Land Area: ${land} hectares`, 20, 35);

    doc.setFont("helvetica", "bold");
    doc.text("Price Predictions:", 20, 50);
    doc.setFont("helvetica", "normal");

    let y = 60;
    results.forEach((r) => {
      doc.text(`${r.name.toUpperCase()}: ₹${r.price} / unit`, 20, y);
      y += 10;
    });

    doc.setFont("helvetica", "bold");
    doc.text("Recommendations:", 20, y + 10);
    doc.setFont("helvetica", "normal");

    y += 20;
    results.forEach((r) => {
      doc.text(`${r.name.toUpperCase()}: ${r.percent}%`, 20, y);
      y += 10;
    });

    doc.save("crop_optimization_report.pdf");
  };

  return (
    <div className="p-6 max-w-3xl mx-auto text-center font-sans">
      <h1 className="text-4xl font-extrabold mb-6 text-green-800">🌾 Zero Waste Crop Optimizer</h1>

      <div className="mb-4 text-left">
        <label className="block font-medium mb-1">Enter land area (hectares):</label>
        <input
          type="number"
          value={land}
          onChange={(e) => setLand(Number(e.target.value))}
          className="border border-gray-300 rounded p-2 w-full"
        />
      </div>

      <div className="mb-4 text-left">
        <label className="block font-medium mb-1">Select Crops:</label>
        <select
          multiple
          value={crops}
          onChange={(e) => {
            const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
            setCrops(selected);
          }}
          className="border border-gray-300 rounded p-2 w-full h-32"
        >
          {cropOptions.map((crop) => (
            <option key={crop} value={crop}>
              {crop}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleOptimize}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded"
      >
        Optimize
      </button>

      {error && <p className="text-red-600 mt-4 font-semibold">❌ {error}</p>}

      {results.length > 0 && (
        <div className="mt-8 text-left">
          <h2 className="text-2xl font-semibold mb-3 text-pink-600">📉 Price Predictions</h2>
          {results.map((r) => (
            <p key={r.name}>
              <strong className="uppercase">{r.name}</strong>: ₹{r.price.toFixed(2)} / unit
            </p>
          ))}

          <h2 className="text-2xl font-semibold mt-6 mb-3 text-indigo-600">📊 Recommendation</h2>
          {results.map((r) => (
            <p key={r.name}>
              <strong className="uppercase">{r.name}</strong>: {r.percent}%
            </p>
          ))}

          <div className="mt-6" style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={results}
                  dataKey="percent"
                  nameKey="name"
                  outerRadius={100}
                  label={({ name, percent }) => `${name}: ${percent}%`}
                >
                  {results.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="text-center mt-8">
            <button
              onClick={handleDownloadPDF}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CropPlanner;
