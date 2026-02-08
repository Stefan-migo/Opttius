require('dotenv').config({ path: '.env.local' });

async function testKilocode() {
    const apiKey = process.env.KILOCODE_API_KEY;
    const model = process.env.KILOCODE_DEFAULT_MODEL || 'minimax/minimax-m2.1:free';

    if (!apiKey) {
        console.error('Error: KILOCODE_API_KEY is missing');
        return;
    }

    const bases = [
        'https://api.aimlapi.com/v1',
        'https://api.kilo.ai/v1',
        'https://kilocode.ai/api/v1'
    ];

    for (const b of bases) {
        console.log(`\n--- Probing Base: ${b} ---`);
        try {
            const res = await fetch(`${b}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
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
                console.log(`SUCCESS! Response:`, data.choices?.[0]?.message?.content);
                return;
            } else {
                const text = await res.text().catch(() => '');
                console.log(`Error Body: ${text.substring(0, 100)}`);
                if (res.status === 401) console.log('Auth Failed: Invalid Key for this provider');
            }
        } catch (e) {
            console.log(`Network error: ${e.message}`);
        }
    }
}

testKilocode();
