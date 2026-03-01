import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ items: [], error: 'Supabase not configured' });
        }

        const response = await fetch(
            `${supabaseUrl}/rest/v1/x_news?order=fetched_at.desc&limit=20`,
            {
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                },
                cache: 'no-store',
            }
        );

        if (!response.ok) {
            return NextResponse.json({ items: [], error: 'Failed to fetch' });
        }

        const items = await response.json();

        const formatted = items.map((item: any) => ({
            id: item.id,
            author: item.author || 'X_Trending',
            title: item.headline || '',
            summary: item.headline || '',
            url: `https://x.com/search?q=${encodeURIComponent((item.headline || '').substring(0, 50))}`,
            postCount: item.post_count || 0,
            publishedAt: item.fetched_at,
        }));

        return NextResponse.json({ items: formatted, count: formatted.length });
    } catch (error) {
        console.error('X news API error:', error);
        return NextResponse.json({ items: [], error: 'Internal error' });
    }
}
