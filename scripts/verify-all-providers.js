require('dotenv').config({ path: '.env.local' });

async function testProvider(name, url, key, model, payloadModifier = null) {
    console.log(`\n--- Testing Provider: ${name} ---`);
    console.log(`URL: ${url}`);
    console.log(`Model: ${model}`);

    if (!key) {
        console.error(`❌ Error: API Key for ${name} is missing`);
        return false;
    }

    const payload = {
        model: model,
        messages: [{ role: 'user', content: 'Di "OK" si puedes leer esto.' }],
        max_tokens: 10
    };

    if (payloadModifier) {
        payloadModifier(payload);
    }

    try {
        const headers = {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
        };

        // Add specific headers for specific providers
        if (name === 'Minimax' && process.env.MINIMAX_GROUP_ID) {
            headers['x-group-id'] = process.env.MINIMAX_GROUP_ID;
        }

        const res = await fetch(`${url}/chat/completions`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            const data = await res.json();
            console.log(`✅ SUCCESS! Response: ${data.choices?.[0]?.message?.content}`);
            return true;
        } else {
            const errorText = await res.text();
            console.error(`❌ FAILED! Status: ${res.status} ${res.statusText}`);
            console.error(`Error Body: ${errorText.substring(0, 200)}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ ERROR: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    console.log('🚀 Starting Multi-Model AI Verification...\n');

    // Test 1: Minimax
    await testProvider(
        'Minimax',
        process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1',
        process.env.MINIMAX_API_KEY,
        process.env.MINIMAX_DEFAULT_MODEL || 'minimax-m2.1'
    );

    // Test 2: OpenRouter
    await testProvider(
        'OpenRouter',
        process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
        process.env.OPENROUTER_API_KEY,
        process.env.OPENROUTER_DEFAULT_MODEL || 'z-ai/glm-4.5-air:free'
    );

    // Test 3: DeepSeek
    await testProvider(
        'DeepSeek',
        process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
        process.env.DEEPSEEK_API_KEY,
        process.env.DEEPSEEK_DEFAULT_MODEL || 'deepseek-chat'
    );

    console.log('\n🏁 All tests finished.');
}

runAllTests();
