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

            renderHeaderMeta(companyRes);
            renderTradingViewWidgets(companyRes.symbol, companyRes.exchange);
            renderAIData(aiRes);
            renderNewsData(newsRes);

            hideElement(loadingSection);
            showElement(dashboard);

        } catch (err) {
            hideElement(loadingSection);
            showMessage(`Error: ${err.message}`, 'error');
        }
    }

    function renderHeaderMeta(data) {
        const symbolEl = document.getElementById('stockSymbol');
        if (symbolEl) {
            symbolEl.textContent = `${data.companyName} (${data.symbol})`;
        }
    }

    function renderTradingViewWidgets(symbol, exchange) {
        let fullTicker = exchange && exchange.includes(':') ? exchange : `NASDAQ:${symbol}`;

        // 1. Upper Right Live TradingView Quote Ticker Banner
        const tickerContainer = document.getElementById('tradingview-ticker-container');
        if (tickerContainer) {
            tickerContainer.innerHTML = `
                <iframe 
                    src="https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(fullTicker)}&interval=D&hidesidetoolbar=2&symboledit=0&saveimage=0&toolbarbg=f1f3f6&studies=[]&theme=dark&style=3&timezone=Etc%2FUTC" 
                    style="width: 100%; height: 85px; border: none; background: transparent;" 
                    allowtransparency="true" 
                    scrolling="no">
                </iframe>
            `;
        }

        // 2. Main Candlestick Chart Widget
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

        // 3. TradingView Fundamental Data & Financials Widget
        const fundContainer = document.getElementById('tradingview-fundamentals-container');
        if (fundContainer) {
            fundContainer.innerHTML = '';
            const widgetDiv = document.createElement('div');
            widgetDiv.className = "tradingview-widget-container";
            widgetDiv.style.width = "100%";
            widgetDiv.style.height = "100%";

            const innerWidget = document.createElement('div');
            innerWidget.className = "tradingview-widget-container__widget";
            widgetDiv.appendChild(innerWidget);

            const script = document.createElement('script');
            script.type = "text/javascript";
            script.src = "https://s3.tradingview.com/external-embedding/embed-widget-financials.js";
            script.async = true;
            script.innerHTML = JSON.stringify({
                "symbol": fullTicker,
                "colorTheme": "dark",
                "isTransparent": false,
                "largeChartUrl": "",
                "displayMode": "regular",
                "width": "100%",
                "height": "460",
                "locale": "en"
            });
            widgetDiv.appendChild(script);
            fundContainer.appendChild(widgetDiv);
        }
    }

    function renderAIData(ai) {
        if (!ai || ai.error) return;

        const aiSentimentEl = document.getElementById('aiSentiment');
        if (aiSentimentEl) {
            aiSentimentEl.textContent = ai.recommendation || "HOLD";
            aiSentimentEl.className = `sentiment-badge ${(ai.recommendation || 'hold').toLowerCase()}`;
        }

        const confidenceEl = document.getElementById('aiConfidence');
        if (confidenceEl) confidenceEl.textContent = `${ai.confidenceScore || 0}%`;

        const summaryEl = document.getElementById('aiSummary');
        if (summaryEl) summaryEl.textContent = ai.marketSummary || 'N/A';

        const outlookEl = document.getElementById('aiOutlook');
        if (outlookEl) outlookEl.textContent = ai.currentTrend || 'N/A';

        const riskEl = document.getElementById('riskLevel');
        if (riskEl) riskEl.textContent = ai.riskLevel || 'Medium';

        if (ai.nextMove) {
            const dirBadge = document.getElementById('predictedDirectionBadge');
            if (dirBadge) {
                dirBadge.textContent = ai.nextMove.predictedDirection || 'NEUTRAL';
                dirBadge.className = `sentiment-badge ${(ai.nextMove.predictedDirection || 'neutral').toLowerCase()}`;
            }

            const targetPriceEl = document.getElementById('targetPrice');
            if (targetPriceEl) targetPriceEl.textContent = ai.nextMove.targetPrice || '—';

            const predictedRangeEl = document.getElementById('predictedRange');
            if (predictedRangeEl) predictedRangeEl.textContent = ai.nextMove.predictedRange || '—';

            const reasoningEl = document.getElementById('nextMoveReasoning');
            if (reasoningEl) reasoningEl.textContent = ai.nextMove.reasoning || '';
        }

        const posEl = document.getElementById('positiveFactors');
        if (posEl) {
            posEl.innerHTML = (ai.keyStrengths || []).map(s => `<li>${s}</li>`).join('');
        }

        const riskFactorsEl = document.getElementById('riskFactors');
        if (riskFactorsEl) {
            riskFactorsEl.innerHTML = (ai.keyRisks || []).map(r => `<li>${r}</li>`).join('');
        }
    }

    function renderNewsData(news) {
        const newsListEl = document.getElementById('newsList');
        if (!newsListEl) return;
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
