import React, { useState } from "react";
import {
  PieChart,
  Pie,
  Tooltip,
  Cell,
  Legend,
  ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";

const regionCropData = {
  karnataka: ["Rice", "Sugarcane", "Ragi"],
  punjab: ["Wheat", "Maize", "Rice"],
  tamilnadu: ["Cotton", "Millet", "Pulses"],
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
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

const App = () => {
  const [region, setRegion] = useState("");
  const [selectedCrop, setSelectedCrop] = useState("");
  const [chartData, setChartData] = useState([]);
  const [cropPrice, setCropPrice] = useState(""); // ✅ added

  const handleRegionChange = (e) => {
    setRegion(e.target.value);
    setSelectedCrop("");
    setChartData([]);
    setCropPrice(""); // ✅ reset
  };

  const handleCropChange = async (e) => {
    const crop = e.target.value;
    setSelectedCrop(crop);
    const fertData = fertilizerRequirements[crop];
    const chart = Object.entries(fertData).map(([key, value]) => ({
      name: key,
      value,
    }));
    setChartData(chart);

    // ✅ Fetch price from Flask
    try {
      const res = await fetch("http://localhost:5000/get_price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop, region }),
      });
      const data = await res.json();
      setCropPrice(data.price || "N/A");
    } catch (error) {
      console.error("Failed to fetch price:", error);
      setCropPrice("N/A");
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Crop Optimization Report", 10, 10);
    doc.setFontSize(12);
    doc.text(`Selected Region: ${region}`, 10, 20);
    doc.text(`Selected Crop: ${selectedCrop}`, 10, 30);

    if (cropPrice) {
      doc.text(`Predicted Market Price: ₹${cropPrice}`, 10, 40); // ✅ added
    }

    if (selectedCrop && fertilizerRequirements[selectedCrop]) {
      const fert = fertilizerRequirements[selectedCrop];
      doc.text("Fertilizer Requirements:", 10, 50); // shift down
      let y = 60;
      for (let [key, val] of Object.entries(fert)) {
        doc.text(`${key}: ${val}%`, 10, y);
        y += 10;
      }
    }

    doc.save("crop-optimization-report.pdf");
  };

  const availableCrops = region ? regionCropData[region] : [];

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-xl shadow-md space-y-6">
      <h1 className="text-2xl font-bold text-center text-green-700">
        Zero Waste Crop Optimizer 🌾
      </h1>

      {/* Region Selection */}
      <div>
        <label className="block font-semibold mb-1">Select Region:</label>
        <select
          value={region}
          onChange={handleRegionChange}
          className="w-full border rounded p-2"
        >
          <option value="">-- Choose a region --</option>
          <option value="karnataka">Karnataka</option>
          <option value="punjab">Punjab</option>
          <option value="tamilnadu">Tamil Nadu</option>
        </select>
      </div>

      {/* Crop Selection */}
      {region && (
        <div>
          <label className="block font-semibold mb-1 mt-4">Select Crop:</label>
          <select
            value={selectedCrop}
            onChange={handleCropChange}
            className="w-full border rounded p-2"
          >
            <option value="">-- Choose a crop --</option>
            {availableCrops.map((crop) => (
              <option key={crop} value={crop}>
                {crop}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Fertilizer Chart */}
      {selectedCrop && chartData.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mt-6 mb-2">
            Fertilizer Breakdown for {selectedCrop}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                dataKey="value"
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>

          {/* ✅ Show Price */}
          {cropPrice && (
            <p className="text-center mt-4 text-green-800 text-lg">
              Predicted Market Price: ₹{cropPrice}
            </p>
          )}
        </div>
      )}

      {/* PDF Button */}
      <div className="text-center mt-4">
        <button
          onClick={handleDownloadPDF}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Download PDF
        </button>
      </div>
    </div>
  );
};

export default App;
