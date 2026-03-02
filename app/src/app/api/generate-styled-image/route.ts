import { NextRequest, NextResponse } from 'next/server';
import { loadStyleReferences, buildMultimodalContent, generateCreativePrompt } from '@/lib/image-pipeline';

export async function POST(request: NextRequest) {
    console.log('API: generate-styled-image called');

    try {
        const { storyText, model, apiKey: clientApiKey, useStyleRefs = true, useCreativePrompt = true, customPrompt } = await request.json();

        const apiKey = clientApiKey || process.env.OPENROUTER_API_KEY || '';

        if (!storyText || !apiKey) {
            return NextResponse.json(
                { success: false, error: 'Missing storyText or apiKey' },
                { status: 400 }
            );
        }

        const selectedModel = model || 'google/gemini-3.1-flash-image-preview';

        // Step 1: Use custom prompt if provided, otherwise generate one
        let finalPrompt = storyText;
        if (customPrompt && customPrompt.trim().length > 0) {
            console.log('API: Using provided custom prompt');
            finalPrompt = customPrompt;
        } else if (useCreativePrompt) {
            console.log('API: Generating creative prompt...');
            finalPrompt = await generateCreativePrompt(storyText, apiKey);
            console.log('API: Creative prompt:', finalPrompt.substring(0, 100) + '...');
        }

        // Step 2: Load style references (optional)
        let styleImages: { base64: string; mimeType: string }[] = [];
        if (useStyleRefs) {
            console.log('API: Loading style references...');
            styleImages = loadStyleReferences();
        }

        // Step 3: Build multimodal content
        const multimodalContent = buildMultimodalContent(
            `CRITICAL STYLE INSTRUCTION: Generate an image that EXACTLY matches the visual style of the reference images provided.

The style is "Lo-Fi Digital Grit & Editorial Collage" with these MANDATORY elements:
- Heavy halftone dot patterns and digital noise/grain textures
- Duotone/tritone color treatment (blues, yellows, blacks - NOT realistic colors)
- Photomontage collage aesthetic with cutout elements
- Graphic overlays like data visualizations, geometric shapes
- Raw, urgent, retro-futuristic, slightly dystopian feel
- 16:9 aspect ratio

STUDY THE REFERENCE IMAGES CAREFULLY and replicate their exact aesthetic.

Now create an image in THIS EXACT STYLE that visualizes: ${finalPrompt}`,
            styleImages
        );

        console.log('API: Sending multimodal request to', selectedModel, 'with', styleImages.length, 'style refs');

        // Step 4: Try model with fallback on 429/5xx
        const FALLBACK_MODELS = [
            'google/gemini-3.1-flash-image-preview',
            'google/gemini-2.0-flash-001',
            'google/gemini-3-pro-image-preview',
        ];
        const modelsToTry = [selectedModel, ...FALLBACK_MODELS.filter(m => m !== selectedModel)];
        let imageUrl = '';
        let lastError = '';

        for (const tryModel of modelsToTry) {
            try {
                console.log(`API: Trying styled image with model: ${tryModel}`);
                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://cryptomafia-newsletter.local',
                        'X-Title': 'Crypto Mafia Styled Image Generator',
                    },
                    body: JSON.stringify({
                        model: tryModel,
                        modalities: ['image', 'text'],
                        messages: [{ role: 'user', content: multimodalContent }]
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    const errMsg = `${response.status} - ${errorText}`;
                    if (response.status === 429 || response.status >= 500) {
                        console.log(`API: Model ${tryModel} rate limited/error, trying next...`);
                        lastError = errMsg;
                        continue;
                    }
                    throw new Error(`OpenRouter API error: ${errMsg}`);
                }

                const data = await response.json();
                console.log(`API: Received response from ${tryModel}`);

                if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
                    imageUrl = data.choices[0].message.images[0].image_url.url;
                } else {
                    const content = data.choices?.[0]?.message?.content || '';
                    const urlMatch = content.match(/(https?:\/\/[^\s)]+|data:image\/[a-zA-Z]+;base64,[^\s)]+)/);
                    if (urlMatch) {
                        imageUrl = urlMatch[0];
                    } else {
                        lastError = 'No image in response';
                        continue;
                    }
                }
                if (imageUrl) break;
            } catch (err) {
                lastError = err instanceof Error ? err.message : String(err);
                throw err;
            }
        }

        if (!imageUrl) {
            throw new Error(`All models failed. Last error: ${lastError}`);
        }

        // Estimate cost based on model
        const costMap: Record<string, number> = {
            'google/gemini-3.1-flash-image-preview': 0.01,
            'google/gemini-3-pro-image-preview': 0.03,
            'google/gemini-2.0-flash-001': 0.02,
            'bytedance-seed/seedream-4.5': 0.02,
            'black-forest-labs/flux-pro-1.1': 0.04,
        };
        const estimatedCost = costMap[selectedModel] || 0.03;

        return NextResponse.json({
            success: true,
            imageUrl,
            prompt: finalPrompt,
            styleRefsUsed: styleImages.length,
            cost: estimatedCost,
            costSource: 'image-gen'
        });

    } catch (error) {
        console.error('Styled Image Gen Error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
