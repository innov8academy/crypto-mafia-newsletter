import { NewsItem, CuratedStory, CurationProgress } from './types';
import { defaultConfig, SCORING_CONFIG, SMART_CURATION_PROMPT } from './config';
import { fetchAllNews, filterByDate } from './news-fetcher';
import { scrapeUrl } from './firecrawl';

interface RawExtractedStory {
    headline: string;
    summary: string;
    category: string;
    baseScore: number;
    entities: string[];
    originalUrl: string | null;
}

// Generate unique ID
function generateId(text: string): string {
    let hash = 0;
    const str = `${text}-${Date.now()}-${Math.random()}`;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
}

// Normalize text for comparison
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

// Calculate similarity between two strings (Jaccard similarity)
function calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(normalizeText(text1).split(' ').filter(w => w.length > 3));
    const words2 = new Set(normalizeText(text2).split(' ').filter(w => w.length > 3));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
}

// Scrape content from URL using intelligent Cheerio + Jina pipeline
async function scrapeContent(url: string): Promise<string | null> {
    try {
        const result = await scrapeUrl(url);
        return result.content || null;
    } catch {
        return null;
    }
}

// Extract stories from a single news item using AI
async function extractStories(
    item: NewsItem,
    apiKey: string
): Promise<RawExtractedStory[]> {
    let content = item.content || item.summary || '';

    // Scrape if content is too short
    if (content.length < 500 && item.url) {
        const scraped = await scrapeContent(item.url);
        if (scraped) content = scraped;
    }

    // If still no content, return as single story
    if (!content || content.length < 100) {
        return [{
            headline: item.title,
            summary: item.summary || item.title,
            category: 'other',
            baseScore: 5,
            entities: [],
            originalUrl: item.url,
        }];
    }

    const prompt = `${SMART_CURATION_PROMPT}

SOURCE: ${item.sourceName}
TITLE: ${item.title}
DATE: ${item.publishedAt}

CONTENT:
${content.substring(0, 10000)}

Return JSON array only.`;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'L8R by Crypto Mafia',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.2,
                max_tokens: 3000,
            }),
        });

        if (!response.ok) {
            return [{
                headline: item.title,
                summary: item.summary || '',
                category: 'other',
                baseScore: 5,
                entities: [],
                originalUrl: item.url,
            }];
        }

        const data = await response.json();
        const content_response = data.choices?.[0]?.message?.content || '[]';

        const cleanContent = content_response
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();

        return JSON.parse(cleanContent);
    } catch {
        return [{
            headline: item.title,
            summary: item.summary || '',
            category: 'other',
            baseScore: 5,
            entities: [],
            originalUrl: item.url,
        }];
    }
}

// Main curation function
export async function curateNews(
    apiKey: string,
    onProgress?: (progress: CurationProgress) => void,
    customFeeds: any[] = []
): Promise<{ stories: CuratedStory[], stats: any }> { // Temporarily using any for stats to avoid import cycle issues if types verify slowly
    const stories: Map<string, CuratedStory> = new Map();
    const statsBreakdown: Record<string, { found: number, kept: number }> = {};

    // Stage 1: Fetch all RSS feeds
    // Merge default feeds with custom feeds
    const allFeeds = [...defaultConfig.rssFeeds, ...customFeeds];
    allFeeds.forEach(f => statsBreakdown[f.name] = { found: 0, kept: 0 });

    onProgress?.({ stage: 'fetching', current: 0, total: 1, message: `Fetching news from ${allFeeds.length} sources...` });

    const allNews = await fetchAllNews(allFeeds);

    // Track found counts
    allNews.forEach(item => {
        if (statsBreakdown[item.sourceName]) {
            statsBreakdown[item.sourceName].found++;
        }
    });

    // NEWSLETTER-FIRST BALANCING
    // X/Twitter news is handled separately in its own UI panel
    const candidateItems: NewsItem[] = [];
    const seenUrls = new Set<string>();

    // Build source → feed mapping to know tiers
    const feedTierMap = new Map<string, number>();
    allFeeds.forEach(f => feedTierMap.set(f.name, f.tier || 2));

    const itemsBySource = new Map<string, NewsItem[]>();
    allNews.forEach(item => {
        if (!itemsBySource.has(item.sourceName)) itemsBySource.set(item.sourceName, []);
        itemsBySource.get(item.sourceName)?.push(item);
    });

    // 1. NEWSLETTERS FIRST: Take ALL items from Tier 1 (newsletters)
    for (const [source, items] of itemsBySource) {
        const tier = feedTierMap.get(source) || 2;
        if (tier !== 1) continue;

        items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        const newsletterItems = items.slice(0, 5);
        newsletterItems.forEach(item => {
            if (!seenUrls.has(item.url)) {
                candidateItems.push(item);
                seenUrls.add(item.url);
            }
        });
    }

    console.log(`[Curator] Newsletter items: ${candidateItems.length}`);

    // 2. FILL: Add news sites, blogs, social (2 per source, up to limit)
    const TOTAL_LIMIT = 30;
    const QUOTA_PER_NON_NEWSLETTER = 2;

    for (const [source, items] of itemsBySource) {
        const tier = feedTierMap.get(source) || 2;
        if (tier === 1) continue; // Already handled

        if (candidateItems.length >= TOTAL_LIMIT) break;

        items.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
        const quotaItems = items.slice(0, QUOTA_PER_NON_NEWSLETTER);
        quotaItems.forEach(item => {
            if (!seenUrls.has(item.url) && candidateItems.length < TOTAL_LIMIT) {
                candidateItems.push(item);
                seenUrls.add(item.url);
            }
        });
    }

    // Sort candidates: newsletters first, then by date
    candidateItems.sort((a, b) => {
        const tierA = a.tier ?? (feedTierMap.get(a.sourceName) || 2);
        const tierB = b.tier ?? (feedTierMap.get(b.sourceName) || 2);
        if (tierA === 1 && tierB !== 1) return -1;
        if (tierA !== 1 && tierB === 1) return 1;
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    // Stage 2: Extract stories from each item
    const totalToProcess = Math.min(candidateItems.length, TOTAL_LIMIT);

    for (let i = 0; i < totalToProcess; i++) {
        const item = candidateItems[i];

        // Track stats
        if (statsBreakdown[item.sourceName]) {
            statsBreakdown[item.sourceName].kept++;
        }

        onProgress?.({
            stage: 'extracting',
            current: i + 1,
            total: totalToProcess,
            message: `Analyzing [${item.sourceName}] ${item.title.substring(0, 30)}...`
        });

        const extracted = await extractStories(item, apiKey);

        // Process each extracted story
        for (const raw of extracted) {
            // Find if similar story exists (deduplication)
            let matchedKey: string | null = null;
            let maxSimilarity = 0;

            for (const [key, existing] of stories) {
                const similarity = calculateSimilarity(raw.headline, existing.headline);
                if (similarity > 0.5 && similarity > maxSimilarity) {
                    matchedKey = key;
                    maxSimilarity = similarity;
                }
            }

            if (matchedKey) {
                // Merge with existing story (cross-source boost)
                const existing = stories.get(matchedKey)!;
                if (!existing.sources.includes(item.sourceName)) {
                    existing.sources.push(item.sourceName);
                    existing.crossSourceCount++;
                }

                // Take higher base score
                if (raw.baseScore > existing.baseScore) {
                    existing.baseScore = raw.baseScore;
                    existing.headline = raw.headline;
                    existing.summary = raw.summary;
                }
            } else {
                // New story — track tier for scoring weight
                const id = generateId(raw.headline);
                const storyTier = item.tier ?? (feedTierMap.get(item.sourceName) || 2);
                stories.set(id, {
                    id,
                    headline: raw.headline,
                    summary: raw.summary,
                    category: raw.category || 'other',
                    baseScore: raw.baseScore || 5,
                    finalScore: 0, // Calculate later
                    entities: raw.entities || [],
                    originalUrl: raw.originalUrl,
                    sources: [item.sourceName],
                    publishedAt: item.publishedAt,
                    crossSourceCount: 1,
                    boosts: [],
                    _tier: storyTier, // Internal: used for tier weight scoring
                } as CuratedStory & { _tier: number });
            }
        }

        // Small delay to avoid rate limits
        if (i < totalToProcess - 1) {
            await new Promise(r => setTimeout(r, 300));
        }
    }

    // Stage 3: Calculate final scores
    onProgress?.({ stage: 'scoring', current: 0, total: 1, message: 'Calculating final scores...' });

    const now = new Date();

    for (const story of stories.values()) {
        let finalScore = story.baseScore;
        const boosts: string[] = [];

        // Cross-source boost
        if (story.crossSourceCount >= 3) {
            finalScore += SCORING_CONFIG.crossSourceBoost.threePlusSources;
            boosts.push(`+${SCORING_CONFIG.crossSourceBoost.threePlusSources} (3+ sources)`);
        } else if (story.crossSourceCount >= 2) {
            finalScore += SCORING_CONFIG.crossSourceBoost.twoSources;
            boosts.push(`+${SCORING_CONFIG.crossSourceBoost.twoSources} (2 sources)`);
        }

        // Category boost
        const categoryBoost = SCORING_CONFIG.categoryBoost[story.category as keyof typeof SCORING_CONFIG.categoryBoost];
        if (categoryBoost) {
            finalScore += categoryBoost;
            boosts.push(`+${categoryBoost} (${story.category})`);
        }

        // Recency boost (reduced for balancing, but still active)
        const publishedAt = new Date(story.publishedAt);
        const hoursAgo = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < SCORING_CONFIG.recencyBoostHours) {
            finalScore += 1;
            boosts.push('+1 (recent)');
        }

        // Apply tier weight multiplier
        const storyTier = (story as any)._tier ?? 2;
        const tierWeight = SCORING_CONFIG.tierWeight[storyTier] ?? 1.0;
        if (tierWeight !== 1.0) {
            const before = finalScore;
            finalScore = Math.round(finalScore * tierWeight * 10) / 10;
            boosts.push(`×${tierWeight} (tier ${storyTier})`);
        }

        story.finalScore = Math.min(finalScore, 10); // Cap at 10
        story.boosts = boosts;
        // Clean up internal field
        delete (story as any)._tier;
    }

    // Filter and sort
    const result = Array.from(stories.values())
        .filter(s => s.finalScore >= SCORING_CONFIG.minScoreToShow)
        .sort((a, b) => b.finalScore - a.finalScore);

    onProgress?.({ stage: 'done', current: 1, total: 1, message: `Found ${result.length} curated stories` });

    const stats = {
        sourcesAnalyzed: allFeeds.length,
        totalArticlesFound: allNews.length,
        articlesProcessed: totalToProcess,
        breakdown: Object.entries(statsBreakdown).map(([name, counts]) => ({
            sourceName: name,
            found: counts.found,
            kept: counts.kept
        })).sort((a, b) => b.kept - a.kept)
    };

    return { stories: result, stats };
}
