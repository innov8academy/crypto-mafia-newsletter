import { NewsletterConfig } from './types';

export const defaultConfig: NewsletterConfig = {
    name: "L8R by Crypto Mafia",
    tagline: "Cut Through the Noise. Stay Crypto.",
    voiceGuidelines: `
    - Write in Malayalam with English crypto terms
    - Casual, conversational tone
    - Use emojis liberally
    - Be enthusiastic but informative
    - Focus on practical implications for Kerala crypto investors
    - Cut through the hype - be honest about what matters
    - Add commentary and analysis, not just facts
  `,
    imageStylePrompt: `
    Modern crypto/finance illustration style, vibrant gradients with orange and gold tones,
    Bitcoin/blockchain-inspired geometric shapes, futuristic yet grounded feel,
    suitable for crypto newsletter targeting young investors
  `,
    rssFeeds: [
        // =====================
        // TIER 1: CRYPTO NEWSLETTERS (HIGH VALUE — each contains 5-10 curated stories)
        // =====================
        // Active daily newsletters
        {
            name: "The Pomp Letter",
            url: "https://pomp.substack.com/feed",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Wu Blockchain",
            url: "https://wublock.substack.com/feed",
            category: "newsletter",
            tier: 1
        },
        {
            name: "DeFi Weekly",
            url: "https://defiweekly.substack.com/feed",
            category: "newsletter",
            tier: 1
        },
        {
            name: "TLDR Crypto",
            url: "https://tldr.tech/crypto/rss",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Blockworks Daily",
            url: "https://blockworks.co/feed",
            category: "newsletter",
            tier: 1
        },
        {
            name: "The Defiant",
            url: "https://thedefiant.io/feed",
            category: "newsletter",
            tier: 1
        },

        // =====================
        // TIER 2: CRYPTO NEWS SITES (single stories, high volume, very fresh)
        // =====================
        {
            name: "CoinDesk",
            url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
            category: "news",
            tier: 2
        },
        {
            name: "Cointelegraph",
            url: "https://cointelegraph.com/rss",
            category: "news",
            tier: 2
        },
        {
            name: "Decrypt",
            url: "https://decrypt.co/feed",
            category: "news",
            tier: 2
        },
        {
            name: "The Block",
            url: "https://www.theblock.co/rss.xml",
            category: "news",
            tier: 2
        },
        {
            name: "Bitcoin Magazine",
            url: "https://bitcoinmagazine.com/.rss/full/",
            category: "news",
            tier: 2
        },
        {
            name: "AMBCrypto",
            url: "https://ambcrypto.com/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "U.Today",
            url: "https://u.today/rss",
            category: "news",
            tier: 2
        },
        {
            name: "CryptoBriefing",
            url: "https://cryptobriefing.com/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "CoinGape",
            url: "https://coingape.com/feed/",
            category: "news",
            tier: 2
        },

        // =====================
        // TIER 3: OFFICIAL BLOGS & RESEARCH (primary sources — important signals)
        // =====================
        {
            name: "Ethereum Blog",
            url: "https://blog.ethereum.org/feed.xml",
            category: "blog",
            tier: 3
        },
        {
            name: "Messari Research",
            url: "https://messari.io/rss",
            category: "blog",
            tier: 3
        },

        // =====================
        // TIER 4: COMMUNITY / SOCIAL (Reddit via Jina fallback)
        // =====================
        {
            name: "Hacker News Crypto",
            url: "https://hnrss.org/newest?q=Bitcoin+OR+Ethereum+OR+crypto+OR+blockchain&points=50",
            category: "social",
            tier: 4
        },
        {
            name: "r/CryptoCurrency",
            url: "https://www.reddit.com/r/CryptoCurrency/top/.rss?t=day",
            category: "social",
            tier: 4
        },
        {
            name: "r/Bitcoin",
            url: "https://www.reddit.com/r/Bitcoin/top/.rss?t=day",
            category: "social",
            tier: 4
        },
        {
            name: "r/Ethereum",
            url: "https://www.reddit.com/r/ethereum/top/.rss?t=day",
            category: "social",
            tier: 4
        },
        {
            name: "r/CryptoMarkets",
            url: "https://www.reddit.com/r/CryptoMarkets/top/.rss?t=day",
            category: "social",
            tier: 4
        },
        {
            name: "r/defi",
            url: "https://www.reddit.com/r/defi/top/.rss?t=day",
            category: "social",
            tier: 4
        }
    ]
};

// Scoring configuration — tuned for crypto audience
export const SCORING_CONFIG = {
    minScoreToShow: 6,
    crossSourceBoost: {
        twoSources: 1,
        threePlusSources: 2
    },
    categoryBoost: {
        security_breach: 2,     // Hacks are CRITICAL — affects portfolios
        price_movement: 1.5,    // Price = attention
        regulation: 1.5,        // Regulation moves markets
        protocol_upgrade: 1,    // Technical but important
        exchange_news: 1,       // CEX/DEX news
        defi_update: 1,         // DeFi protocol changes
    } as Record<string, number>,
    recencyBoostHours: 12,
    tierWeight: {
        1: 1.3,  // Newsletters (highest — curated, multi-story, most value)
        2: 0.7,  // News sites (lower — single stories, often rehashed across sites)
        3: 1.1,  // Official blogs (primary sources)
        4: 0.8   // Social
    } as Record<number, number>
};

// Prompt for extracting and scoring news stories
export const SMART_CURATION_PROMPT = `You are curating crypto news for "L8R by Crypto Mafia" — a newsletter for Kerala crypto investors.
Target Audience: 18-40 year old men in Kerala interested in crypto investing. They want "what happened" and "why it matters to MY portfolio".

TASK: Extract individual news stories that matter to crypto investors.

For EACH distinct news story, provide:
1. headline: Clear, punchy headline (max 12 words) — specific, not clickbait
2. summary: 3-4 sentences covering: WHAT happened? WHY should a crypto investor care? Include specific details (prices, dates, what changed).
3. category: One of [price_movement, exchange_news, defi_update, nft_news, regulation, security_breach, funding, partnership, protocol_upgrade, market_analysis]
4. baseScore: Score 1-10 based on importance:
   - 9-10: Major market events (BTC ATH, exchange collapse, landmark regulation)
   - 7-8: Significant protocol updates, major exchange news, whale movements
   - 5-6: DeFi updates, new token launches, partnership announcements
   - 3-4: Minor altcoin news, NFT drops, community governance votes
   - 1-2: Spam, irrelevant, promotional only
5. entities: List of companies/products/tokens mentioned
6. originalUrl: Source URL if mentioned

SCORING BOOSTS:
+1 if affects BTC, ETH, SOL, or MATIC (commonly held in India)
+1 if has Indian regulatory/market angle
-2 if just a corporate announcement with no shipping date
-1 if opinion/prediction with no actual news

RULES:
- Extract SEPARATE stories, not the whole newsletter
- Focus on the "Kerala Crypto Investor" angle
- Skip: job posts, sponsor sections, "also check out" links
- Max 6 stories per source

Return ONLY valid JSON array. No other text.`;
