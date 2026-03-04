import { NextResponse } from 'next/server';
import { getCachedXNews, fetchAllXContent, isCacheFresh, XTweet } from '@/lib/x-api';

// Format XTweet[] into API response items
function formatTweets(tweets: XTweet[]) {
    return tweets.map(t => ({
        id: t.id,
        author: t.author_username,
        author_name: t.author_name,
        title: t.text.split('\n')[0].substring(0, 200),
        summary: t.text,
        url: t.url,
        publishedAt: t.created_at,
        likes: t.likes,
        retweets: t.retweets,
        impressions: t.impressions,
        engagement_score: t.engagement_score,
        source_method: t.source_method,
    }));
}

// GET — return cached X news (fast, no API calls)
export async function GET() {
    try {
        const cached = await getCachedXNews();
        const items = formatTweets(cached);
        return NextResponse.json({ items, count: items.length, cached: true });
    } catch (error) {
        console.error('X news GET error:', error);
        return NextResponse.json({ items: [], error: 'Internal error' });
    }
}

// POST — trigger fresh X API v2 fetch (with cache check)
export async function POST() {
    try {
        // Check if cache is still fresh
        const fresh = await isCacheFresh();
        if (fresh) {
            const cached = await getCachedXNews();
            const items = formatTweets(cached);
            return NextResponse.json({ items, count: items.length, cached: true });
        }

        // Fetch fresh data from X API v2
        const result = await fetchAllXContent();
        const items = formatTweets(result.tweets);

        return NextResponse.json({
            items,
            count: items.length,
            cached: result.cached,
            api_calls: result.api_calls_made,
            errors: result.errors.length > 0 ? result.errors : undefined,
        });
    } catch (error: any) {
        console.error('X news POST error:', error);

        // Fallback to cached data on error
        try {
            const cached = await getCachedXNews();
            const items = formatTweets(cached);
            return NextResponse.json({
                items,
                count: items.length,
                cached: true,
                error: error.message,
            });
        } catch {
            return NextResponse.json({ items: [], error: error.message });
        }
    }
}
