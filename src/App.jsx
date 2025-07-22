// File: App.jsx
import React, { useState, useEffect } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";

// Regional crop mapping for all Indian states & UTs
const regionCropData = {
  "andhra pradesh": ["Rice", "Cotton", "Sugarcane", "Chili", "Turmeric"],
  "arunachal pradesh": ["Rice", "Maize", "Millet", "Pulses"],
  assam: ["Rice", "Tea", "Jute", "Mustard", "Pulses"],
  bihar: ["Rice", "Wheat", "Maize", "Pulses", "Sugarcane"],
  chhattisgarh: ["Rice", "Wheat", "Maize", "Pulses", "Sugarcane"],
  goa: ["Rice", "Cashew", "Coconut", "Spices"],
  gujarat: ["Cotton", "Groundnut", "Wheat", "Rice", "Sugarcane"],
  haryana: ["Wheat", "Rice", "Sugarcane", "Cotton", "Mustard"],
  "himachal pradesh": ["Wheat", "Maize", "Rice", "Barley", "Apple"],
  jharkhand: ["Rice", "Wheat", "Maize", "Pulses", "Sugarcane"],
  karnataka: ["Rice", "Sugarcane", "Ragi", "Cotton", "Coffee"],
  kerala: ["Rice", "Coconut", "Spices", "Tea", "Coffee"],
  "madhya pradesh": ["Wheat", "Rice", "Soybean", "Cotton", "Sugarcane"],
  maharashtra: ["Cotton", "Sugarcane", "Rice", "Wheat", "Pulses"],
  manipur: ["Rice", "Maize", "Pulses", "Oilseeds"],
  meghalaya: ["Rice", "Maize", "Wheat", "Pulses"],
  mizoram: ["Rice", "Maize", "Sugarcane", "Cotton"],
  nagaland: ["Rice", "Maize", "Millets", "Pulses"],
  odisha: ["Rice", "Wheat", "Pulses", "Sugarcane", "Cotton"],
  punjab: ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane"],
  rajasthan: ["Wheat", "Bajra", "Mustard", "Cotton", "Pulses"],
  sikkim: ["Rice", "Maize", "Wheat", "Barley", "Cardamom"],
  "tamil nadu": ["Rice", "Cotton", "Sugarcane", "Groundnut", "Pulses"],
  telangana: ["Rice", "Cotton", "Maize", "Sugarcane", "Turmeric"],
  tripura: ["Rice", "Wheat", "Maize", "Pulses"],
  "uttar pradesh": ["Wheat", "Rice", "Sugarcane", "Pulses", "Potato"],
  uttarakhand: ["Rice", "Wheat", "Sugarcane", "Pulses"],
  "west bengal": ["Rice", "Wheat", "Jute", "Tea", "Potato"],
  "andaman and nicobar islands": ["Rice", "Coconut", "Arecanut", "Spices"],
  chandigarh: ["Wheat", "Rice", "Maize", "Sugarcane"],
  "dadra and nagar haveli and daman and diu": ["Rice", "Wheat", "Sugarcane"],
  delhi: ["Wheat", "Rice", "Bajra", "Mustard"],
  "jammu and kashmir": ["Rice", "Wheat", "Maize", "Barley", "Mustard"],
  ladakh: ["Wheat", "Barley", "Peas", "Mustard"],
  lakshadweep: ["Coconut", "Banana", "Sweet Potato"],
  puducherry: ["Rice", "Sugarcane", "Cotton", "Groundnut"],
};

const fertilizerRequirements = {
  Rice: { Nitrogen: 50, Phosphorus: 30, Potassium: 20 },
  Wheat: { Nitrogen: 40, Phosphorus: 35, Potassium: 25 },
  Sugarcane: { Nitrogen: 60, Phosphorus: 25, Potassium: 15 },
  Ragi: { Nitrogen: 30, Phosphorus: 40, Potassium: 30 },
  Maize: { Nitrogen: 55, Phosphorus: 25, Potassium: 20 },
  Cotton: { Nitrogen: 45, Phosphorus: 30, Potassium: 25 },
  Millet: { Nitrogen: 35, Phosphorus: 30, Potassium: 35 },
  Pulses: { Nitrogen: 25, Phosphorus: 45, Potassium: 30 },
  Tea: { Nitrogen: 70, Phosphorus: 20, Potassium: 10 },
  Coffee: { Nitrogen: 65, Phosphorus: 15, Potassium: 20 },
  Coconut: { Nitrogen: 40, Phosphorus: 30, Potassium: 30 },
  Groundnut: { Nitrogen: 35, Phosphorus: 40, Potassium: 25 },
  Mustard: { Nitrogen: 45, Phosphorus: 35, Potassium: 20 },
  Jute: { Nitrogen: 50, Phosphorus: 25, Potassium: 25 },
  Chili: { Nitrogen: 55, Phosphorus: 30, Potassium: 15 },
  Turmeric: { Nitrogen: 60, Phosphorus: 40, Potassium: 20 },
  Soybean: { Nitrogen: 30, Phosphorus: 50, Potassium: 20 },
  Bajra: { Nitrogen: 40, Phosphorus: 30, Potassium: 30 },
  Barley: { Nitrogen: 35, Phosphorus: 40, Potassium: 25 },
  Apple: { Nitrogen: 45, Phosphorus: 25, Potassium: 30 },
  Spices: { Nitrogen: 50, Phosphorus: 35, Potassium: 15 },
  Potato: { Nitrogen: 55, Phosphorus: 45, Potassium: 20 },
  Oilseeds: { Nitrogen: 40, Phosphorus: 35, Potassium: 25 },
  Cashew: { Nitrogen: 35, Phosphorus: 25, Potassium: 40 },
  Arecanut: { Nitrogen: 45, Phosphorus: 30, Potassium: 25 },
  Banana: { Nitrogen: 65, Phosphorus: 20, Potassium: 15 },
  "Sweet Potato": { Nitrogen: 40, Phosphorus: 35, Potassium: 25 },
  Cardamom: { Nitrogen: 55, Phosphorus: 30, Potassium: 15 },
  Peas: { Nitrogen: 30, Phosphorus: 45, Potassium: 25 },
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function App() {
  const [availableStates, setAvailableStates] = useState([]);
  const [region, setRegion] = useState("");
  const [selectedCrop, setSelectedCrop] = useState("");
  const [chartData, setChartData] = useState([]);
  const [cropPrice, setCropPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStates();
  }, []);

  const fetchStates = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/get_states");
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setAvailableStates([
        ...data.states.map((s) => s.toLowerCase()),
        ...data.union_territories.map((ut) => ut.toLowerCase()),
      ]);
    } catch {
      setAvailableStates(Object.keys(regionCropData));
      setError("Using offline state list");
    } finally {
      setLoading(false);
    }
  };

  const handleRegionChange = (e) => {
    const r = e.target.value;
    setRegion(r);
    setSelectedCrop("");
    setChartData([]);
    setCropPrice("");
    setError("");
  };

  const handleCropChange = async (e) => {
    const crop = e.target.value;
    setSelectedCrop(crop);
    setError("");
    // chart
    const fert = fertilizerRequirements[crop];
    setChartData(Object.entries(fert).map(([k, v]) => ({ name: k, value: v })));
    // price
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/get_price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop: crop.toLowerCase(), region }),
      });
      const data = await res.json();
      setCropPrice(data.price || "N/A");
      if (data.warning) setError(data.warning);
    } catch {
      setCropPrice("N/A");
      setError("Price unavailable");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Crop Optimization Report", 10, 10);
    doc.setFontSize(12);
    let y = 20;
    doc.text(`Region: ${region}`, 10, y);
    y += 10;
    doc.text(`Crop: ${selectedCrop}`, 10, y);
    y += 10;
    if (cropPrice !== "N/A") {
      doc.text(`Price: ₹${cropPrice}/q`, 10, y);
      y += 10;
    }
    doc.text("Fertilizer (%):", 10, y);
    y += 10;
    chartData.forEach((d) => {
      doc.text(`${d.name}: ${d.value}%`, 12, y);
      y += 10;
    });
    doc.save(`report_${region}_${selectedCrop}.pdf`);
  };

  const formatName = (s) =>
    s.split(" ").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-center text-green-700">
      Zero Waste Crop Optimizer
      </h1>
      {error && (
        <div className="bg-yellow-100 p-4 rounded text-yellow-800">{error}</div>
      )}
      {loading && <div className="text-center">Loading…</div>}

      <div>
        <label className="block mb-2">Select State/UT</label>
        <select
          value={region}
          onChange={handleRegionChange}
          className="w-full p-2 border rounded"
          disabled={loading}
        >
          <option value="">-- Choose --</option>
          {availableStates.sort().map((s) => (
            <option key={s} value={s}>
              {formatName(s)}
            </option>
          ))}
        </select>
      </div>

      {region && (
        <div>
          <label className="block mb-2">Select Crop</label>
          <select
            value={selectedCrop}
            onChange={handleCropChange}
            className="w-full p-2 border rounded"
            disabled={loading}
          >
            <option value="">-- Choose --</option>
            {(regionCropData[region] || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedCrop && chartData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h2 className="mb-2">Fertilizer Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center">
            {cropPrice !== "N/A" ? (
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">
                  ₹{cropPrice}
                </div>
                <div className="text-gray-600">per quintal</div>
              </div>
            ) : (
              <div className="italic text-gray-500">
                Price data not available
              </div>
            )}
          </div>
        </div>
      )}

      {selectedCrop && (
        <div className="text-center">
          <button
            onClick={downloadPDF}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
}
