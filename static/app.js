document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    const loadingSection = document.getElementById('loadingSection');
    const dashboard = document.getElementById('dashboard');
    const messageBox = document.getElementById('messageBox');

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

        try {
            const [companyRes, aiRes, newsRes] = await Promise.all([
                fetchJSON(`/api/company/${symbol}`),
                fetchJSON(`/api/analyze/${symbol}`),
                fetchJSON(`/api/news/${symbol}`)
            ]);

            if (companyRes.error) throw new Error(companyRes.error);

            // 1. Resolve exact TradingView exchange syntax ticker string
            let fullTicker = companyRes.exchange && companyRes.exchange.includes(':') 
                ? companyRes.exchange 
                : `NASDAQ:${companyRes.symbol}`;

            // 2. Render TradingView Native Widgets (Chart + Symbol Info Header)
            renderTradingViewWidgets(fullTicker);

            // 3. Render AI Recommendations & News Data normally
            renderAIData(aiRes);
            renderNewsData(newsRes);

            hideElement(loadingSection);
            showElement(dashboard);

        } catch (err) {
            hideElement(loadingSection);
            showMessage(`Error: ${err.message}`, 'error');
        }
    }

    function renderTradingViewWidgets(fullTicker) {
        // --- A. Render Upper Price & Symbol Info Widget (Matches chart data 100%) ---
        const topInfoContainer = document.getElementById('topSymbolInfoContainer') || createTopInfoContainer();
        topInfoContainer.innerHTML = `
            <div class="tradingview-widget-container" style="width: 100%; height: 110px;">
              <div class="tradingview-widget-container__widget" style="height:100%;width:100%;"></div>
              <script type="text/javascript" src="https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js" async>
              {
                "symbol": "${fullTicker}",
                "width": "100%",
                "locale": "en",
                "colorTheme": "dark",
                "isTransparent": true
              }
              </script>
            </div>
        `;

        // --- B. Render Main Candlestick Chart Widget ---
        const chartContainer = document.getElementById('tradingview-container');
        if (chartContainer) {
            chartContainer.innerHTML = `
                <iframe 
                    src="https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(fullTicker)}&interval=D&hidesidetoolbar=1&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC" 
                    style="width: 100%; height: 100%; border: none;" 
                    allowtransparency="true" 
                    scrolling="no">
                </iframe>
            `;
        }
    }

    function createTopInfoContainer() {
        // Fallback helper if the DOM container container needs to be injected dynamically above the chart
        const container = document.createElement('div');
        container.id = 'topSymbolInfoContainer';
        container.style.marginBottom = '20px';
        const dashboardEl = document.getElementById('dashboard');
        if (dashboardEl) dashboardEl.prepend(container);
        return container;
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

    function showElement(el) { if (el) el.classList.remove('hidden'); }
    function hideElement(el) { if (el) el.classList.add('hidden'); }

    function showMessage(msg, type = 'info') {
        if (!messageBox) return;
        messageBox.textContent = msg;
        messageBox.className = `yf-alert ${type}`;
        showElement(messageBox);
    }
});
