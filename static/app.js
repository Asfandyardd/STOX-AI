// Professional AI Stock Analyzer - Frontend Logic (app.js)
let currentSymbol = 'AAPL';
let tvWidget = null;

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    loadAssetData(currentSymbol);
    loadTradingViewChart(currentSymbol);
    fetchAIAnalysis(currentSymbol);
}

function setupEventListeners() {
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const input = document.getElementById('search-input');
            if (input && input.value.trim()) {
                currentSymbol = input.value.trim().toUpperCase();
                loadAssetData(currentSymbol);
                loadTradingViewChart(currentSymbol);
                fetchAIAnalysis(currentSymbol);
            }
        });
    }

    document.querySelectorAll('.asset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            currentSymbol = chip.getAttribute('data-symbol');
            loadAssetData(currentSymbol);
            loadTradingViewChart(currentSymbol);
            fetchAIAnalysis(currentSymbol);
        });
    });
}

async function loadAssetData(symbol) {
    try {
        const response = await fetch(`/api/company/${symbol}`);
        const data = await response.json();
        
        if (data.error) {
            console.error(data.error);
            return;
        }

        // Update Header UI Elements (Logo, Name, Price)
        const logoEl = document.getElementById('asset-logo');
        if (logoEl && data.logo) {
            logoEl.src = data.logo;
            logoEl.onerror = () => { logoEl.src = 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'; };
        }

        const nameEl = document.getElementById('asset-name');
        if (nameEl) nameEl.textContent = data.companyName;

        const symbolEl = document.getElementById('asset-symbol');
        if (symbolEl) symbolEl.textContent = data.symbol;

        const priceEl = document.getElementById('live-price');
        if (priceEl) priceEl.textContent = `$${data.currentPrice.toFixed(2)}`;

        const changeEl = document.getElementById('price-change');
        if (changeEl) {
            const diff = data.currentPrice - data.previousClose;
            const pct = (diff / data.previousClose) * 100;
            changeEl.textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(2)} (${pct.toFixed(2)}%)`;
            changeEl.className = diff >= 0 ? 'text-success font-weight-bold' : 'text-danger font-weight-bold';
        }

        const highEl = document.getElementById('session-high');
        if (highEl) highEl.textContent = `$${data.high.toFixed(2)}`;

        const lowEl = document.getElementById('session-low');
        if (lowEl) lowEl.textContent = `$${data.low.toFixed(2)}`;

    } catch (err) {
        console.error('Failed to load asset metadata:', err);
    }
}

function loadTradingViewChart(symbol) {
    const container = document.getElementById('tradingview-widget-container');
    if (!container) return;
    container.innerHTML = '';

    // Map symbol to TradingView exchange format natively
    let tvSymbol = `NASDAQ:${symbol}`;
    if (['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'].includes(symbol) || symbol.includes('USD')) {
        tvSymbol = `BINANCE:${symbol.replace('-USD', '')}USDT`;
    } else if (['GOLD', 'SILVER'].includes(symbol)) {
        tvSymbol = `TVC:${symbol}`;
    } else if (symbol === 'OIL') {
        tvSymbol = 'NYMEX:CL1!';
    }

    if (window.TradingView) {
        new window.TradingView.widget({
            "autosize": true,
            "symbol": tvSymbol,
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#1e222d",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "container_id": "tradingview-widget-container"
        });
    }
}

async function fetchAIAnalysis(symbol) {
    const aiContainer = document.getElementById('ai-analysis-content');
    if (aiContainer) {
        aiContainer.innerHTML = `<div class="text-center py-4"><div class="spinner-border text-info" role="status"></div><p class="mt-2 text-muted">Groq AI is analyzing live charts & price action...</p></div>`;
    }

    try {
        const response = await fetch(`/api/analyze/${symbol}`);
        const result = await response.json();

        if (result.error) {
            if (aiContainer) aiContainer.innerHTML = `<div class="alert alert-danger">Error: ${result.error}</div>`;
            return;
        }

        renderAIAnalysis(result);
    } catch (err) {
        console.error('AI Analysis failed:', err);
        if (aiContainer) aiContainer.innerHTML = `<div class="alert alert-danger">Failed to fetch AI analysis. Check API key configuration.</div>`;
    }
}

function renderAIAnalysis(data) {
    const aiContainer = document.getElementById('ai-analysis-content');
    if (!aiContainer) return;

    const recColor = data.recommendation === 'BUY' ? 'success' : data.recommendation === 'SELL' ? 'danger' : 'warning';

    aiContainer.innerHTML = `
        <div class="row align-items-center mb-3">
            <div class="col-6">
                <span class="badge bg-${recColor} fs-6 px-3 py-2">${data.recommendation}</span>
                <span class="ms-2 text-muted small">Confidence: <strong>${data.confidenceScore}%</strong></span>
            </div>
            <div class="col-6 text-end">
                <span class="badge bg-secondary">Risk: ${data.riskLevel}</span>
            </div>
        </div>
        <p class="market-summary text-light mb-2">${data.marketSummary}</p>
        <p class="current-trend text-info small mb-3"><i class="bi bi-graph-up-arrow"></i> ${data.currentTrend}</p>
        
        <div class="row mb-3">
            <div class="col-md-6">
                <h6 class="text-success small fw-bold">KEY STRENGTHS</h6>
                <ul class="list-unstyled small text-muted">
                    ${data.keyStrengths.map(s => `<li><i class="bi bi-check-circle text-success"></i> ${s}</li>`).join('')}
                </ul>
            </div>
            <div class="col-md-6">
                <h6 class="text-danger small fw-bold">KEY RISKS</h6>
                <ul class="list-unstyled small text-muted">
                    ${data.keyRisks.map(r => `<li><i class="bi bi-exclamation-circle text-danger"></i> ${r}</li>`).join('')}
                </ul>
            </div>
        </div>

        <div class="p-3 bg-dark rounded border border-secondary">
            <div class="d-flex justify-content-between text-small mb-1">
                <span>Predicted Direction: <strong class="text-white">${data.nextMove.predictedDirection}</strong></span>
                <span>Target: <strong class="text-success">${data.nextMove.targetPrice}</strong></span>
            </div>
            <div class="text-muted small">
                <em>Reasoning:</em> ${data.nextMove.reasoning}
            </div>
        </div>
    `;
}
