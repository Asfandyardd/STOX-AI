@app.route('/api/analyze/<symbol>')
def analyze_stock(symbol):
    try:
        # Prompt instructing the AI to use general technical posture without fabricating wrong price tags
        prompt = f"Provide a brief technical market outlook, key strengths, risks, and actionable next moves (Buy, Hold, or Wait) for the ticker symbol {symbol}. Do not guess or specify random fixed target prices like $250 or $220 if they do not match the current trading value; keep strategic advice relative to current market structure."
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        analysis_text = chat_completion.choices[0].message.content
        
        formatted_html = f"""
            <div class="p-2">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-success text-dark">AI MODEL ACTIVE</span>
                    <span class="text-muted small">Asset: {symbol}</span>
                </div>
                <div class="small text-light" style="line-height: 1.5; max-height: 380px; overflow-y: auto;">
                    {analysis_text.replace('\n', '<br>')}
                </div>
            </div>
        """
        return jsonify({"analysis": formatted_html})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
