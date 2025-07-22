import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from pulp import LpProblem, LpVariable, lpSum, LpMaximize
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/optimize', methods=['POST'])
def optimize():
    try:
        land = float(request.json['land'])
        selected_crops = request.json.get("crops", [])
        selected_crops = [c.lower() for c in selected_crops]

        df = pd.read_csv("Agriculture_price_dataset.csv")
        df.columns = df.columns.str.strip().str.lower()

        date_col = next((col for col in df.columns if 'date' in col), None)
        price_col = next((col for col in df.columns if 'modal' in col), None)
        crop_col = next((col for col in df.columns if 'commodity' in col), None)

        if not date_col or not price_col or not crop_col:
            return jsonify({"error": "Required columns not found in dataset."}), 500

        df = df[[date_col, crop_col, price_col]].dropna()
        df.columns = ['date', 'crop', 'price']
        df['date'] = pd.to_datetime(df['date'], errors='coerce')
        df = df.dropna(subset=['date', 'price'])
        df['crop'] = df['crop'].str.strip().str.lower()
        df = df[df['crop'].isin(selected_crops)]

        if df.empty:
            return jsonify({"error": "No matching data found for selected crops."}), 500

        # Forecast prices
        def forecast_price(crop_name):
            crop = df[df['crop'] == crop_name].copy()
            crop['month'] = crop['date'].dt.month + crop['date'].dt.year * 12
            X = crop[['month']]
            y = crop['price']
            if len(X) < 2:
                return 0
            model = RandomForestRegressor()
            model.fit(X, y)
            next_month = [[X['month'].max() + 1]]
            return model.predict(next_month)[0]

        prices = {c: forecast_price(c) for c in selected_crops}
        yields = {c: 2.5 for c in selected_crops}
        demand = {c: 200 for c in selected_crops}
        penalty = {c: 1.5 for c in selected_crops}

        # Decision variables
        x = {c: LpVariable(f"x_{c}", lowBound=0) for c in selected_crops}
        surplus = {c: LpVariable(f"surplus_{c}", lowBound=0) for c in selected_crops}

        prob = LpProblem("CropOptimization", LpMaximize)

        # Objective: Maximize net return
        prob += lpSum([
            x[c] * yields[c] * prices[c] - penalty[c] * surplus[c]
            for c in selected_crops
        ])

        # Total land constraint
        prob += lpSum([x[c] for c in selected_crops]) <= land

        # Surplus definition: surplus >= yield - demand
        for c in selected_crops:
            prob += surplus[c] >= (x[c] * yields[c]) - demand[c]

        prob.solve()

        results = [{
            'name': c,
            'percent': round((x[c].value() / land) * 100, 2) if x[c].value() else 0,
            'price': round(prices[c], 2)
        } for c in selected_crops]

        return jsonify(results)

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000)
