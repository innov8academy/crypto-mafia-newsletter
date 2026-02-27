import * as cheerio from 'cheerio';

interface ScrapeResult {
    content: string;
    method: 'fetch' | 'jina' | 'firecrawl';
}

/**
 * Intelligent Scraping Service
 * Strategy:
 * 1. Try free/fast 'fetch' + Cheerio to get article text.
 * 2. If text is too short (likely JS-blocked), use Jina.ai (Free, High quality).
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
    try {
        // Method 1: Basic Fetch + Cheerio (Fastest, Free)
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            next: { revalidate: 3600 }
        });

        if (response.ok) {
            const html = await response.text();
            const $ = cheerio.load(html);

            // Remove clutter
            $('script, style, nav, footer, iframe, form').remove();

            // Try to find the article body
            const selectors = [
                'article',
                '[role="main"]',
                '.post-content',
                '.article-body',
                '.entry-content',
                'main'
            ];

            let text = '';
            for (const selector of selectors) {
                const element = $(selector);
                if (element.length > 0) {
                    text = element.text();
                    break;
                }
            }

            if (!text || text.length < 500) {
                text = $('body').text();
            }

            const cleanText = text.replace(/\s+/g, ' ').replace(/\n+/g, '\n').trim();

            if (cleanText.length > 600) {
                return { content: cleanText.substring(0, 15000), method: 'fetch' };
            }
        }
    } catch (e) {
        console.warn(`[Fast Fetch Failed] for ${url}:`, e);
    }

    // Method 2: Jina.ai (Free, Handles heavy JS/SPA)
    try {
        console.log(`[Jina Fallback] Scraping ${url}`);
        const jinaResponse = await fetch(`https://r.jina.ai/${url}`, {
            headers: { 'X-With-Generated-Alt': 'true' }
        });

        if (jinaResponse.ok) {
            const text = await jinaResponse.text();
            return { content: text.substring(0, 15000), method: 'jina' };
        }
    } catch (e) {
        console.error(`[Jina Failed] for ${url}:`, e);
    }

    return { content: '', method: 'fetch' };
}
