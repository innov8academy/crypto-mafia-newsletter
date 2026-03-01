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
        // TIER 1: CRYPTO NEWSLETTERS (HIGH VALUE — curated multi-story digests)
        // =====================
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
            name: "Unchained Newsletter",
            url: "https://unchainedcrypto.substack.com/feed",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Blockchain Bites",
            url: "https://blockchainbites.substack.com/feed",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Week in Ethereum",
            url: "https://weekinethereumnews.com/feed",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Crypto Pragmatist",
            url: "https://cryptopragmatist.substack.com/feed",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Milk Road",
            url: "https://rss.app/feeds/tkRbHtYWSDuIMjvt.xml",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Bankless",
            url: "https://rss.app/feeds/1PqhakD8jpPG5apa.xml",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Coinbase Bytes",
            url: "https://rss.app/feeds/tAdW3cALALcLfyS9.xml",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Glassnode Insights",
            url: "https://insights.glassnode.com/rss/",
            category: "newsletter",
            tier: 1
        },
        {
            name: "The DeFi Report",
            url: "https://thedefireport.substack.com/feed",
            category: "newsletter",
            tier: 1
        },
        {
            name: "The Daily Gwei",
            url: "https://thedailygwei.substack.com/feed",
            category: "newsletter",
            tier: 1
        },

        // =====================
        // TIER 2: CRYPTO NEWS SITES — HIGH VOLUME (single stories, very fresh, many per day)
        // These are the workhorses — lots of content, post 10-50x/day
        // =====================
        // CoinDesk — DEAD (blocked from server-side RSS)
        // {
        //     name: "CoinDesk",
        //     url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
        //     category: "news",
        //     tier: 2
        // },
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
        // Bitcoin Magazine — DEAD (blocked)
        // {
        //     name: "Bitcoin Magazine",
        //     url: "https://bitcoinmagazine.com/.rss/full/",
        //     category: "news",
        //     tier: 2
        // },
        {
            name: "BeInCrypto",
            url: "https://beincrypto.com/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "CryptoNews",
            url: "https://cryptonews.com/news/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "DL News",
            url: "https://www.dlnews.com/arc/outboundfeeds/rss/",
            category: "news",
            tier: 2
        },
        {
            name: "Unchained",
            url: "https://unchainedcrypto.com/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "CryptoBriefing",
            url: "https://cryptobriefing.com/feed/",
            category: "news",
            tier: 2
        },
        // U.Today — DEAD (blocked)
        // {
        //     name: "U.Today",
        //     url: "https://u.today/rss",
        //     category: "news",
        //     tier: 2
        // },
        {
            name: "AMBCrypto",
            url: "https://ambcrypto.com/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "Bitcoinist",
            url: "https://bitcoinist.com/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "NewsBTC",
            url: "https://www.newsbtc.com/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "CoinJournal",
            url: "https://coinjournal.net/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "Protos",
            url: "https://protos.com/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "CoinGape",
            url: "https://coingape.com/feed/",
            category: "news",
            tier: 2
        },
        // The Defiant — DEAD
        // {
        //     name: "The Defiant",
        //     url: "https://thedefiant.io/feed",
        //     category: "news",
        //     tier: 2
        // },
        {
            name: "Blockworks",
            url: "https://blockworks.co/feed",
            category: "news",
            tier: 2
        },

        // =====================
        // TIER 3: OFFICIAL BLOGS & RESEARCH (primary sources — rare but high signal)
        // =====================
        // Ethereum Blog — DEAD
        // {
        //     name: "Ethereum Blog",
        //     url: "https://blog.ethereum.org/feed.xml",
        //     category: "blog",
        //     tier: 3
        // },
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

// Scoring configuration — NEWSLETTERS GET 2x WEIGHT
export const SCORING_CONFIG = {
    minScoreToShow: 6, // Raised back — tier weights now properly boost newsletter stories
    crossSourceBoost: {
        twoSources: 1,
        threePlusSources: 2
    },
    categoryBoost: {
        security_breach: 2,
        price_movement: 1.5,
        regulation: 1.5,
        protocol_upgrade: 1,
        exchange_news: 1,
        defi_update: 1,
    } as Record<string, number>,
    recencyBoostHours: 12,
    tierWeight: {
        0: 1.2,  // X/Twitter — real-time, high-engagement crypto signal
        1: 2.0,  // Newsletters — HIGHEST. Curated, multi-story, most valuable
        2: 0.6,  // News sites — LOW. Single stories, often rehashed across sites
        3: 1.2,  // Official blogs — important primary sources
        4: 0.7   // Social — community signal
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
