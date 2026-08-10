let currentSymbol = "AAPL";

function loadDashboard(symbol) {
    currentSymbol = symbol.toUpperCase();

    document.getElementById('tradingview-widget-container').innerHTML = '';
    document.getElementById('tradingview-symbol-info-container').innerHTML = '';

    // Render Symbol Info Widget
    new TradingView.widget({
        "container_id": "tradingview-symbol-info-container",
        "width": "100%",
        "height": 115,
        "symbol": currentSymbol,
        "locale": "en",
        "colorTheme": "dark",
        "isTransparent": true
    });

    // Render Advanced Chart Widget
    new TradingView.widget({
        "autosize": true,
        "symbol": currentSymbol,
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

    fetchAIAnalysis(currentSymbol);
}

async function fetchAIAnalysis(symbol) {
    const aiContainer = document.getElementById('ai-analysis-content');
    aiContainer.innerHTML = `
        <div class="text-center py-4">
            <div class="spinner-border text-info spinner-border-sm" role="status"></div>
            <p class="mt-2 text-muted small">Generating Llama 3.3 insights for ${symbol}...</p>
        </div>
    `;

    try {
        let response = await fetch(`/api/analyze/${symbol}`);
        let data = await response.json();
        if (data.analysis) {
            aiContainer.innerHTML = data.analysis;
        } else {
            aiContainer.innerHTML = `<p class="text-muted p-3">Live data synced successfully.</p>`;
        }
    } catch (err) {
        aiContainer.innerHTML = `<p class="text-danger p-3">Error connecting to AI engine.</p>`;
    }
}

// Handle Follow-up Chat Questions
async function sendFollowUpQuestion(question) {
    const aiContainer = document.getElementById('ai-analysis-content');
    
    // Append user question to chat view
    aiContainer.innerHTML += `
        <div class="p-2 mt-2 bg-secondary bg-opacity-25 rounded">
            <span class="badge bg-dark text-white">You</span>
            <p class="small text-light mb-0 mt-1">${question}</p>
        </div>
    `;
    aiContainer.scrollTop = aiContainer.scrollHeight;

    try {
        let response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: currentSymbol, question: question })
        });
        let data = await response.json();
        
        if (data.answer) {
            aiContainer.innerHTML += `
                <div class="p-2 mt-2 bg-info bg-opacity-10 rounded border border-info border-opacity-25">
                    <span class="badge bg-info text-dark">Llama 3.3 AI</span>
                    <div class="small text-light mb-0 mt-1">${data.answer.replace('\n', '<br>')}</div>
                </div>
            `;
            aiContainer.scrollTop = aiContainer.scrollHeight;
        }
    } catch (err) {
        console.error("Chat error:", err);
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
    loadDashboard(currentSymbol);

    document.querySelectorAll('.asset-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            const sym = e.target.getAttribute('data-symbol');
            loadDashboard(sym);
        });
    });

    document.getElementById('search-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const inputVal = document.getElementById('search-input').value.trim().toUpperCase();
        if (inputVal) {
            loadDashboard(inputVal);
            document.getElementById('search-input').value = '';
        }
    });

    document.getElementById('ai-chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const inputField = document.getElementById('ai-chat-input');
        const question = inputField.value.trim();
        if (question) {
            sendFollowUpQuestion(question);
            inputField.value = '';
        }
    });
});
