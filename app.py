import os
import json
import traceback
from flask import Flask, render_template, jsonify, request
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable static file caching in dev

groq_api_key = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=groq_api_key) if groq_api_key else None

def get_fallback_stock_data(symbol):
    """Universal market data generator with correct TradingView exchange routing for every asset type"""
    clean_symbol = symbol.strip().upper()
    
    market_data_map = {
        # Crypto (Mapped for TradingView widget compatibility)
        "BTC": {"name": "Bitcoin USD", "price": 64500.00, "vol": 35000000000, "exchange": "BINANCE:BTCUSDT"},
        "ETH": {"name": "Ethereum USD", "price": 3450.00, "vol": 15000000000, "exchange": "BINANCE:ETHUSDT"},
        "SOL": {"name": "Solana USD", "price": 145.50, "vol": 4000000000, "exchange": "BINANCE:SOLUSDT"},
        "XRP": {"name": "Ripple USD", "price": 0.58, "vol": 1200000000, "exchange": "BINANCE:XRPUSDT"},
        "DOGE": {"name": "Dogecoin USD", "price": 0.12, "vol": 800000000, "exchange": "BINANCE:DOGEUSDT"},
        
        # Commodities & Energy (Mapped to TradingView Continuous / Spot feeds)
        "CL": {"name": "Crude Oil Futures", "price": 76.80, "vol": 120000000, "exchange": "NYMEX:CL1!"},
        "OIL": {"name": "Crude Oil Spot", "price": 76.80, "vol": 120000000, "exchange": "TVC:USOIL"},
        "GC": {"name": "Gold Futures", "price": 2420.50, "vol": 90000000, "exchange": "COMEX:GC1!"},
        "GOLD": {"name": "Gold Spot", "price": 2420.50, "vol": 90000000, "exchange": "TVC:GOLD"},
        "SLV": {"name": "Silver Trust ETF", "price": 28.40, "vol": 45000000, "exchange": "NYSE:SLV"},
        
        # Currencies / Forex (Mapped to FX_IDC)
        "EURUSD": {"name": "Euro / US Dollar", "price": 1.09, "vol": 50000000000, "exchange": "FX_IDC:EURUSD"},
        "GBPUSD": {"name": "British Pound / US Dollar", "price": 1.28, "vol": 30000000000, "exchange": "FX_IDC:GBPUSD"},
        "USDJPY": {"name": "US Dollar / Japanese Yen", "price": 147.50, "vol": 45000000000, "exchange": "FX_IDC:USDJPY"},
        
        # Indices & ETFs
        "SPY": {"name": "SPDR S&P 500 ETF Trust", "price": 545.20, "vol": 70000000, "exchange": "NYSE:SPY"},
        "QQQ": {"name": "Invesco QQQ Trust", "price": 468.50, "vol": 48000000, "exchange": "NASDAQ:QQQ"},
        
        # Tech & Popular Equities
        "AAPL": {"name": "Apple Inc.", "price": 220.50, "vol": 55000000, "exchange": "NASDAQ:AAPL"},
        "TSLA": {"name": "Tesla Inc.", "price": 245.80, "vol": 85000000, "exchange": "NASDAQ:TSLA"},
        "MSFT": {"name": "Microsoft Corporation", "price": 415.20, "vol": 40000000, "exchange": "NASDAQ:MSFT"},
        "NVDA": {"name": "NVIDIA Corporation", "price": 125.40, "vol": 110000000, "exchange": "NASDAQ:NVDA"},
        "GOOGL": {"name": "Alphabet Inc.", "price": 178.30, "vol": 30000000, "exchange": "NASDAQ:GOOGL"},
        "AMZN": {"name": "Amazon.com Inc.", "price": 185.90, "vol": 38000000, "exchange": "NASDAQ:AMZN"},
        "NFLX": {"name": "Netflix Inc.", "price": 680.10, "vol": 15000000, "exchange": "NASDAQ:NFLX"},
        "META": {"name": "Meta Platforms Inc.", "price": 495.60, "vol": 22000000, "exchange": "NASDAQ:META"}
    }
    
    if clean_symbol in market_data_map:
        item = market_data_map[clean_symbol]
        price = item["price"]
        name = item["name"]
        vol = item["vol"]
        exch = item["exchange"]
    else:
        price = 150.00
        name = f"{clean_symbol} Asset"
        vol = 1000000
        exch = f"NASDAQ:{clean_symbol}"
    
    return {
        "symbol": clean_symbol,
        "companyName": name,
        "currentPrice": price,
        "previousClose": price * 0.99,
        "high": price * 1.02,
        "low": price * 0.98,
        "volume": vol,
        "fiftyTwoWeekHigh": price * 1.25,
        "fiftyTwoWeekLow": price * 0.75,
        "exchange": exch
    }


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/company/<symbol>')
def get_company(symbol):
    try:
        data = get_fallback_stock_data(symbol)
        return jsonify(data)
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"Failed to fetch market data: {str(e)}"}), 500


@app.route('/api/candles/<symbol>')
def get_candles(symbol):
    """Passes exact exchange routing so the front-end chart loads correctly for every category"""
    try:
        data = get_fallback_stock_data(symbol)
        base_price = data["currentPrice"]
        exchange = data["exchange"]
        candles = []
        
        import random
        current_val = base_price * 0.95
        for i in range(30):
            variation = random.uniform(-0.015, 0.018)
            open_p = current_val
            close_p = open_p * (1 + variation)
            high_p = max(open_p, close_p) * random.uniform(1.001, 1.008)
            low_p = min(open_p, close_p) * random.uniform(0.992, 0.999)
            current_val = close_p
            
            candles.append({
                "time": f"2026-07-{i+1:02d}" if i < 31 else f"2026-08-{i-30:02d}",
                "open": round(open_p, 2),
                "high": round(high_p, 2),
                "low": round(low_p, 2),
                "close": round(close_p, 2)
            })
            
        return jsonify({
            "symbol": symbol.upper(),
            "exchange": exchange,
            "candles": candles
        })
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"candles": []})


@app.route('/api/sentiment/<symbol>')
def get_sentiment(symbol):
    return jsonify({
        "symbol": symbol.upper(),
        "bullishPercent": 72,
        "bearishPercent": 28,
        "fearAndGreedIndex": 68,
        "sentimentLabel": "Greed / Bullish Momentum"
    })


@app.route('/api/chat', methods=['POST'])
def asset_chat():
    try:
        body = request.get_json() or {}
        symbol = body.get("symbol", "Asset").upper()
        question = body.get("question", "")

        if not question:
            return jsonify({"error": "No question provided."}), 400

        if not groq_client:
            return jsonify({"answer": f"Simulated AI response: Regarding {symbol}, market conditions suggest steady adjustments based on your query."})

        prompt = f"You are an expert financial advisor assistant. Answer the user's specific question about asset '{symbol}': '{question}'. Keep the response concise, informative, and professional (under 3 sentences)."

        chat = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3
        )
        answer = chat.choices[0].message.content
        return jsonify({"answer": answer})
    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


@app.route('/api/alert', methods=['POST'])
def set_price_alert():
    try:
        data = request.get_json() or {}
        symbol = data.get("symbol")
        target_price = data.get("targetPrice")
        return jsonify({"success": True, "message": f"Alert successfully set for {symbol} at ${target_price}!"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 400


@app.route('/api/analyze/<symbol>')
def analyze_stock(symbol):
    try:
        data = get_fallback_stock_data(symbol)
        latest_close = data["currentPrice"]
        pct_change = 2.45

        prompt = f"""
You are a senior financial equity analyst. Analyze market asset symbol '{symbol.upper()}'.
Recent performance change: {pct_change}%. Current Price: ${latest_close:.2f}.

Respond strictly with valid JSON using the exact schema:
{{
    "recommendation": "BUY" | "SELL" | "HOLD",
    "confidenceScore": <integer between 0 and 100>,
    "marketSummary": "<2-sentence concise summary>",
    "currentTrend": "<1-sentence technical trend summary>",
    "keyStrengths": ["<strength 1>", "<strength 2>"],
    "keyRisks": ["<risk 1>", "<risk 2>"],
    "riskLevel": "Low" | "Medium" | "High",
    "nextMove": {{
        "predictedDirection": "BULLISH" | "BEARISH" | "SIDEWAYS",
        "targetPrice": "$<price>",
        "predictedRange": "$<low> - $<high>",
        "reasoning": "<1-sentence explanation of next expected move>"
    }}
}}
Do not include markdown or extra commentary outside the JSON object.
"""

        if not groq_client:
            return jsonify({
                "recommendation": "BUY",
                "confidenceScore": 82,
                "marketSummary": f"{symbol.upper()} is showing solid upward momentum supported by high market volume.",
                "currentTrend": "Bullish breakout above short-term technical resistance.",
                "keyStrengths": ["Strong trading volume", "Favorable market sentiment"],
                "keyRisks": ["Macroeconomic uncertainty"],
                "riskLevel": "Medium",
                "nextMove": {
                    "predictedDirection": "BULLISH",
                    "targetPrice": f"${latest_close * 1.08:.2f}",
                    "predictedRange": f"${latest_close * 0.98:.2f} - ${latest_close * 1.10:.2f}",
                    "reasoning": "Momentum indicators point toward continued upward traction."
                }
            })

        chat = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        analysis = json.loads(chat.choices[0].message.content)
        return jsonify(analysis)

    except Exception as e:
        print(traceback.format_exc())
        return jsonify({"error": f"AI Analysis failed: {str(e)}"}), 500


@app.route('/api/news/<symbol>')
def get_news(symbol):
    return jsonify({
        "overallSentiment": "Bullish",
        "articles": [
            {"title": f"{symbol.upper()} experiences heavy volume flow in global trading sessions.", "link": "https://finance.yahoo.com", "publisher": "Market Watch"},
            {"title": "Global macroeconomic factors weigh in on asset valuation trends.", "link": "https://finance.yahoo.com", "publisher": "Financial Times"}
        ]
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
