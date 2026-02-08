require('dotenv').config({ path: '.env.local' });

async function testKilocode() {
    const apiKey = process.env.KILOCODE_API_KEY;
    const baseURL = process.env.KILOCODE_BASE_URL || 'https://kilocode.ai/api/openrouter';
    const model = process.env.KILOCODE_DEFAULT_MODEL || 'minimax/minimax-m2.1:free';

    console.log('--- Kilocode Verification Test ---');
    console.log(`Base URL: ${baseURL}`);
    console.log(`Model: ${model}`);

    if (!apiKey) {
        console.error('Error: KILOCODE_API_KEY is missing');
        return;
    }

    try {
        const res = await fetch(`${baseURL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://localhost:3000',
                'X-Title': 'Opttius-App'
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: 'Say OK' }],
                max_tokens: 10
            })
        });

        console.log(`Status: ${res.status} ${res.statusText}`);

        if (res.ok) {
            const data = await res.json();
            console.log(`✅ SUCCESS! Response:`, data.choices?.[0]?.message?.content);
        } else {
            const text = await res.text().catch(() => '');
            console.log(`❌ FAILED! Error Body: ${text.substring(0, 300)}`);
        }
    } catch (e) {
        console.log(`Network error: ${e.message}`);
    }
}

testKilocode();
