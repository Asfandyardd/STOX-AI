document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const loadingSection = document.getElementById("loadingSection");
    const messageBox = document.getElementById("messageBox");
    const runAiBtn = document.getElementById("runAiBtn");

    let currentActiveSymbol = "BTC";
    let currentExchangeString = "BINANCE:BTCUSDT";

    fetchStockData("BTC");

    searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const symbol = searchInput.value.trim();
        if (symbol) {
            fetchStockData(symbol);
        }
    });

    runAiBtn.addEventListener("click", () => {
        triggerAIAnalysis(currentActiveSymbol);
    });

    function showMessage(text, isError = false) {
        messageBox.textContent = text;
        messageBox.className = `yf-alert ${isError ? "error" : "success"} visible`;
        setTimeout(() => {
            messageBox.className = "yf-alert hidden";
        }, 4000);
    }

    function fetchStockData(symbol) {
        loadingSection.classList.remove("hidden");
        currentActiveSymbol = symbol.toUpperCase();

        // Reset AI panel view to prompt state on new search
        document.getElementById("aiPromptState").classList.remove("hidden");
        document.getElementById("aiResultsContainer").classList.add("hidden");
        document.getElementById("aiSentiment").textContent = "READY";
        document.getElementById("aiSentiment").className = "sentiment-badge neutral";

        fetch(`/api/company/${symbol}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }

                currentExchangeString = data.exchange;
                document.getElementById("stockSymbol").textContent = `${data.companyName} (${data.symbol})`;
                
                // Render Charts & Official TradingView Ticker Widget Quote
                renderTradingViewCharts(data.symbol, data.exchange);
                renderTradingViewQuote(data.exchange);
                renderFundamentals(data.symbol);
                renderNews(data.symbol);

                loadingSection.classList.add("hidden");
            })
            .catch(err => {
                loadingSection.classList.add("hidden");
                showMessage(`Error loading symbol ${symbol}: ${err.message}`, true);
            });
    }

    function renderTradingViewCharts(symbol, exchange) {
        document.getElementById("tradingview-container").innerHTML = "";

        new TradingView.widget({
            "container_id": "tradingview-container",
            "autosize": true,
            "symbol": exchange,
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "allow_symbol_change": true,
            "hide_side_toolbar": false,
            "details": true,
            "hotlist": true,
            "calendar": true,
            "support_host": "https://www.tradingview.com"
        });
    }

    function renderTradingViewQuote(exchange) {
        const container = document.getElementById("tradingview-quote-container");
        container.innerHTML = "";

        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "symbol": exchange,
            "width": "100%",
            "colorTheme": "dark",
            "isTransparent": true,
            "locale": "en"
        });
        container.appendChild(script);
    }

    function triggerAIAnalysis(symbol) {
        runAiBtn.textContent = "Analyzing Live Chart...";
        runAiBtn.disabled = true;

        fetch(`/api/analyze/${symbol}`)
            .then(res => res.json())
            .then(aiData => {
                runAiBtn.textContent = "🚀 Run Groq AI Analysis";
                runAiBtn.disabled = false;

                if (!aiData.error) {
                    document.getElementById("aiPromptState").classList.add("hidden");
                    document.getElementById("aiResultsContainer").classList.remove("hidden");
                    updateAIUI(aiData);
                } else {
                    showMessage(`AI Error: ${aiData.error}`, true);
                }
            })
            .catch(err => {
                runAiBtn.textContent = "🚀 Run Groq AI Analysis";
                runAiBtn.disabled = false;
                showMessage("Failed to connect to Groq AI analytics.", true);
            });
    }

    function renderFundamentals(symbol) {
        const container = document.getElementById("tradingview-fundamentals-container");
        container.innerHTML = "";
        
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-financials.js";
        script.async = true;
        script.innerHTML = JSON.stringify({
            "colorTheme": "dark",
            "isTransparent": true,
            "width": "100%",
            "height": "460",
            "symbol": symbol,
            "locale": "en"
        });
        container.appendChild(script);
    }

    function renderNews(symbol) {
        fetch(`/api/news/${symbol}`)
            .then(res => res.json())
            .then(data => {
                const newsList = document.getElementById("newsList");
                newsList.innerHTML = "";
                document.getElementById("newsSentiment").textContent = data.overallSentiment || "Bullish";

                if (data.articles && data.articles.length > 0) {
                    data.articles.forEach(article => {
                        const div = document.createElement("div");
                        div.className = "news-item";
                        div.innerHTML = `
                            <a href="${article.link}" target="_blank"><strong>${article.publisher}</strong></a>
                            <p>${article.title}</p>
                        `;
                        newsList.appendChild(div);
                    });
                }
            })
            .catch(err => console.error("News fetch error:", err));
    }

    function updateAIUI(data) {
        const aiSentiment = document.getElementById("aiSentiment");
        aiSentiment.textContent = data.recommendation;
        aiSentiment.className = `sentiment-badge ${data.recommendation.toLowerCase()}`;

        document.getElementById("aiConfidence").textContent = `${data.confidenceScore}%`;
        document.getElementById("aiSummary").textContent = data.marketSummary;
        document.getElementById("aiOutlook").textContent = data.currentTrend;

        const dirBadge = document.getElementById("predictedDirectionBadge");
        dirBadge.textContent = data.nextMove.predictedDirection;
        dirBadge.className = `sentiment-badge ${data.nextMove.predictedDirection.toLowerCase()}`;

        document.getElementById("targetPrice").textContent = data.nextMove.targetPrice;
        document.getElementById("predictedRange").textContent = data.nextMove.predictedRange;
        document.getElementById("nextMoveReasoning").textContent = data.nextMove.reasoning;

        const posList = document.getElementById("positiveFactors");
        posList.innerHTML = "";
        if (data.keyStrengths) {
            data.keyStrengths.forEach(strength => {
                const li = document.createElement("li");
                li.textContent = strength;
                posList.appendChild(li);
            });
        }

        const riskList = document.getElementById("riskFactors");
        riskList.innerHTML = "";
        if (data.keyRisks) {
            data.keyRisks.forEach(risk => {
                const li = document.createElement("li");
                li.textContent = risk;
                riskList.appendChild(li);
            });
        }
    }
});
