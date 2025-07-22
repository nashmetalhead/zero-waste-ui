# File: ml_optimizer.py
import pandas as pd
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import lru_cache
from sklearn.ensemble import RandomForestRegressor
from pulp import LpProblem, LpVariable, lpSum, LpMaximize

app = Flask(__name__)
CORS(app)

# 28 states + 8 UTs
INDIAN_REGIONS = [ 
    "andhra pradesh","arunachal pradesh","assam","bihar","chhattisgarh",
    "goa","gujarat","haryana","himachal pradesh","jharkhand","karnataka",
    "kerala","madhya pradesh","maharashtra","manipur","meghalaya","mizoram",
    "nagaland","odisha","punjab","rajasthan","sikkim","tamil nadu","telangana",
    "tripura","uttar pradesh","uttarakhand","west bengal",
    "andaman and nicobar islands","chandigarh",
    "dadra and nagar haveli and daman and diu","delhi",
    "jammu and kashmir","ladakh","lakshadweep","puducherry"
]

YIELDS   = {"rice":3.2,"wheat":2.5,"sugarcane":5.0}
DEMANDS  = {"rice":300,"wheat":200,"sugarcane":150}
PENALTIES= {"rice":1.5,"wheat":1.2,"sugarcane":1.8}

@lru_cache(maxsize=1)
def load_dataset():
    df = pd.read_csv("Agriculture_price_dataset.csv")
    df.columns = df.columns.str.strip().str.lower()
    # detect columns
    date_col   = next(c for c in df.columns if "date" in c)
    crop_col   = next(c for c in df.columns if "commod" in c or "crop" in c)
    region_col = next(c for c in df.columns if "state" in c or "region" in c)
    price_col  = next(c for c in df.columns if "modal" in c or "price" in c)
    # normalize to lowercase
    df[crop_col]   = df[crop_col].astype(str).str.strip().str.lower()
    df[region_col] = df[region_col].astype(str).str.strip().str.lower()
    # filter to known regions
    df = df[df[region_col].isin(INDIAN_REGIONS)]
    # drop missing prices
    df = df.dropna(subset=[price_col])
    # parse dates
    df[date_col] = pd.to_datetime(df[date_col], errors="coerce")
    return df, {"date":date_col,"crop":crop_col,"region":region_col,"price":price_col}

def forecast_price(crop, df, date_col):
    series = df[df["crop"]==crop]
    if len(series)<2:
        return float(series["price"].mean() or 0)
    series["idx"] = series[date_col].dt.year*12 + series[date_col].dt.month
    X = series[["idx"]].values
    y = series["price"].values
    m = RandomForestRegressor(n_estimators=50,random_state=42)
    m.fit(X,y)
    return float(m.predict([[X.max()+1]])[0])

@app.route("/get_states", methods=["GET"])
def get_states():
    df,cm = load_dataset()
    uniq = sorted(df[cm["region"]].unique())
    # split states vs UTs
    ut_list = set(INDIAN_REGIONS) - set([r for r in uniq if r in INDIAN_REGIONS and r not in ut_list])
    return jsonify({
      "states":[r for r in uniq if r in INDIAN_REGIONS and r not in [
        "andaman and nicobar islands","chandigarh",
        "dadra and nagar haveli and daman and diu","delhi",
        "jammu and kashmir","ladakh","lakshadweep","puducherry"
      ]],
      "union_territories":[r for r in uniq if r in [
        "andaman and nicobar islands","chandigarh",
        "dadra and nagar haveli and daman and diu","delhi",
        "jammu and kashmir","ladakh","lakshadweep","puducherry"
      ]]
    })

@app.route("/get_price", methods=["POST"])
def get_price():
    data = request.json
    crop   = data.get("crop","").strip().lower()
    region = data.get("region","").strip().lower()
    df,cm  = load_dataset()
    # regional
    reg = df[(df[cm["crop"]]==crop)&(df[cm["region"]]==region)]
    if not reg.empty:
        return jsonify({"price": round(reg[cm["price"]].mean(),2)})
    # national fallback
    nat = df[df[cm["crop"]]==crop]
    if not nat.empty:
        return jsonify({
            "price": round(nat[cm["price"]].mean(),2),
            "warning":"Using national average"
        })
    return jsonify({"price":"N/A"}),404

@app.route("/optimize", methods=["POST"])
def optimize():
    data  = request.json
    land  = float(data.get("land",0))
    crops = [c.strip().lower() for c in data.get("crops",[])]
    state = data.get("state","").strip().lower()
    if land<=0 or not crops:
        return jsonify({"error":"Land and crops required"}),400
    df,cm = load_dataset()
    if state:
        df = df[df[cm["region"]]==state]
        if df.empty:
            return jsonify({"error":"No data for state"}),400
    df = df[df[cm["crop"]].isin(crops)]
    df = df.rename(columns={cm["date"]:"date",cm["price"]:"price"})
    prices = {c:max(0,forecast_price(c,df,"date")) for c in crops}
    prob = LpProblem("CropOpt",LpMaximize)
    x = {c:LpVariable(f"x_{c}",lowBound=0) for c in crops}
    s = {c:LpVariable(f"s_{c}",lowBound=0) for c in crops}
    prob += lpSum(x[c]*YIELDS.get(c,1)*prices[c] - PENALTIES.get(c,1)*s[c] for c in crops)
    prob += lpSum(x.values()) <= land
    for c in crops:
        prob += s[c] >= x[c]*YIELDS.get(c,1) - DEMANDS.get(c,0)
    prob.solve()
    alloc = [{
      "name":c,
      "area":round(x[c].varValue or 0,2),
      "percent":round(((x[c].varValue or 0)/land)*100,2),
      "forecast_price":round(prices[c],2)
    } for c in crops]
    return jsonify({"state":state,"land":land,"allocation":alloc})

if __name__=="__main__":
    app.run(port=5000,debug=True)
