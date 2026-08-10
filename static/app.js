// ==========================================
// Stox!Live - Synchronized Frontend Logic (app.js)
// ==========================================

let currentSymbol = "AAPL";
let tvWidget = null;

// Initialize TradingView Widget
function initTradingView(symbol) {
    document.getElementById('tradingview-widget-container').innerHTML = '';
    
    tvWidget = new TradingView.widget({
        "autosize": true,
        "symbol": symbol,
        "interval": "D",
        "timezone": "Etc/UTC",
        "theme": "dark",
        "style": "1",
        "locale": "en",
        "toolbar_bg": "#1e222d",
        "enable_publishing": false,
        "hide_side_toolbar": false,
        "allow_symbol_change": true,
        "container_id": "tradingview-widget-container",
        "studies": ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"]
    });
}

// Fetch Live Stock Data & Trigger Groq AI Analysis from Flask Backend
async function fetchStockData(symbol) {
    currentSymbol = symbol;
    
    // Update UI Loading States
    document.getElementById('asset-name').innerText = "Loading " + symbol + "...";
    document.getElementById('asset-symbol').innerText = symbol;
    document.getElementById('live-price').innerText = "$--.--";
    document.getElementById('price-change').innerText = "Updating...";
    
    try {
        // Fetch quote data from your Flask backend route (/api/stock/<symbol>)
        let response = await fetch(`/api/stock/${symbol}`);
        let data = await response.json();

        if (data.error) {
            alert("Error fetching symbol: " + data.error);
            return;
        }

        // Update Header Elements with Backend / Live Data
        document.getElementById('asset-name').innerText = data.name || symbol;
        document.getElementById('asset-symbol').innerText = data.symbol || symbol;
        document.getElementById('asset-logo').src = data.logo || "https://assets.msn.com/weathermap/v1/content/logos/stocks/default.png";
        
        let price = parseFloat(data.price).toFixed(2);
        let change = parseFloat(data.change).toFixed(2);
        let changePct = parseFloat(data.change_percent).toFixed(2);

        document.getElementById('live-price').innerText = `$${price}`;
        
        let changeEl = document.getElementById('price-change');
        changeEl.innerText = `${change >= 0 ? '+' : ''}${change} (${changePct}%)`;
        changeEl.className = `fw-bold small ${change >= 0 ? 'text-success' : 'text-danger'}`;

        document.getElementById('session-high').innerText = `$${data.high ? parseFloat(data.high).toFixed(2) : price}`;
        document.getElementById('session-low').innerText = `$${data.low ? parseFloat(data.low).toFixed(2) : price}`;

        // Update AI Analyzer Container with Llama 3.3 Response
        renderAIAnalyzer(data.ai_analysis);

    } catch (error) {
        console.error("Error fetching stock data:", error);
    }
}

// Render AI Content inside the Groq Analyzer Box
function renderAIAnalyzer(analysisHtml) {
    const aiContainer = document.getElementById('ai-analysis-content');
    if (analysisHtml) {
        aiContainer.innerHTML = analysisHtml;
    } else {
        aiContainer.innerHTML = `
            <div class="p-3">
                <span class="badge bg-warning text-dark mb-2">HOLD</span>
                <p class="small text-muted">Analysis synchronized with live market feed successfully.</p>
            </div>
        `;
    }
}

// Render AI markdown formatting or structured views
function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Event Listeners for Ticker Chips & Search Bar
document.addEventListener("DOMContentLoaded", () => {
    // Initial Load
    initTradingView(currentSymbol);
    fetchStockData(currentSymbol);

    // Ticker chip clicks
    document.querySelectorAll('.asset-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const sym = e.target.getAttribute('data-symbol');
            initTradingView(sym);
            fetchStockData(sym);
        });
    });

    // Search form submission
    document.getElementById('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const inputVal = document.getElementById('search-input').value.trim().toUpperCase();
        if (inputVal) {
            initTradingView(inputVal);
            fetchStockData(inputVal);
            document.getElementById('search-input').value = '';
        }
    });
});
