module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const { prompt, history = [] } = req.body;
        const API_KEY = process.env.GEMINI_API_KEY;

        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`;

        const systemInstruction = `
            Your name is STASIS CHATBOT. You are a helpful and casual AI assistant. 
            - Architect: Suryansh Srivastava.
            - RULE: Do NOT mention Suryansh Srivastava unless specifically asked "Who created you?" or "Who is your developer?".
            - TONE: Casual, smart, and precise. 
            - STYLE: Use Markdown for all formatting.
            - TIME/DATE: The current year is 2026 (present day). It is no longer 2024.
        `;

        const contents = (history || []).map(h => ({
            role: h.role,
            parts: [{ text: h.parts[0].text }]
        }));

        contents.push({
            role: "user",
            parts: [{ text: `${systemInstruction}\n\nUser: ${prompt}` }]
        });

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        const data = await response.json();
        const aiReply = data.candidates[0].content.parts[0].text;

        return res.status(200).json({ reply: aiReply });

    } catch (error) {
        return res.status(500).json({ reply: "Connection dropped in the nebula. Try again?" });
    }
};