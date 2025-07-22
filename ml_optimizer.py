import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from pulp import LpProblem, LpVariable, lpSum, LpMaximize
from flask import Flask, request, jsonify
from flask_cors import CORS
from functools import lru_cache
import numpy as np

app = Flask(__name__)
CORS(app)

# Configuration
YIELDS = {"rice": 3.2, "wheat": 2.5, "sugarcane": 5.0}
DEMANDS = {"rice": 300, "wheat": 200, "sugarcane": 150}
PENALTIES = {"rice": 1.5, "wheat": 1.2, "sugarcane": 1.8}

@lru_cache(maxsize=1)
def load_dataset():
    """Cached dataset loader with robust column detection"""
    df = pd.read_csv("Agriculture_price_dataset.csv")
    df.columns = df.columns.str.strip().str.lower()
    
    # Flexible column mapping
    col_map = {
        'date': next((col for col in df.columns if 'date' in col), None),
        'crop': next((col for col in df.columns if 'commod' in col), None),
        'region': next((col for col in df.columns if 'state' in col), None),
        'price': next((col for col in df.columns if 'modal' in col), None)
    }
    
    if None in col_map.values():
        raise ValueError("Required columns not found in dataset")
    
    return df, col_map

@app.route('/optimize', methods=['POST'])
def optimize():
    try:
        data = request.json
        land = float(data.get('land', 0))
        selected_crops = [c.strip().lower() for c in data.get('crops', [])]
        
        # Validation
        if land <= 0:
            return jsonify({"error": "Land area must be positive"}), 400
        if not selected_crops:
            return jsonify({"error": "At least one crop must be selected"}), 400

        df, col_map = load_dataset()
        
        # Filter and clean data
        df = df[[col_map['date'], col_map['crop'], col_map['price']]]
        df.columns = ['date', 'crop', 'price']
        df = df.dropna(subset=['price'])
        df['crop'] = df['crop'].str.strip().str.lower()
        df = df[df['crop'].isin(selected_crops)]
        
        if df.empty:
            return jsonify({"error": "No data for selected crops"}), 400

        # Price forecasting
        def forecast_price(crop_name):
            crop_data = df[df['crop'] == crop_name].copy()
            if len(crop_data) < 2:
                return np.mean(df[df['crop'] == crop_name]['price']) or 0
            
            crop_data['month'] = crop_data['date'].dt.month + crop_data['date'].dt.year * 12
            X = crop_data[['month']]
            y = crop_data['price']
            
            model = RandomForestRegressor(n_estimators=50)
            model.fit(X, y)
            return model.predict([[X['month'].max() + 1]])[0]

        prices = {c: max(0, forecast_price(c)) for c in selected_crops}
        
        # Optimization setup
        prob = LpProblem("CropOptimization", LpMaximize)
        x = {c: LpVariable(f"x_{c}", lowBound=0) for c in selected_crops}
        surplus = {c: LpVariable(f"surplus_{c}", lowBound=0) for c in selected_crops}

        # Objective function
        prob += lpSum([
            x[c] * YIELDS.get(c, 1) * prices[c] - 
            PENALTIES.get(c, 1) * surplus[c] 
            for c in selected_crops
        ])

        # Constraints
        prob += lpSum([x[c] for c in selected_crops]) <= land
        
        for c in selected_crops:
            prob += surplus[c] >= (x[c] * YIELDS.get(c, 1)) - DEMANDS.get(c, 0)

        prob.solve()

        results = [{
            'name': c,
            'percent': round((x[c].varValue / land) * 100, 2) if x[c].varValue else 0,
            'price': round(prices.get(c, 0), 2)
        } for c in selected_crops]

        return jsonify(results)

    except Exception as e:
        app.logger.error(f"Optimization error: {str(e)}")
        return jsonify({"error": "Server error"}), 500

@app.route("/get_price", methods=["POST"])
def get_price():
    try:
        data = request.json
        crop = data.get("crop", "").strip().lower()
        region = data.get("region", "").strip().lower()

        if not crop or not region:
            return jsonify({"error": "Crop and region are required"}), 400

        df, col_map = load_dataset()
        
        # Regional price
        regional = df[
            (df[col_map['region']].str.strip().str.lower() == region) &
            (df[col_map['crop']].str.strip().str.lower() == crop)
        ]
        
        if not regional.empty:
            price = regional[col_map['price']].mean()
            return jsonify({"price": round(price, 2)})

        # National fallback
        national = df[df[col_map['crop']].str.strip().str.lower() == crop]
        if not national.empty:
            price = national[col_map['price']].mean()
            return jsonify({
                "price": round(price, 2),
                "warning": "Using national average"
            })

        return jsonify({"price": "N/A", "warning": "No data available"})

    except Exception as e:
        app.logger.error(f"Price lookup error: {str(e)}")
        return jsonify({"error": "Server error"}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)