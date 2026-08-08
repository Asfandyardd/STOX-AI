document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    const loadingSection = document.getElementById('loadingSection');
    const dashboard = document.getElementById('dashboard');
    const messageBox = document.getElementById('messageBox');

    let livePulseInterval = null;

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const symbol = searchInput.value.trim().toUpperCase();
            if (symbol) runDashboard(symbol);
        });
    }

    async function fetchJSON(url) {
        const res = await fetch(url);
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error(`Invalid non-JSON response from ${url}`);
        }
        return res.json();
    }

    async function runDashboard(symbol) {
        hideElement(messageBox);
        showElement(loadingSection);
        hideElement(dashboard);

        if (livePulseInterval) clearInterval(livePulseInterval);

        try {
            const [companyRes, aiRes, newsRes] = await Promise.all([
                fetchJSON(`/api/company/${symbol}`),
                fetchJSON(`/api/analyze/${symbol}`),
                fetchJSON(`/api/news/${symbol}`)
            ]);

            if (companyRes.error) throw new Error(companyRes.error);

            renderCompanyData(companyRes);
            // Pass the correct dynamic exchange from backend data (e.g., NYMEX, COMEX, BINANCE, NASDAQ)
            renderTradingViewWidget(companyRes.symbol, companyRes.exchange);
            renderAIData(aiRes);
            renderNewsData(newsRes);

            hideElement(loadingSection);
            showElement(dashboard);

            // Simulate real-time ticker pulsing
            startLiveTickSim(companyRes.currentPrice);

        } catch (err) {
            hideElement(loadingSection);
            showMessage(`Error: ${err.message}`, 'error');
        }
    }

    function renderCompanyData(data) {
        document.getElementById('stockSymbol').textContent = `${data.companyName} (${data.symbol})`;
        document.getElementById('currentPrice').textContent = `$${data.currentPrice.toFixed(2)}`;

        const diff = data.currentPrice - data.previousClose;
        const pct = data.previousClose ? ((diff / data.previousClose) * 100).toFixed(2) : '0.00';
        const sign = diff >= 0 ? '+' : '';

        const priceChangeEl = document.getElementById('priceChange');
        priceChangeEl.textContent = `${sign}$${diff.toFixed(2)} (${sign}${pct}%)`;
        priceChangeEl.className = `price-change ${diff >= 0 ? 'up' : 'down'}`;

        document.getElementById('previousClose').textContent = `$${data.previousClose.toFixed(2)}`;
        document.getElementById('dayRange').textContent = `$${data.low.toFixed(2)} - $${data.high.toFixed(2)}`;
        document.getElementById('volume').textContent = Number(data.volume).toLocaleString();
        document.getElementById('range52').textContent = `$${data.fiftyTwoWeekLow.toFixed(2)} - $${data.fiftyTwoWeekHigh.toFixed(2)}`;
    }

    function renderTradingViewWidget(symbol, exchange) {
        const container = document.getElementById('tradingview-container');
        if (!container) return;

        const cleanSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
        const validExchange = exchange || 'NASDAQ';
        const fullTicker = `${validExchange}:${cleanSymbol}`;

        container.innerHTML = `
            <iframe 
                src="https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(fullTicker)}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC" 
                style="width: 100%; height: 100%; border: none;" 
                allowtransparency="true" 
                scrolling="no">
            </iframe>
        `;
    }

    function renderAIData(ai) {
        if (ai.error) return;

        const aiSentimentEl = document.getElementById('aiSentiment');
        aiSentimentEl.textContent = ai.recommendation || "HOLD";
        aiSentimentEl.className = `sentiment-badge ${(ai.recommendation || 'hold').toLowerCase()}`;

        document.getElementById('aiConfidence').textContent = `${ai.confidenceScore || 0}%`;
        document.getElementById('aiSummary').textContent = ai.marketSummary || 'N/A';
        document.getElementById('aiOutlook').textContent = ai.currentTrend || 'N/A';
        document.getElementById('riskLevel').textContent = ai.riskLevel || 'Medium';

        if (ai.nextMove) {
            const dirBadge = document.getElementById('predictedDirectionBadge');
            dirBadge.textContent = ai.nextMove.predictedDirection || 'NEUTRAL';
            dirBadge.className = `sentiment-badge ${(ai.nextMove.predictedDirection || 'neutral').toLowerCase()}`;

            document.getElementById('targetPrice').textContent = ai.nextMove.targetPrice || '—';
            document.getElementById('predictedRange').textContent = ai.nextMove.predictedRange || '—';
            document.getElementById('nextMoveReasoning').textContent = ai.nextMove.reasoning || '';
        }

        document.getElementById('positiveFactors').innerHTML = (ai.keyStrengths || []).map(s => `<li>${s}</li>`).join('');
        document.getElementById('riskFactors').innerHTML = (ai.keyRisks || []).map(r => `<li>${r}</li>`).join('');
    }

    function renderNewsData(news) {
        const newsListEl = document.getElementById('newsList');
        if (!news.articles || news.articles.length === 0) {
            newsListEl.innerHTML = '<p class="yf-muted">No news updates available.</p>';
            return;
        }

        newsListEl.innerHTML = news.articles.map(art => `
            <div class="news-item">
                <a href="${art.link}" target="_blank">${art.title}</a>
                <p class="yf-muted" style="font-size:0.78rem; margin-top:0.2rem;">Source: ${art.publisher}</p>
            </div>
        `).join('');
    }

    function startLiveTickSim(basePrice) {
        let current = basePrice;
        livePulseInterval = setInterval(() => {
            const delta = (Math.random() - 0.49) * (basePrice * 0.001);
            current += delta;
            
            const priceEl = document.getElementById('currentPrice');
            const pulseEl = document.getElementById('livePulse');

            if (priceEl) {
                priceEl.textContent = `$${current.toFixed(2)}`;
                pulseEl.style.backgroundColor = delta >= 0 ? 'var(--yf-green)' : 'var(--yf-red)';
            }
        }, 3000);
    }

    function showElement(el) { if (el) el.classList.remove('hidden'); }
    function hideElement(el) { if (el) el.classList.add('hidden'); }

    function showMessage(msg, type = 'info') {
        if (!messageBox) return;
        messageBox.textContent = msg;
        messageBox.className = `yf-alert ${type}`;
        showElement(messageBox);
    }
});
