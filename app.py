"""
Stox! Live - Real-time Stock Analysis with TradingView & Groq AI
A full-stack Flask application integrating TradingView widgets and Groq AI analytics
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from groq import Groq
import requests
from datetime import datetime, timedelta
import os
import json
from functools import lru_cache
import logging

# Configuration
app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Groq client
GROQ_API_KEY = os.environ.get('GROQ_API_KEY', 'your-groq-api-key-here')
groq_client = Groq(api_key=GROQ_API_KEY)

# Asset registry: Map search terms to TradingView tickers
ASSET_REGISTRY = {
    # Stocks (US)
    'apple': {'symbol': 'AAPL', 'name': 'Apple Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:AAPL'},
    'microsoft': {'symbol': 'MSFT', 'name': 'Microsoft Corp.', 'type': 'stock', 'tv_symbol': 'NASDAQ:MSFT'},
    'google': {'symbol': 'GOOGL', 'name': 'Alphabet Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:GOOGL'},
    'amazon': {'symbol': 'AMZN', 'name': 'Amazon.com Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:AMZN'},
    'tesla': {'symbol': 'TSLA', 'name': 'Tesla Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:TSLA'},
    'meta': {'symbol': 'META', 'name': 'Meta Platforms Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:META'},
    'nvidia': {'symbol': 'NVDA', 'name': 'NVIDIA Corp.', 'type': 'stock', 'tv_symbol': 'NASDAQ:NVDA'},
    'amd': {'symbol': 'AMD', 'name': 'Advanced Micro Devices', 'type': 'stock', 'tv_symbol': 'NASDAQ:AMD'},
    'intel': {'symbol': 'INTC', 'name': 'Intel Corp.', 'type': 'stock', 'tv_symbol': 'NASDAQ:INTC'},
    'aapl': {'symbol': 'AAPL', 'name': 'Apple Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:AAPL'},
    'msft': {'symbol': 'MSFT', 'name': 'Microsoft Corp.', 'type': 'stock', 'tv_symbol': 'NASDAQ:MSFT'},
    'googl': {'symbol': 'GOOGL', 'name': 'Alphabet Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:GOOGL'},
    'amzn': {'symbol': 'AMZN', 'name': 'Amazon.com Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:AMZN'},
    'tsla': {'symbol': 'TSLA', 'name': 'Tesla Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:TSLA'},
    'meta': {'symbol': 'META', 'name': 'Meta Platforms Inc.', 'type': 'stock', 'tv_symbol': 'NASDAQ:META'},
    'nvda': {'symbol': 'NVDA', 'name': 'NVIDIA Corp.', 'type': 'stock', 'tv_symbol': 'NASDAQ:NVDA'},
    'amd': {'symbol': 'AMD', 'name': 'Advanced Micro Devices', 'type': 'stock', 'tv_symbol': 'NASDAQ:AMD'},
    'intc': {'symbol': 'INTC', 'name': 'Intel Corp.', 'type': 'stock', 'tv_symbol': 'NASDAQ:INTC'},
    
    # Cryptocurrencies
    'bitcoin': {'symbol': 'BTC', 'name': 'Bitcoin', 'type': 'crypto', 'tv_symbol': 'BITSTAMP:BTCUSD'},
    'ethereum': {'symbol': 'ETH', 'name': 'Ethereum', 'type': 'crypto', 'tv_symbol': 'BITSTAMP:ETHUSD'},
    'solana': {'symbol': 'SOL', 'name': 'Solana', 'type': 'crypto', 'tv_symbol': 'BINANCE:SOLUSDT'},
    'cardano': {'symbol': 'ADA', 'name': 'Cardano', 'type': 'crypto', 'tv_symbol': 'BINANCE:ADAUSDT'},
    'ripple': {'symbol': 'XRP', 'name': 'XRP', 'type': 'crypto', 'tv_symbol': 'BITSTAMP:XRPUSD'},
    'litecoin': {'symbol': 'LTC', 'name': 'Litecoin', 'type': 'crypto', 'tv_symbol': 'BITSTAMP:LTCUSD'},
    'dogecoin': {'symbol': 'DOGE', 'name': 'Dogecoin', 'type': 'crypto', 'tv_symbol': 'BINANCE:DOGEUSDT'},
    'btc': {'symbol': 'BTC', 'name': 'Bitcoin', 'type': 'crypto', 'tv_symbol': 'BITSTAMP:BTCUSD'},
    'eth': {'symbol': 'ETH', 'name': 'Ethereum', 'type': 'crypto', 'tv_symbol': 'BITSTAMP:ETHUSD'},
    'sol': {'symbol': 'SOL', 'name': 'Solana', 'type': 'crypto', 'tv_symbol': 'BINANCE:SOLUSDT'},
    'ada': {'symbol': 'ADA', 'name': 'Cardano', 'type': 'crypto', 'tv_symbol': 'BINANCE:ADAUSDT'},
    'xrp': {'symbol': 'XRP', 'name': 'XRP', 'type': 'crypto', 'tv_symbol': 'BITSTAMP:XRPUSD'},
    'ltc': {'symbol': 'LTC', 'name': 'Litecoin', 'type': 'crypto', 'tv_symbol': 'BITSTAMP:LTCUSD'},
    'doge': {'symbol': 'DOGE', 'name': 'Dogecoin', 'type': 'crypto', 'tv_symbol': 'BINANCE:DOGEUSDT'},
    
    # Commodities
    'gold': {'symbol': 'GC=F', 'name': 'Gold Futures', 'type': 'commodity', 'tv_symbol': 'NYMEX:GC1!'},
    'oil': {'symbol': 'CL=F', 'name': 'Crude Oil', 'type': 'commodity', 'tv_symbol': 'NYMEX:CL1!'},
    'natural_gas': {'symbol': 'NG=F', 'name': 'Natural Gas', 'type': 'commodity', 'tv_symbol': 'NYMEX:NG1!'},
    'copper': {'symbol': 'HG=F', 'name': 'Copper', 'type': 'commodity', 'tv_symbol': 'NYMEX:HG1!'},
    'silver': {'symbol': 'SI=F', 'name': 'Silver Futures', 'type': 'commodity', 'tv_symbol': 'NYMEX:SI1!'},
    
    # Indices
    'sp500': {'symbol': '^GSPC', 'name': 'S&P 500', 'type': 'index', 'tv_symbol': 'FOREXCOM:SPXUSD'},
    'nasdaq': {'symbol': '^IXIC', 'name': 'NASDAQ', 'type': 'index', 'tv_symbol': 'NASDAQ:NDX'},
    'dow': {'symbol': '^DJI', 'name': 'Dow Jones', 'type': 'index', 'tv_symbol': 'FOREXCOM:DXYUSD'},
}

# Financial news sources cache
@lru_cache(maxsize=128)
def get_mock_news(asset_symbol: str, asset_type: str) -> list:
    """Generate relevant news articles based on asset type"""
    base_news = {
        'stock': [
            {
                'title': f'{asset_symbol} Beats Q3 Earnings Expectations',
                'source': 'Reuters',
                'time': '2 hours ago',
                'summary': f'Latest earnings report shows strong performance for {asset_symbol}',
                'url': '#'
            },
            {
                'title': f'{asset_symbol} Stock Gains on Analyst Upgrade',
                'source': 'Bloomberg',
                'time': '4 hours ago',
                'summary': f'Major investment bank raises price target for {asset_symbol}',
                'url': '#'
            },
            {
                'title': f'Market Analysis: {asset_symbol} Trading Surge',
                'source': 'Financial Times',
                'time': '6 hours ago',
                'summary': f'Unusual volume and volatility in {asset_symbol} trading today',
                'url': '#'
            },
        ],
        'crypto': [
            {
                'title': f'{asset_symbol} Rally Accelerates on Market Optimism',
                'source': 'CoinDesk',
                'time': '1 hour ago',
                'summary': f'Cryptocurrency market strengthens with {asset_symbol} leading gains',
                'url': '#'
            },
            {
                'title': f'Regulatory News Impacts {asset_symbol} Price Action',
                'source': 'The Block',
                'time': '3 hours ago',
                'summary': f'Recent regulatory developments affecting {asset_symbol} market',
                'url': '#'
            },
        ],
        'commodity': [
            {
                'title': f'{asset_symbol} Prices Rise on Supply Concerns',
                'source': 'MarketWatch',
                'time': '2 hours ago',
                'summary': f'{asset_symbol} futures surge due to geopolitical tensions',
                'url': '#'
            },
            {
                'title': f'Technical Analysis: {asset_symbol} Breakout',
                'source': 'Seeking Alpha',
                'time': '5 hours ago',
                'summary': f'{asset_symbol} breaks through key technical resistance levels',
                'url': '#'
            },
        ],
        'index': [
            {
                'title': f'{asset_symbol} Index Hits New Milestone',
                'source': 'CNBC',
                'time': '1 hour ago',
                'summary': f'{asset_symbol} continues its bullish trend this week',
                'url': '#'
            },
            {
                'title': f'Market Outlook: {asset_symbol} Performance Analysis',
                'source': 'Investor\'s Business Daily',
                'time': '3 hours ago',
                'summary': f'Experts weigh in on {asset_symbol} short and long-term prospects',
                'url': '#'
            },
        ]
    }
    
    return base_news.get(asset_type, base_news['stock'])


@app.route('/')
def index():
    """Render main dashboard"""
    return render_template('index.html')


@app.route('/api/search', methods=['GET'])
def search_asset():
    """Search and resolve asset to TradingView ticker"""
    query = request.args.get('q', '').lower().strip()
    
    if not query or len(query) < 1:
        return jsonify({'error': 'Invalid search query'}), 400
    
    # Direct lookup in registry
    if query in ASSET_REGISTRY:
        asset = ASSET_REGISTRY[query].copy()
        return jsonify({
            'success': True,
            'asset': asset,
            'ticker_symbol': asset['tv_symbol']
        })
    
    # Fuzzy matching
    matches = []
    for key, value in ASSET_REGISTRY.items():
        if query in key or query in value['symbol'].lower():
            matches.append({
                'key': key,
                'symbol': value['symbol'],
                'name': value['name'],
                'tv_symbol': value['tv_symbol'],
                'type': value['type']
            })
    
    if matches:
        top_match = matches[0]
        return jsonify({
            'success': True,
            'asset': top_match,
            'ticker_symbol': top_match['tv_symbol'],
            'suggestions': matches[:5]
        })
    
    return jsonify({'error': 'Asset not found', 'suggestions': []}), 404


@app.route('/api/asset/<asset_symbol>', methods=['GET'])
def get_asset_data(asset_symbol):
    """Get asset information and prepare for analysis"""
    asset_symbol = asset_symbol.upper()
    
    # Resolve symbol from registry
    resolved_asset = None
    for key, value in ASSET_REGISTRY.items():
        if value['symbol'] == asset_symbol or value['tv_symbol'].endswith(':' + asset_symbol):
            resolved_asset = value
            break
    
    if not resolved_asset:
        return jsonify({'error': 'Asset not found'}), 404
    
    return jsonify({
        'symbol': resolved_asset['symbol'],
        'name': resolved_asset['name'],
        'tv_symbol': resolved_asset['tv_symbol'],
        'type': resolved_asset['type'],
        'data': {
            'current_price': 150.25,  # Will be updated by TradingView widget
            'high_52w': 165.50,
            'low_52w': 110.25,
            'pe_ratio': 28.5,
            'market_cap': '2.45T'
        }
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_with_groq():
    """Analyze asset using Groq AI with real-time chart data"""
    try:
        data = request.json
        asset_symbol = data.get('symbol', '').upper()
        asset_name = data.get('name', asset_symbol)
        asset_type = data.get('type', 'stock')
        
        # Chart data from frontend (TradingView widget data)
        current_price = data.get('current_price', 0)
        high_price = data.get('high_price', 0)
        low_price = data.get('low_price', 0)
        volume = data.get('volume', 0)
        price_change = data.get('price_change', 0)
        price_change_percent = data.get('price_change_percent', 0)
        chart_pattern = data.get('chart_pattern', 'neutral')
        
        # Validate data
        if not current_price or current_price <= 0:
            return jsonify({'error': 'Invalid price data'}), 400
        
        # Build analysis prompt
        analysis_prompt = f"""
You are an expert financial analyst with deep knowledge of technical analysis, market trends, and risk management.

Analyze the following {asset_type} asset and provide a detailed trading recommendation:

**Asset:** {asset_name} ({asset_symbol})
**Type:** {asset_type.capitalize()}
**Current Price:** ${current_price:,.2f}
**24h High:** ${high_price:,.2f}
**24h Low:** ${low_price:,.2f}
**Price Change:** ${price_change:,.2f} ({price_change_percent:+.2f}%)
**Volume:** {volume:,.0f}
**Chart Pattern:** {chart_pattern}

Based on this real-time data, provide your analysis in the following exact JSON format (no markdown, pure JSON only):
{{
    "recommendation": "BUY|SELL|HOLD",
    "confidence_score": 85,
    "market_summary": "Brief 1-2 sentence summary of current market sentiment",
    "technical_analysis": "Technical analysis explaining key levels and patterns",
    "price_targets": {{
        "bullish_target": {current_price * 1.15},
        "bearish_target": {current_price * 0.85},
        "neutral_range_high": {high_price},
        "neutral_range_low": {low_price}
    }},
    "next_moves": [
        "Specific action 1",
        "Specific action 2",
        "Specific action 3"
    ],
    "predicted_direction": "UP|DOWN|SIDEWAYS",
    "expected_range": {{
        "min": {low_price},
        "max": {high_price},
        "reasoning": "Explanation of expected range"
    }},
    "risk_level": "LOW|MEDIUM|HIGH",
    "key_support": {low_price},
    "key_resistance": {high_price}
}}

Provide only the JSON object, no additional text or markdown formatting.
"""
        
        # Call Groq API
        try:
            message = groq_client.messages.create(
                model="llama-3.3-70b-versatile",
                max_tokens=1000,
                messages=[
                    {
                        "role": "user",
                        "content": analysis_prompt
                    }
                ]
            )
            
            response_text = message.content[0].text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith('```'):
                response_text = response_text.split('```')[1]
                if response_text.startswith('json'):
                    response_text = response_text[4:]
            
            # Parse JSON response
            analysis = json.loads(response_text)
            
            return jsonify({
                'success': True,
                'analysis': analysis,
                'timestamp': datetime.now().isoformat(),
                'asset': {
                    'symbol': asset_symbol,
                    'name': asset_name,
                    'type': asset_type
                }
            })
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error: {e}")
            # Return fallback analysis
            return jsonify({
                'success': True,
                'analysis': generate_fallback_analysis(current_price, high_price, low_price),
                'timestamp': datetime.now().isoformat(),
                'asset': {
                    'symbol': asset_symbol,
                    'name': asset_name,
                    'type': asset_type
                }
            })
    
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        return jsonify({'error': str(e)}), 500


def generate_fallback_analysis(current_price, high_price, low_price):
    """Generate fallback analysis when Groq fails"""
    price_range = high_price - low_price
    mid_point = (high_price + low_price) / 2
    
    if current_price > mid_point:
        recommendation = "BUY"
        predicted = "UP"
        target = current_price * 1.10
    elif current_price < mid_point:
        recommendation = "SELL"
        predicted = "DOWN"
        target = current_price * 0.90
    else:
        recommendation = "HOLD"
        predicted = "SIDEWAYS"
        target = current_price
    
    return {
        "recommendation": recommendation,
        "confidence_score": 70,
        "market_summary": f"Asset trading near price levels with {price_range:.2f} volatility range",
        "technical_analysis": f"Current price near {current_price:.2f} showing {predicted.lower()} momentum",
        "price_targets": {
            "bullish_target": round(current_price * 1.15, 2),
            "bearish_target": round(current_price * 0.85, 2),
            "neutral_range_high": round(high_price, 2),
            "neutral_range_low": round(low_price, 2)
        },
        "next_moves": [
            f"Monitor price action around ${mid_point:.2f}",
            f"Watch for breakout above ${high_price:.2f}",
            f"Set stop loss at ${low_price:.2f}"
        ],
        "predicted_direction": predicted,
        "expected_range": {
            "min": round(low_price, 2),
            "max": round(high_price, 2),
            "reasoning": "Based on current price volatility and technical levels"
        },
        "risk_level": "MEDIUM",
        "key_support": round(low_price, 2),
        "key_resistance": round(high_price, 2)
    }


@app.route('/api/news/<asset_symbol>', methods=['GET'])
def get_news(asset_symbol):
    """Get news and market updates for asset"""
    asset_symbol = asset_symbol.upper()
    
    # Find asset type
    asset_type = 'stock'
    for key, value in ASSET_REGISTRY.items():
        if value['symbol'] == asset_symbol:
            asset_type = value['type']
            break
    
    news = get_mock_news(asset_symbol, asset_type)
    
    return jsonify({
        'symbol': asset_symbol,
        'news': news,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/favorites', methods=['GET', 'POST'])
def manage_favorites():
    """Manage user's favorite assets"""
    if request.method == 'POST':
        data = request.json
        symbol = data.get('symbol')
        action = data.get('action', 'add')
        
        # In production, save to database
        return jsonify({
            'success': True,
            'action': action,
            'symbol': symbol,
            'message': f'{symbol} {action}ed to favorites'
        })
    
    # GET: Return user's favorites
    return jsonify({
        'favorites': ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA']
    })


@app.route('/api/market-overview', methods=['GET'])
def get_market_overview():
    """Get overall market sentiment and key indices"""
    return jsonify({
        'indices': [
            {
                'name': 'S&P 500',
                'symbol': '^GSPC',
                'price': 4585.25,
                'change': 45.50,
                'change_percent': 1.00,
                'tv_symbol': 'FOREXCOM:SPXUSD'
            },
            {
                'name': 'NASDAQ 100',
                'symbol': '^IXIC',
                'price': 15920.75,
                'change': 125.30,
                'change_percent': 0.79,
                'tv_symbol': 'NASDAQ:NDX'
            },
            {
                'name': 'Dow Jones',
                'symbol': '^DJI',
                'price': 35875.50,
                'change': 215.25,
                'change_percent': 0.60,
                'tv_symbol': 'FOREXCOM:DXYUSD'
            }
        ],
        'market_sentiment': 'BULLISH',
        'vix': 18.5,
        'timestamp': datetime.now().isoformat()
    })


@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def server_error(error):
    logger.error(f"Server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
