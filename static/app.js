document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const stockSymbolTitle = document.getElementById("stockSymbol");
    const loadingSection = document.getElementById("loadingSection");
    const messageBox = document.getElementById("messageBox");
    const runAiBtn = document.getElementById("runAiBtn");

    let currentSymbol = "BTC";

    searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const symbol = searchInput.value.trim().toUpperCase();
        if (symbol) {
            loadAsset(symbol);
        }
    });

    if (runAiBtn) {
        runAiBtn.addEventListener("click", () => {
            triggerAIAnalysis(currentSymbol);
        });
    }

    function showMessage(msg, isError = false) {
        messageBox.textContent = msg;
        messageBox.className = `yf-alert ${isError ? "error" : "success"}`;
        messageBox.classList.remove("hidden");
        setTimeout(() => messageBox.classList.add("hidden"), 5000);
    }

    function loadAsset(symbol) {
        currentSymbol = symbol;
        loadingSection.classList.remove("hidden");

        fetch(`/api/company/${symbol}`)
            .then(res => res.json())
            .then(data => {
                loadingSection.classList.add("hidden");
                if (data.error) {
                    showMessage(data.error, true);
                    return;
                }

                stockSymbolTitle.textContent = `${data.companyName} (${data.symbol})`;
                
                // Reset AI Panel State
                document.getElementById("aiPromptState").classList.remove("hidden");
                document.getElementById("aiResultsContainer").classList.add("hidden");
                document.getElementById("aiSentiment").textContent = "READY";
                document.getElementById("aiSentiment").className = "sentiment-badge neutral";

                renderWidgets(data.symbol, data.exchange);
                fetchNews(data.symbol);
            })
            .catch(err => {
                loadingSection.classList.add("hidden");
                showMessage("Failed to connect to backend server.", true);
            });
    }

    function renderWidgets(symbol, exchange) {
        // 1. Candlestick Chart Widget
        document.getElementById("tradingview-container").innerHTML = "";
        new TradingView.widget({
            "width": "100%",
            "height": "480",
            "symbol": exchange,
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": false,
            "container_id": "tradingview-container"
        });

        // 2. TradingView Live Quote Widget
        document.getElementById("tradingview-quote-container").innerHTML = "";
        new TradingView.widget({
            "width": "100%",
            "height": 90,
            "symbol": exchange,
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#f1f3f6",
            "hide_top_toolbar": true,
            "hide_legend": true,
            "save_image": false,
            "container_id": "tradingview-quote-container"
        });

        // 3. TradingView Technical Analysis Widget (Replaced Key Stats)
        document.getElementById("tradingview-tech-container").innerHTML = "";
        new TradingView.widget({
            "width": "100%",
            "height": 420,
            "symbol": exchange,
            "interval": "1D",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "hide_top_toolbar": true,
            "container_id": "tradingview-tech-container"
        });
    }

    function fetchNews(symbol) {
        fetch(`/api/news/${symbol}`)
            .then(res => res.json())
            .then(data => {
                const newsList = document.getElementById("newsList");
                newsList.innerHTML = "";
                document.getElementById("newsSentiment").textContent = data.overallSentiment || "Bullish";

                data.articles.forEach(article => {
                    const item = document.createElement("div");
                    item.className = "news-item";
                    item.innerHTML = `
                        <a href="${article.link}" target="_blank" rel="noopener noreferrer">
                            <strong>${article.publisher}</strong>
                            <p>${article.title}</p>
                        </a>
                    `;
                    newsList.appendChild(item);
                });
            });
    }

    function triggerAIAnalysis(symbol) {
        runAiBtn.textContent = "Analyzing Live Chart Feeds...";
        runAiBtn.disabled = true;

        // Extract live price from TradingView or fallback to company endpoint
        fetch(`/api/company/${symbol}`)
            .then(res => res.json())
            .then(data => {
                return fetch(`/api/analyze/${symbol}?live_price=${data.currentPrice}`);
            })
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
                showMessage("Failed to generate AI analytics.", true);
            });
    }

    function updateAIUI(data) {
        document.getElementById("aiConfidence").textContent = `${data.confidenceScore}%`;
        document.getElementById("aiSummary").textContent = data.marketSummary;
        document.getElementById("aiOutlook").textContent = data.currentTrend;

        const targetPriceEl = document.getElementById("targetPrice");
        const predictedRangeEl = document.getElementById("predictedRange");
        const nextMoveReasoningEl = document.getElementById("nextMoveReasoning");
        const predictedDirectionBadge = document.getElementById("predictedDirectionBadge");

        if (data.nextMove) {
            targetPriceEl.textContent = data.nextMove.targetPrice;
            predictedRangeEl.textContent = data.nextMove.predictedRange;
            nextMoveReasoningEl.textContent = data.nextMove.reasoning;
            predictedDirectionBadge.textContent = data.nextMove.predictedDirection;
            predictedDirectionBadge.className = `sentiment-badge ${data.nextMove.predictedDirection.toLowerCase() === 'bullish' ? 'buy' : data.nextMove.predictedDirection.toLowerCase() === 'bearish' ? 'sell' : 'neutral'}`;
        }

        const aiSentiment = document.getElementById("aiSentiment");
        aiSentiment.textContent = data.recommendation;
        aiSentiment.className = `sentiment-badge ${data.recommendation.toLowerCase()}`;

        const posList = document.getElementById("positiveFactors");
        posList.innerHTML = "";
        (data.keyStrengths || []).forEach(strength => {
            const li = document.createElement("li");
            li.textContent = strength;
            posList.appendChild(li);
        });

        const riskList = document.getElementById("riskFactors");
        riskList.innerHTML = "";
        (data.keyRisks || []).forEach(risk => {
            const li = document.createElement("li");
            li.textContent = risk;
            riskList.appendChild(li);
        });
    }

    // Initial load
    loadAsset("BTC");
});
