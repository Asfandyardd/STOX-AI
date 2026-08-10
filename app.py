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
        # Prompt Groq Llama 3.3 for professional market insights without speculative pricing hallucination
        prompt = f"Provide a brief technical market outlook, key strengths, and risks for the stock/crypto symbol {symbol}. Keep it concise and professional without generating speculative target prices."
        
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
        )
        analysis_text = chat_completion.choices[0].message.content
        
        # Format output into clean HTML for your dashboard card
        formatted_html = f"""
            <div class="p-2">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-success text-dark">AI MODEL ACTIVE</span>
                    <span class="text-muted small">Asset: {symbol}</span>
                </div>
                <p class="small text-light" style="line-height: 1.5; max-height: 320px; overflow-y: auto;">
                    {analysis_text.replace('\n', '<br>')}
                </p>
            </div>
        """
        return jsonify({"analysis": formatted_html})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
