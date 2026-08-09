document.addEventListener("DOMContentLoaded", () => {
    const searchForm = document.getElementById("searchForm");
    const searchInput = document.getElementById("searchInput");
    const loadingSection = document.getElementById("loadingSection");
    const messageBox = document.getElementById("messageBox");

    // Initial load defaults to BTC
    fetchStockData("BTC");

    searchForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const symbol = searchInput.value.trim();
        if (symbol) {
            fetchStockData(symbol);
        }
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

        // 1. Fetch Company/Asset Sync Data
        fetch(`/api/company/${symbol}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    throw new Error(data.error);
                }

                // Update Header UI
                document.getElementById("stockSymbol").textContent = `${data.companyName} (${data.symbol})` ;
                
                // Render TradingView Widgets
                renderTradingViewCharts(data.symbol, data.exchange);
                renderFundamentals(data.symbol);
                renderNews(data.symbol);

                // 2. Extract live price from page/widget to sync AI analysis
                setTimeout(() => {
                    let livePriceToSend = data.currentPrice;
                    
                    // Call AI Analysis endpoint with the live override parameter
                    fetch(`/api/analyze/${data.symbol}?live_price=${livePriceToSend}`)
                        .then(res => res.json())
                        .then(aiData => {
                            loadingSection.classList.add("hidden");
                            if (!aiData.error) {
                                updateAIUI(aiData);
                            } else {
                                console.error("AI Error:", aiData.error);
                            }
                        })
                        .catch(err => {
                            loadingSection.classList.add("hidden");
                            console.error("AI fetch failed:", err);
                        });
                }, 1000); // Small timeout to let TradingView components mount

            })
            .catch(err => {
                loadingSection.classList.add("hidden");
                showMessage(`Error loading symbol ${symbol}: ${err.message}`, true);
            });
    }

    function renderTradingViewCharts(symbol, exchange) {
        // Clear old containers
        document.getElementById("tradingview-container").innerHTML = "";
        document.getElementById("tradingview-ticker-container").innerHTML = "";

        // Single Ticker Widget
        new TradingView.widget({
            "container_id": "tradingview-ticker-container",
            "symbols": [[symbol, exchange]],
            "isTransparent": true,
            "colorTheme": "dark",
            "locale": "en",
            "width": "100%",
            "height": "75"
        });

        // Advanced Candlestick Chart Widget
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
        // Sentiment & Recommendation
        const aiSentiment = document.getElementById("aiSentiment");
        aiSentiment.textContent = data.recommendation;
        aiSentiment.className = `sentiment-badge ${data.recommendation.toLowerCase()}`;

        document.getElementById("aiConfidence").textContent = `${data.confidenceScore}%`;
        document.getElementById("aiSummary").textContent = data.marketSummary;
        document.getElementById("aiOutlook").textContent = data.currentTrend;

        // Next Move & Target
        const dirBadge = document.getElementById("predictedDirectionBadge");
        dirBadge.textContent = data.nextMove.predictedDirection;
        dirBadge.className = `sentiment-badge ${data.nextMove.predictedDirection.toLowerCase()}`;

        document.getElementById("targetPrice").textContent = data.nextMove.targetPrice;
        document.getElementById("predictedRange").textContent = data.nextMove.predictedRange;
        document.getElementById("nextMoveReasoning").textContent = data.nextMove.reasoning;

        // Strengths
        const posList = document.getElementById("positiveFactors");
        posList.innerHTML = "";
        if (data.keyStrengths) {
            data.keyStrengths.forEach(strength => {
                const li = document.createElement("li");
                li.textContent = strength;
                posList.appendChild(li);
            });
        }

        // Risks
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
