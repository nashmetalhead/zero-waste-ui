import React, { useState, useEffect } from "react";
import { PieChart, Pie, Tooltip, Cell, Legend, ResponsiveContainer } from "recharts";
import jsPDF from "jspdf";
import domtoimage from "dom-to-image";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

function CropPlanner() {
  const [land, setLand] = useState(100);
  const [region, setRegion] = useState("Punjab");
  const [crops, setCrops] = useState(["rice"]);
  const [results, setResults] = useState([]);
  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const cropOptions = ["rice", "wheat", "sugarcane", "maize"];
  const regionOptions = ["Punjab", "Karnataka", "Maharashtra", "Tamil Nadu"];

  const fetchPrice = async (crop, region) => {
    try {
      const response = await fetch("http://127.0.0.1:5000/get_price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop, region })
      });
      return await response.json();
    } catch (err) {
      return { price: "N/A", error: "Connection failed" };
    }
  };

  const handleOptimize = async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch("http://127.0.0.1:5000/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ land, crops, region })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || "Optimization failed");
      
      setResults(data);
      
      // Fetch prices for all crops
      const priceUpdates = {};
      for (const crop of crops) {
        const priceData = await fetchPrice(crop, region);
        priceUpdates[crop] = priceData.price || "N/A";
      }
      setPrices(priceUpdates);

    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 167, 69);
    doc.text("Zero Waste Crop Optimization Report", 20, 20);
    
    // Metadata
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`• Region: ${region}`, 20, 35);
    doc.text(`• Land Area: ${land} hectares`, 20, 45);
    
    // Prices
    doc.setFontSize(14);
    doc.setTextColor(33, 37, 41);
    doc.text("Current Prices:", 20, 60);
    
    let yPos = 70;
    Object.entries(prices).forEach(([crop, price]) => {
      doc.text(`${crop.toUpperCase()}: ₹${price}`, 30, yPos);
      yPos += 10;
    });
    
    // Recommendations
    doc.setFontSize(14);
    doc.text("Optimal Allocation:", 20, yPos + 10);
    yPos += 20;
    
    results.forEach((r) => {
      doc.text(`${r.name.toUpperCase()}: ${r.percent}%`, 30, yPos);
      yPos += 10;
    });
    
    // Add chart image
    try {
      const chartNode = document.querySelector('.recharts-wrapper');
      const chartImg = await domtoimage.toPng(chartNode);
      doc.addImage(chartImg, 'PNG', 40, yPos + 10, 120, 100);
    } catch (err) {
      console.error("Chart export failed:", err);
    }
    
    doc.save(`crop_plan_${region}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto font-sans">
      <h1 className="text-3xl font-bold text-center mb-8 text-green-600">
        Zero Waste Crop Optimizer
      </h1>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Region Selector */}
        <div className="space-y-2">
          <label className="block font-medium">Select Region:</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full p-2 border rounded"
          >
            {regionOptions.map((reg) => (
              <option key={reg} value={reg}>{reg}</option>
            ))}
          </select>
        </div>
        
        {/* Land Input */}
        <div className="space-y-2">
          <label className="block font-medium">
            Land Area (hectares):
          </label>
          <input
            type="number"
            min="1"
            value={land}
            onChange={(e) => setLand(Math.max(1, e.target.value))}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>
      
      {/* Crop Selection */}
      <div className="mb-6">
        <label className="block font-medium mb-2">Select Crops:</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {cropOptions.map((crop) => (
            <label key={crop} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={crops.includes(crop)}
                onChange={() => setCrops(prev => 
                  prev.includes(crop) 
                    ? prev.filter(c => c !== crop) 
                    : [...prev, crop]
                )}
                className="h-5 w-5 text-green-600"
              />
              <span className="capitalize">{crop}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Optimize Button */}
      <div className="text-center mb-8">
        <button
          onClick={handleOptimize}
          disabled={isLoading || crops.length === 0}
          className={`px-6 py-2 rounded font-bold text-white ${
            isLoading || crops.length === 0
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {isLoading ? "Optimizing..." : "Optimize Plan"}
        </button>
      </div>
      
      {/* Error Display */}
      {error && (
        <div className="p-4 mb-6 bg-red-100 border-l-4 border-red-500 text-red-700">
          <p>{error}</p>
        </div>
      )}
      
      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-8">
          {/* Price Display */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-3 text-blue-800">
              Current Prices ({region})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {results.map((crop) => (
                <div key={crop.name} className="bg-white p-3 rounded shadow">
                  <h3 className="font-medium capitalize">{crop.name}</h3>
                  <p className="text-2xl font-bold">
                    ₹{prices[crop.name] || "N/A"}
                  </p>
                </div>
              ))}
            </div>
          </div>
          
          {/* Recommendations */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h2 className="text-xl font-semibold mb-3 text-green-800">
              Recommended Allocation
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                {results.map((crop) => (
                  <div key={crop.name} className="mb-3">
                    <div className="flex justify-between">
                      <span className="font-medium capitalize">
                        {crop.name}
                      </span>
                      <span className="font-bold">
                        {crop.percent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded h-2.5">
                      <div
                        className="bg-green-600 h-2.5 rounded"
                        style={{ width: `${crop.percent}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div style={{ height: "300px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={results}
                      dataKey="percent"
                      nameKey="name"
                      outerRadius={80}
                      label={({ name, percent }) => `${name}: ${percent}%`}
                    >
                      {results.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [`${value}%`, name]} 
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          
          {/* PDF Export */}
          <div className="text-center">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Download Full Report (PDF)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CropPlanner;