let currentSymbol = "AAPL";

function loadTradingViewWidgets(symbol) {
    // 1. Clear previous instances
    document.getElementById('tradingview-widget-container').innerHTML = '';
    document.getElementById('tradingview-symbol-info-container').innerHTML = '';

    // 2. Render TradingView Advanced Chart Widget
    new TradingView.widget({
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

    // 3. Render TradingView Symbol Info Widget (Handles live pricing matching the chart automatically)
    new TradingView.widget({
        "container_id": "tradingview-symbol-info-container",
        "width": "100%",
        "height": 110,
        "symbol": symbol,
        "locale": "en",
        "colorTheme": "dark",
        "isTransparent": true
    });

    // 4. Request AI Analysis from Backend passing only the symbol name
    fetchAIAnalysis(symbol);
}

async function fetchAIAnalysis(symbol) {
    const aiContainer = document.getElementById('ai-analysis-content');
    aiContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-info" role="status"></div>
            <p class="mt-2 text-muted small">Generating Llama 3.3 insights for ${symbol}...</p>
        </div>
    `;

    try {
        let response = await fetch(`/api/analyze/${symbol}`);
        let data = await response.json();
        if (data.analysis) {
            aiContainer.innerHTML = data.analysis;
        } else {
            aiContainer.innerHTML = `<p class="text-muted p-3">Live data synced via TradingView successfully.</p>`;
        }
    } catch (err) {
        aiContainer.innerHTML = `<p class="text-danger p-3">Error connecting to AI engine.</p>`;
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    loadTradingViewWidgets(currentSymbol);

    document.querySelectorAll('.asset-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const sym = e.target.getAttribute('data-symbol');
            loadTradingViewWidgets(sym);
        });
    });

    document.getElementById('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const inputVal = document.getElementById('search-input').value.trim().toUpperCase();
        if (inputVal) {
            loadTradingViewWidgets(inputVal);
            document.getElementById('search-input').value = '';
        }
    });
});
