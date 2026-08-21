from flask import Flask, render_template, jsonify, request
import os
from groq import Groq

# Initialize Flask app FIRST before any routes
app = Flask(__name__)
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/analyze/<symbol>')
def analyze_stock(symbol):
    try:
        prompt = f"Provide a brief technical market outlook, key strengths, risks, and actionable next moves (Buy, Hold, or Wait) for the ticker symbol {symbol}. Do not guess or specify random fixed target prices if they do not match the current trading value; keep strategic advice relative to current market structure."
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-120b",
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

@app.route('/api/chat', methods=['POST'])
def chat_stock():
    try:
        data = request.json
        symbol = data.get('symbol', 'AAPL')
        question = data.get('question', '')
        
        prompt = f"Regarding the stock/crypto symbol {symbol}, answer this user question concisely and professionally: {question}"
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="openai/gpt-oss-120b",
        )
        answer = chat_completion.choices[0].message.content
        return jsonify({"answer": answer})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
