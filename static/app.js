document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const messageBox = document.getElementById("messageBox");
    const loadingSection = document.getElementById("loadingSection");

    let currentSymbol = "TSLA";

    if (searchForm) {
        searchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const symbol = searchInput.value.trim();
            if (symbol) {
                loadStockData(symbol);
            }
        });
    }

    function showError(msg) {
        if (messageBox) {
            messageBox.textContent = msg;
            messageBox.classList.remove("hidden");
        }
    }

    function hideError() {
        if (messageBox) {
            messageBox.textContent = "";
            messageBox.classList.add("hidden");
        }
    }

    function showLoading(show) {
        if (loadingSection) {
            if (show) {
                loadingSection.classList.remove("hidden");
            } else {
                loadingSection.classList.add("hidden");
            }
        }
    }

    async function loadStockData(symbol) {
        hideError();
        showLoading(true);

        try {
            const resComp = await fetch(`/api/company/${symbol}`);
            const compData = await resComp.json();

            if (compData.error) {
                throw new Error(compData.error);
            }

            currentSymbol = compData.symbol;
            
            const stockSymbolEl = document.getElementById("stockSymbol");
            if (stockSymbolEl) {
                stockSymbolEl.textContent = `${compData.companyName} (${compData.symbol})`;
            }

            // Render exact TradingView Web Widgets
            renderTradingViewChart(compData.exchange);
            renderTradingViewTicker(compData.exchange);
            renderTradingViewFundamentals(compData.symbol);

            // Fetch AI Analysis synced with the exact exchange symbol data
            const resAnalyze = await fetch(`/api/analyze/${compData.symbol}?exchange=${encodeURIComponent(compData.exchange)}`);
            const aiData = await resAnalyze.json();
            if (!aiData.error) {
                updateAIUI(aiData);
            }

            const resNews = await fetch(`/api/news/${compData.symbol}`);
            const newsData = await resNews.json();
            if (!newsData.error) {
                updateNewsUI(newsData);
            }

        } catch (err) {
            showError(`Error: ${err.message}`);
        } finally {
            showLoading(false);
        }
    }

    function renderTradingViewChart(exchangeSymbol) {
        const container = document.getElementById("tradingview-container");
        if (!container) return;
        container.innerHTML = "";

        const widgetWrapper = document.createElement("div");
        widgetWrapper.className = "tradingview-widget-container";
        widgetWrapper.style.height = "100%";
        widgetWrapper.style.width = "100%";

        const widgetDiv = document.createElement("div");
        widgetDiv.className = "tradingview-widget-container__widget";
        widgetDiv.style.height = "calc(100% - 32px)";
        widgetDiv.style.width = "100%";
        widgetWrapper.appendChild(widgetDiv);

        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "autosize": true,
            "symbol": exchangeSymbol,
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": false,
            "calendar": false,
            "support_host": "https://www.tradingview.com"
        });
        widgetWrapper.appendChild(script);
        container.appendChild(widgetWrapper);
    }

    function renderTradingViewTicker(exchangeSymbol) {
        const container = document.getElementById("tradingview-ticker-container");
        if (!container) return;
        container.innerHTML = "";

        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "symbol": exchangeSymbol,
            "width": "100%",
            "colorTheme": "dark",
            "isTransparent": true,
            "locale": "en"
        });
        container.appendChild(script);
    }

    function renderTradingViewFundamentals(symbol) {
        const container = document.getElementById("tradingview-fundamentals-container");
        if (!container) return;
        container.innerHTML = "";

        // Uses TradingView Company Profile & Fundamental Data widget for exact web parity
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-financials.js";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "symbol": symbol,
            "colorTheme": "dark",
            "isTransparent": true,
            "largeChartUrl": "",
            "displayMode": "regular",
            "width": "100%",
            "height": "460",
            "locale": "en"
        });
        container.appendChild(script);
    }

    function updateAIUI(data) {
        const aiSentiment = document.getElementById("aiSentiment");
        if (aiSentiment) {
            aiSentiment.textContent = data.recommendation;
            aiSentiment.className = `sentiment-badge ${data.recommendation.toLowerCase()}`;
        }

        const aiConfidence = document.getElementById("aiConfidence");
        if (aiConfidence) aiConfidence.textContent = `${data.confidenceScore}%`;

        const aiSummary = document.getElementById("aiSummary");
        if (aiSummary) aiSummary.textContent = data.marketSummary;

        const aiOutlook = document.getElementById("aiOutlook");
        if (aiOutlook) aiOutlook.textContent = data.currentTrend;

        if (data.nextMove) {
            const dirBadge = document.getElementById("predictedDirectionBadge");
            if (dirBadge) {
                dirBadge.textContent = data.nextMove.predictedDirection;
                dirBadge.className = `sentiment-badge ${data.nextMove.predictedDirection.toLowerCase()}`;
            }
            const targetPrice = document.getElementById("targetPrice");
            if (targetPrice) targetPrice.textContent = data.nextMove.targetPrice;

            const predictedRange = document.getElementById("predictedRange");
            if (predictedRange) predictedRange.textContent = data.nextMove.predictedRange;

            const reasoning = document.getElementById("nextMoveReasoning");
            if (reasoning) reasoning.textContent = data.nextMove.reasoning;
        }

        const posList = document.getElementById("positiveFactors");
        if (posList) {
            posList.innerHTML = "";
            (data.keyStrengths || []).forEach(item => {
                const li = document.createElement("li");
                li.textContent = item;
                posList.appendChild(li);
            });
        }

        const riskList = document.getElementById("riskFactors");
        if (riskList) {
            riskList.innerHTML = "";
            (data.keyRisks || []).forEach(item => {
                const li = document.createElement("li");
                li.textContent = item;
                riskList.appendChild(li);
            });
        }
    }

    function updateNewsUI(data) {
        const newsSentiment = document.getElementById("newsSentiment");
        if (newsSentiment) {
            newsSentiment.textContent = data.overallSentiment;
            newsSentiment.className = `sentiment-badge ${data.overallSentiment.toLowerCase()}`;
        }

        const newsList = document.getElementById("newsList");
        if (newsList) {
            newsList.innerHTML = "";
            (data.articles || []).forEach(art => {
                const div = document.createElement("div");
                div.className = "news-item";
                div.innerHTML = `<a href="${art.link}" target="_blank">${art.title}</a><span class="yf-muted">${art.publisher}</span>`;
                newsList.appendChild(div);
            });
        }
    }

    loadStockData(currentSymbol);
});
