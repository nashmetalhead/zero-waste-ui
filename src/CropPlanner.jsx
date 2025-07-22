// File: CropPlanner.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

export default function CropPlanner() {
  const [states, setStates] = useState([]);
  const [crops]  = useState(["rice","wheat","sugarcane"]);
  const [form, setForm] = useState({
    state:"", land:"", crops:{rice:false,wheat:false,sugarcane:false}
  });
  const [result,setResult]=useState(null);
  const [err,setErr]=useState("");

  useEffect(()=>{
    axios.get("http://localhost:5000/get_states")
      .then(res=>{
        const all = [...res.data.states,...res.data.union_territories];
        setStates(all);
      })
      .catch(()=>setErr("Failed to load states"));
  },[]);

  function handleChange(e){
    const {name,value,type,checked}=e.target;
    if(crops.includes(name)){
      setForm(p=>({...p,crops:{...p.crops,[name]:checked}}));
    } else setForm(p=>({...p,[name]:value}));
  }

  function handleSubmit(e){
    e.preventDefault();
    const chosen=Object.keys(form.crops).filter(c=>form.crops[c]);
    setErr(""); setResult(null);
    axios.post("http://localhost:5000/optimize",{
      land:Number(form.land), state:form.state, crops:chosen
    }).then(res=>setResult(res.data))
      .catch(e=>setErr(e.response?.data?.error||"Server error"));
  }

  return (
    <div>
      <h2>Zero-Waste Crop Optimizer</h2>
      {err && <p style={{color:"red"}}>{err}</p>}
      <form onSubmit={handleSubmit}>
        <label>
          State/UT:
          <select name="state" value={form.state} onChange={handleChange} required>
            <option value="">Select …</option>
            {states.map(s=>(
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Land (ha):
          <input 
            type="number" name="land" value={form.land}
            onChange={handleChange} required min="0.1" step="0.1"
          />
        </label>
        <fieldset>
          <legend>Crops:</legend>
          {crops.map(c=>(
            <label key={c}>
              <input
                type="checkbox" name={c}
                checked={form.crops[c]} onChange={handleChange}
              />{c}
            </label>
          ))}
        </fieldset>
        <button type="submit">Optimize</button>
      </form>

      {result && (
        <table>
          <thead>
            <tr>
              <th>Crop</th><th>Area (ha)</th><th>Share (%)</th><th>Price</th>
            </tr>
          </thead>
          <tbody>
            {result.allocation.map(row=>(
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.area}</td>
                <td>{row.percent}</td>
                <td>₹{row.forecast_price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
