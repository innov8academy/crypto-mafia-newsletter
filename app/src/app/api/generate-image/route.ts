import { NextRequest, NextResponse } from 'next/server';

const FALLBACK_MODELS = [
    'google/gemini-3.1-flash-image-preview',
    'google/gemini-2.0-flash-001',
    'google/gemini-3-pro-image-preview',
];

async function generateWithModel(prompt: string, selectedModel: string, apiKey: string): Promise<string> {
    const isChatModel = selectedModel.includes('gemini') || selectedModel.includes('seedream') || selectedModel.includes('gpt');

    if (isChatModel) {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://cryptomafia-newsletter.local',
                'X-Title': 'Crypto Mafia Image Generator',
            },
            body: JSON.stringify({
                model: selectedModel,
                modalities: ['image', 'text'],
                messages: [{ role: 'user', content: `Generate a photorealistic 16:9 image of: ${prompt}.` }],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status} - ${errorText}`);
        }

        const data = await response.json();
        // @ts-ignore
        if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
            // @ts-ignore
            return data.choices[0].message.images[0].image_url.url;
        }
        const content = data.choices?.[0]?.message?.content || '';
        const urlMatch = content.match(/(https?:\/\/[^\s)]+|data:image\/[a-zA-Z]+;base64,[^\s)]+)/);
        if (urlMatch) return urlMatch[0];
        throw new Error(`No URL in response: ${JSON.stringify(data).substring(0, 500)}`);
    } else {
        const response = await fetch('https://openrouter.ai/api/v1/images/generations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://cryptomafia-newsletter.local',
                'X-Title': 'Crypto Mafia Image Generator',
            },
            body: JSON.stringify({
                model: selectedModel,
                prompt: prompt,
                ...(selectedModel.includes('dall-e') ? { size: "1024x1024" } : {}),
                ...(selectedModel.includes('flux') ? { aspect_ratio: "16:9" } : {}),
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const url = data.data?.[0]?.url;
        if (!url) throw new Error('No image URL in response');
        return url;
    }
}

export async function POST(request: NextRequest) {
    console.log('API: generate-image called');
    try {
        const { prompt, model, apiKey: clientApiKey } = await request.json();
        const apiKey = clientApiKey || process.env.OPENROUTER_API_KEY || '';
        console.log('API: generate-image params:', { model, promptLength: prompt?.length });

        if (!prompt || !model || !apiKey) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const selectedModel = model || 'google/gemini-3.1-flash-image-preview';

        // Build fallback chain: selected model first, then others
        const modelsToTry = [selectedModel, ...FALLBACK_MODELS.filter(m => m !== selectedModel)];
        let imageUrl = '';
        let lastError = '';

        for (const tryModel of modelsToTry) {
            try {
                console.log(`API: Trying model: ${tryModel}`);
                imageUrl = await generateWithModel(prompt, tryModel, apiKey);
                if (imageUrl) {
                    console.log(`API: Success with model: ${tryModel}`);
                    break;
                }
            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
                console.log(`API: Model ${tryModel} failed (${lastError.substring(0, 100)}), trying next...`);
                // Only fallback on rate limits (429) or server errors (5xx)
                if (!lastError.includes('429') && !lastError.includes('500') && !lastError.includes('502') && !lastError.includes('503')) {
                    throw err; // Don't fallback on auth errors, bad requests, etc.
                }
            }
        }

        if (!imageUrl) {
            throw new Error(`All models failed. Last error: ${lastError}`);
        }

        return NextResponse.json({ success: true, imageUrl });

    } catch (error) {
        console.error('Image Gen Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
