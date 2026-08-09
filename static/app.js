/**
 * Stox! Live Frontend
 * Real-time stock analysis with TradingView & Groq AI
 */

// ============================================
// CONSTANTS & CONFIGURATION
// ============================================

const CONFIG = {
    API_BASE: '/api',
    DEBOUNCE_DELAY: 300,
    CHART_HEIGHT: 450,
    TOAST_DURATION: 4000,
    DEFAULT_ASSETS: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
};

// Asset cache
const assetCache = new Map();
let currentAsset = null;

// ============================================
// DOM ELEMENTS
// ============================================

const elements = {
    // Search
    searchInput: document.getElementById('assetSearch'),
    searchSuggestions: document.getElementById('searchSuggestions'),
    
    // Asset Header
    assetHeader: document.getElementById('assetHeader'),
    assetName: document.getElementById('assetName'),
    assetTicker: document.getElementById('assetTicker'),
    currentPrice: document.getElementById('currentPrice'),
    priceChange: document.getElementById('priceChange'),
    
    // Sections
    analysisContainer: document.getElementById('analysisContainer'),
    newsContainer: document.getElementById('newsContainer'),
    fundamentalsData: document.getElementById('fundamentalsData'),
    tradingviewChart: document.getElementById('tradingviewChart'),
    tradingviewTickerWidget: document.getElementById('tradingviewTickerWidget'),
    tradingviewFundamentals: document.getElementById('tradingviewFundamentals'),
    
    // Modal
    modal: document.getElementById('recommendationModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalClose: document.querySelector('.modal-close'),
    
    // UI Elements
    loadingSpinner: document.getElementById('loadingSpinner'),
    notificationToast: document.getElementById('notificationToast'),
    favoritesBtn: document.getElementById('favoritesBtn'),
    settingsBtn: document.getElementById('settingsBtn')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Debounce function to prevent excessive API calls
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
}

/**
 * Show loading spinner
 */
function showLoading(show = true) {
    if (show) {
        elements.loadingSpinner.classList.add('active');
    } else {
        elements.loadingSpinner.classList.remove('active');
    }
}

/**
 * Show notification toast
 */
function showNotification(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    elements.notificationToast.textContent = message;
    elements.notificationToast.className = `notification-toast ${type} show`;
    
    setTimeout(() => {
        elements.notificationToast.classList.remove('show');
    }, duration);
}

/**
 * Format number as currency
 */
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

/**
 * Format percentage
 */
function formatPercent(value, decimals = 2) {
    return (value >= 0 ? '+' : '') + value.toFixed(decimals) + '%';
}

/**
 * Format large numbers
 */
function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

/**
 * Handle asset search
 */
async function handleSearch(query) {
    if (!query || query.length < 1) {
        elements.searchSuggestions.classList.remove('active');
        return;
    }

    try {
        const response = await fetch(`${CONFIG.API_BASE}/search?q=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
            elements.searchSuggestions.classList.remove('active');
            return;
        }

        const data = await response.json();
        displaySearchSuggestions(data);
    } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.', 'error');
    }
}

/**
 * Display search suggestions
 */
function displaySearchSuggestions(data) {
    elements.searchSuggestions.innerHTML = '';

    const suggestions = data.suggestions || [];
    if (data.asset) {
        suggestions.unshift(data.asset);
    }

    if (suggestions.length === 0) {
        elements.searchSuggestions.innerHTML = `
            <div class="search-suggestion-item" style="text-align: center; color: #9e9e9e;">
                No results found
            </div>
        `;
        elements.searchSuggestions.classList.add('active');
        return;
    }

    suggestions.forEach(asset => {
        const item = document.createElement('div');
        item.className = 'search-suggestion-item';
        item.innerHTML = `
            <span class="suggestion-name">${asset.name}</span>
            <span class="suggestion-symbol">${asset.symbol} • ${asset.type}</span>
        `;
        item.addEventListener('click', () => selectAsset(asset));
        elements.searchSuggestions.appendChild(item);
    });

    elements.searchSuggestions.classList.add('active');
}

/**
 * Close search suggestions when clicking outside
 */
function closeSearchSuggestions() {
    elements.searchSuggestions.classList.remove('active');
}

/**
 * Setup search event listeners
 */
function setupSearchListeners() {
    elements.searchInput.addEventListener(
        'input',
        debounce((e) => handleSearch(e.target.value), CONFIG.DEBOUNCE_DELAY)
    );

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== elements.searchInput) {
            closeSearchSuggestions();
        }
    });

    elements.searchInput.addEventListener('focus', (e) => {
        if (e.target.value) {
            handleSearch(e.target.value);
        }
    });
}

// ============================================
// ASSET SELECTION & LOADING
// ============================================

/**
 * Select asset from search
 */
async function selectAsset(asset) {
    currentAsset = asset;
    elements.searchInput.value = asset.name;
    closeSearchSuggestions();
    
    await loadAsset(asset.symbol);
}

/**
 * Load asset data and initialize widgets
 */
async function loadAsset(symbol) {
    showLoading(true);

    try {
        // Check cache first
        if (assetCache.has(symbol)) {
            const asset = assetCache.get(symbol);
            updateAssetUI(asset);
            showLoading(false);
            return;
        }

        // Fetch asset data
        const response = await fetch(`${CONFIG.API_BASE}/asset/${symbol}`);
        if (!response.ok) {
            throw new Error('Asset not found');
        }

        const assetData = await response.json();
        assetCache.set(symbol, assetData);
        
        currentAsset = assetData;
        updateAssetUI(assetData);

        // Load additional data
        await Promise.all([
            loadNews(symbol),
            initializeTradingViewWidgets(assetData)
        ]);

        showNotification(`${assetData.name} loaded successfully`, 'success');
        
    } catch (error) {
        console.error('Asset loading error:', error);
        showNotification('Failed to load asset. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Update asset UI with new data
 */
function updateAssetUI(asset) {
    elements.assetName.textContent = asset.name || '-';
    elements.assetTicker.textContent = asset.symbol || '-';
    
    // Update price info (placeholder - will be updated by TradingView)
    const data = asset.data || {};
    elements.currentPrice.textContent = formatCurrency(data.current_price || 0);
    
    // Update fundamentals
    updateFundamentals(data);
}

/**
 * Update fundamentals display
 */
function updateFundamentals(data) {
    const items = elements.fundamentalsData.querySelectorAll('.fundamental-item');
    const values = [
        data.high_52w ? formatCurrency(data.high_52w) : '-',
        data.low_52w ? formatCurrency(data.low_52w) : '-',
        data.pe_ratio ? data.pe_ratio.toFixed(2) : '-',
        data.market_cap || '-'
    ];

    items.forEach((item, index) => {
        const valueSpan = item.querySelector('.fundamental-value');
        if (valueSpan && values[index]) {
            valueSpan.textContent = values[index];
        }
    });
}

// ============================================
// TRADINGVIEW WIDGET INTEGRATION
// ============================================

/**
 * Initialize TradingView widgets
 */
async function initializeTradingViewWidgets(asset) {
    try {
        // Clear existing widgets
        elements.tradingviewChart.innerHTML = '';
        elements.tradingviewTickerWidget.innerHTML = '<div class="tradingview-widget-container__widget"></div>';
        elements.tradingviewFundamentals.innerHTML = '<div class="tradingview-widget-container__widget"></div>';

        // Chart Widget
        const chartScript = document.createElement('script');
        chartScript.type = 'text/javascript';
        chartScript.src = 'https://s3.tradingview.com/tv.js';
        chartScript.async = true;
        chartScript.onload = () => {
            new TradingView.widget({
                autosize: true,
                symbol: asset.tv_symbol,
                interval: 'D',
                timezone: 'Etc/UTC',
                theme: 'dark',
                style: '1',
                locale: 'en',
                enable_publishing: false,
                allow_symbol_change: true,
                container_id: 'tradingviewChart',
                studies: ['Volume@tv-basicstudies', 'RSI@tv-basicstudies'],
            });
        };
        elements.tradingviewChart.appendChild(chartScript);

        // Ticker Widget
        const tickerScript = document.createElement('script');
        tickerScript.type = 'text/javascript';
        tickerScript.src = 'https://s3.tradingview.com/tv.js';
        tickerScript.async = true;
        tickerScript.onload = () => {
            new TradingView.ticker({
                symbols: [
                    { proName: asset.tv_symbol, title: asset.symbol }
                ],
                showSymbolLogo: true,
                locale: 'en',
                colorTheme: 'dark',
                isTransparent: false,
                container_id: 'tradingviewTickerWidget'
            });
        };
        elements.tradingviewTickerWidget.appendChild(tickerScript);

        // Fundamentals Widget
        const fundamentalsScript = document.createElement('script');
        fundamentalsScript.type = 'text/javascript';
        fundamentalsScript.src = 'https://s3.tradingview.com/tv.js';
        fundamentalsScript.async = true;
        fundamentalsScript.onload = () => {
            new TradingView.financialWidgets({
                locale: 'en',
                symbols: [asset.tv_symbol],
                theme: 'dark',
                container_id: 'tradingviewFundamentals'
            });
        };
        elements.tradingviewFundamentals.appendChild(fundamentalsScript);

        // After widgets load, trigger AI analysis
        setTimeout(() => analyzeWithAI(asset), 3000);

    } catch (error) {
        console.error('TradingView widget error:', error);
        elements.tradingviewChart.innerHTML = '<div class="chart-placeholder"><p>Chart failed to load</p></div>';
    }
}

// ============================================
// GROQ AI ANALYSIS
// ============================================

/**
 * Analyze asset with Groq AI
 */
async function analyzeWithAI(asset) {
    if (!asset) return;

    showLoading(true);

    try {
        // Get current chart data (mock - in production, would extract from TradingView widget)
        const chartData = {
            symbol: asset.symbol,
            name: asset.name,
            type: asset.type,
            current_price: 150.25,
            high_price: 155.50,
            low_price: 145.75,
            volume: 45000000,
            price_change: 3.25,
            price_change_percent: 2.21,
            chart_pattern: 'bullish_breakout'
        };

        const response = await fetch(`${CONFIG.API_BASE}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(chartData)
        });

        if (!response.ok) {
            throw new Error('Analysis failed');
        }

        const result = await response.json();
        displayAnalysis(result.analysis, asset);

    } catch (error) {
        console.error('Analysis error:', error);
        showNotification('AI analysis failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Display AI analysis results
 */
function displayAnalysis(analysis, asset) {
    const {
        recommendation,
        confidence_score,
        market_summary,
        technical_analysis,
        price_targets,
        next_moves,
        predicted_direction,
        expected_range,
        risk_level,
        key_support,
        key_resistance
    } = analysis;

    const recommendationClass = recommendation.toLowerCase();
    
    elements.analysisContainer.innerHTML = `
        <div class="recommendation-card">
            <div class="recommendation-header">
                <div>
                    <div class="recommendation-badge ${recommendationClass}">
                        ${recommendation}
                    </div>
                </div>
                <div class="confidence-score">
                    Confidence: ${confidence_score}%
                </div>
            </div>

            <div class="market-summary">
                ${market_summary}
            </div>

            <div class="recommendation-details">
                <div class="detail-item">
                    <div class="detail-label">Direction</div>
                    <div class="detail-value">${predicted_direction}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Risk Level</div>
                    <div class="detail-value">${risk_level}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Key Support</div>
                    <div class="detail-value">${formatCurrency(key_support)}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Key Resistance</div>
                    <div class="detail-value">${formatCurrency(key_resistance)}</div>
                </div>
            </div>

            <h4 style="margin-top: 20px; margin-bottom: 12px; color: #e8e8e8; font-weight: 600;">Price Targets</h4>
            <div class="price-targets">
                <div class="target-item">
                    <div class="target-label">Bullish Target</div>
                    <div class="target-value bullish">${formatCurrency(price_targets.bullish_target)}</div>
                </div>
                <div class="target-item">
                    <div class="target-label">Bearish Target</div>
                    <div class="target-value bearish">${formatCurrency(price_targets.bearish_target)}</div>
                </div>
                <div class="target-item">
                    <div class="target-label">High Range</div>
                    <div class="target-value">${formatCurrency(price_targets.neutral_range_high)}</div>
                </div>
                <div class="target-item">
                    <div class="target-label">Low Range</div>
                    <div class="target-value">${formatCurrency(price_targets.neutral_range_low)}</div>
                </div>
            </div>

            <h4 style="margin-top: 20px; margin-bottom: 12px; color: #e8e8e8; font-weight: 600;">Expected Price Range</h4>
            <div style="padding: 12px 16px; background-color: rgba(31, 149, 211, 0.05); border-left: 3px solid #1f95d3; border-radius: 6px;">
                <div style="font-size: 13px; color: #9e9e9e; margin-bottom: 4px;">Min: ${formatCurrency(expected_range.min)} | Max: ${formatCurrency(expected_range.max)}</div>
                <div style="font-size: 13px; color: #e8e8e8;">${expected_range.reasoning}</div>
            </div>

            <h4 style="margin-top: 20px; margin-bottom: 12px; color: #e8e8e8; font-weight: 600;">Next Moves</h4>
            <ul class="next-moves-list">
                ${next_moves.map(move => `<li class="next-move-item">${move}</li>`).join('')}
            </ul>

            <h4 style="margin-top: 20px; margin-bottom: 12px; color: #e8e8e8; font-weight: 600;">Technical Analysis</h4>
            <div style="padding: 12px 16px; background-color: var(--tertiary-bg); border-radius: 6px; color: var(--text-primary);">
                ${technical_analysis}
            </div>

            <button onclick="showAnalysisDetails('${asset.symbol}')" 
                    style="margin-top: 16px; padding: 10px 16px; background-color: var(--accent-primary); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                View Full Analysis
            </button>
        </div>
    `;
}

/**
 * Show full analysis in modal
 */
function showAnalysisDetails(symbol) {
    elements.modalTitle.textContent = `Detailed Analysis - ${symbol}`;
    elements.modalBody.innerHTML = `
        <p>Complete technical analysis and market insights for ${symbol}.</p>
        <p>This includes real-time chart pattern recognition, volume analysis, and momentum indicators powered by Groq AI's Llama-3.3-70b model.</p>
    `;
    elements.modal.classList.add('active');
}

// ============================================
// NEWS SECTION
// ============================================

/**
 * Load news for asset
 */
async function loadNews(symbol) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/news/${symbol}`);
        if (!response.ok) {
            throw new Error('News loading failed');
        }

        const data = await response.json();
        displayNews(data.news || []);

    } catch (error) {
        console.error('News loading error:', error);
    }
}

/**
 * Display news items
 */
function displayNews(news) {
    if (news.length === 0) {
        elements.newsContainer.innerHTML = '<div class="news-placeholder"><p>No news available</p></div>';
        return;
    }

    elements.newsContainer.innerHTML = news.map(item => `
        <div class="news-item">
            <div class="news-title">${item.title}</div>
            <div class="news-meta">
                <span class="news-source">${item.source}</span>
                <span class="news-time">${item.time}</span>
            </div>
            <div class="news-summary">${item.summary}</div>
        </div>
    `).join('');
}

// ============================================
// MODAL FUNCTIONALITY
// ============================================

/**
 * Setup modal event listeners
 */
function setupModalListeners() {
    elements.modalClose.addEventListener('click', () => {
        elements.modal.classList.remove('active');
    });

    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
            elements.modal.classList.remove('active');
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.modal.classList.contains('active')) {
            elements.modal.classList.remove('active');
        }
    });
}

// ============================================
// FAVORITES MANAGEMENT
// ============================================

/**
 * Load and display favorites
 */
async function loadFavorites() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/favorites`);
        if (!response.ok) {
            throw new Error('Favorites loading failed');
        }

        const data = await response.json();
        console.log('Favorites:', data.favorites);
        // Implement favorites UI here

    } catch (error) {
        console.error('Favorites error:', error);
    }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize application
 */
function initializeApp() {
    console.log('Initializing Stox! Live...');

    // Setup event listeners
    setupSearchListeners();
    setupModalListeners();

    // Setup button event listeners
    elements.favoritesBtn?.addEventListener('click', () => {
        showNotification('Favorites feature coming soon!', 'info');
    });

    elements.settingsBtn?.addEventListener('click', () => {
        showNotification('Settings panel coming soon!', 'info');
    });

    // Load default asset
    const defaultAsset = CONFIG.DEFAULT_ASSETS[0];
    
    // Mock asset object for initial load
    const mockAsset = {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        type: 'stock',
        tv_symbol: 'NASDAQ:AAPL',
        data: {
            current_price: 189.95,
            high_52w: 199.62,
            low_52w: 124.17,
            pe_ratio: 31.5,
            market_cap: '2.98T'
        }
    };

    // Set initial asset in UI
    elements.assetName.textContent = mockAsset.name;
    elements.assetTicker.textContent = mockAsset.symbol;
    currentAsset = mockAsset;
    elements.searchInput.value = mockAsset.name;

    // Initialize TradingView widgets
    initializeTradingViewWidgets(mockAsset);

    // Load initial news
    loadNews(mockAsset.symbol);

    showNotification('Welcome to Stox! Live - Real-time Stock Analysis', 'info');
}

// ============================================
// READY STATE HANDLING
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// ============================================
// EXPORT FOR EXTERNAL USE
// ============================================

window.StoxLive = {
    selectAsset,
    loadAsset,
    analyzeWithAI,
    showAnalysisDetails,
    showNotification
};
