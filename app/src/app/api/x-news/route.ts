import { NextResponse } from 'next/server';

// Filter X news with AI to remove spam, scams, and low-quality content
async function filterXNewsWithAI(items: any[], apiKey: string): Promise<any[]> {
    if (items.length === 0) return [];

    const headlines = items.map((item, i) => `${i}. ${item.headline}`).join('\n');

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [{
                    role: 'user',
                    content: `You are filtering crypto news headlines for a newsletter. Return ONLY the indices (numbers) of headlines that are REAL crypto news worth reading.

KEEP: Market moves, regulation, protocol updates, exchange news, ETF news, whale activity, major predictions from known analysts, industry developments.

REMOVE: Spam, scams, shilling, random tweets/opinions, non-English, personal reactions, "DM me", pump signals, recovery scams, just hashtags, links-only, vague motivational quotes, trading signals.

Headlines:
${headlines}

Return ONLY a JSON array of index numbers to KEEP. Example: [0, 3, 7, 11]
Return ONLY valid JSON, nothing else.`
                }],
                temperature: 0.1,
                max_tokens: 200,
            }),
        });

        if (!response.ok) return items; // Fallback: return all if AI fails

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '[]';
        const keepIndices: number[] = JSON.parse(content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());

        return keepIndices.filter(i => i >= 0 && i < items.length).map(i => items[i]);
    } catch {
        return items; // Fallback: return all if parsing fails
    }
}

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const apiKey = process.env.OPENROUTER_API_KEY || '';

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ items: [], error: 'Supabase not configured' });
        }

        const response = await fetch(
            `${supabaseUrl}/rest/v1/x_news?order=fetched_at.desc&limit=30`,
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

        const rawItems = await response.json();

        // Deduplicate by headline similarity before AI filter
        const deduped: any[] = [];
        const seenNormalized = new Set<string>();
        for (const item of rawItems) {
            const headline = (item.headline || '').toLowerCase();
            // Normalize: remove emoji, special chars, extra spaces
            const normalized = headline
                .replace(/[^\w\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 60);
            
            // Check for near-duplicates using first 40 chars
            const shortKey = normalized.substring(0, 40);
            if (seenNormalized.has(shortKey)) continue;
            
            // Also check word overlap with existing items
            const words = new Set(normalized.split(' ').filter((w: string) => w.length > 3));
            let isDupe = false;
            for (const seen of seenNormalized) {
                const seenWords = new Set(seen.split(' ').filter((w: string) => w.length > 3));
                if (seenWords.size === 0 || words.size === 0) continue;
                const overlap = [...words].filter(w => seenWords.has(w)).length;
                if (overlap / Math.max(words.size, seenWords.size) > 0.5) {
                    isDupe = true;
                    break;
                }
            }
            if (isDupe) continue;

            seenNormalized.add(normalized);
            deduped.push(item);
        }

        console.log(`[X News] ${rawItems.length} raw → ${deduped.length} after dedup`);

        // AI filter to remove spam/scams
        const filtered = apiKey ? await filterXNewsWithAI(deduped, apiKey) : deduped;

        const formatted = filtered.map((item: any) => ({
            id: item.id,
            author: item.author || 'X_Trending',
            title: item.headline || '',
            summary: item.headline || '',
            url: `https://x.com/search?q=${encodeURIComponent((item.headline || '').substring(0, 50))}`,
            postCount: item.post_count || 0,
            publishedAt: item.fetched_at,
        }));

        return NextResponse.json({ items: formatted, count: formatted.length, filtered: rawItems.length - filtered.length });
    } catch (error) {
        console.error('X news API error:', error);
        return NextResponse.json({ items: [], error: 'Internal error' });
    }
}
