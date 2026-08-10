from flask import Flask, render_template, jsonify
import os
from groq import Groq

app = Flask(__name__)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze/<symbol>')
def analyze_stock(symbol):
    try:
        # Prompt Groq Llama 3.3 to include a dedicated Next Moves section
        prompt = f"Provide a brief technical market outlook, key strengths, risks, and a clear 'Next Moves / Actionable Strategy' (e.g., Buy, Hold, or Wait for pullback) for the stock/crypto symbol {symbol}. Keep it concise and professional."
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        analysis_text = chat_completion.choices[0].message.content
        
        # Format output into clean HTML with distinct sections
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

if __name__ == '__main__':
    app.run(debug=True)
