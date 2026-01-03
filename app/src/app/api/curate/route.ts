import { NextResponse } from 'next/server';
import { curateNews } from '@/lib/smart-curator';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const apiKey = body.apiKey || process.env.OPENROUTER_API_KEY || '';
        const customFeeds = body.customFeeds || [];

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'API key required' },
                { status: 400 }
            );
        }

        // Run the smart curation
        const result = await curateNews(apiKey, undefined, customFeeds);

        // Estimate cost (~$0.02 per curation with Gemini Flash)
        const estimatedCost = 0.02;

        return NextResponse.json({
            success: true,
            count: result.stories.length,
            stories: result.stories,
            stats: result.stats,
            cost: estimatedCost,
            costSource: 'curate'
        });
    } catch (error) {
        console.error('Curation error:', error);
        return NextResponse.json(
            { success: false, error: 'Curation failed' },
            { status: 500 }
        );
    }
}
