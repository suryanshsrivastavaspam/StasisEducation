const https = require('https');

function postRequest(url, body) {
    return new Promise((resolve, reject) => {
        const u = new URL(url);
        const options = {
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: data
                });
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(body);
        req.end();
    });
}

exports.handler = async function (event, context) {
    // Handle CORS Preflight
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            },
            body: '',
        };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: 'Method Not Allowed',
        };
    }

    try {
        const { prompt, history = [] } = JSON.parse(event.body || '{}');
        const API_KEY = process.env.GEMINI_API_KEY;

        if (!API_KEY) {
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reply: "API Key is missing. Please add the GEMINI_API_KEY environment variable in Netlify's Site settings (under Site configuration -> Environment variables)." }),
            };
        }

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

        const reqBody = JSON.stringify({ contents });
        const apiResponse = await postRequest(API_URL, reqBody);
        
        const data = JSON.parse(apiResponse.body);
        
        if (data.error) {
            console.error("Gemini API Error:", data.error);
            return {
                statusCode: 500,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reply: "The cosmic frequency is distorted. Please verify your Gemini API key in Netlify settings." }),
            };
        }

        const aiReply = data.candidates[0].content.parts[0].text;

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reply: aiReply }),
        };

    } catch (error) {
        console.error("Handler Error:", error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ reply: "Connection dropped in the nebula. Try again?" }),
        };
    }
};
