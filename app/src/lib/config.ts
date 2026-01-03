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
    // Expanded RSS feeds - newsletters and news sources
    rssFeeds: [
        // =====================
        // TIER 1: CRYPTO NEWSLETTERS (contain multiple stories - need extraction)
        // =====================
        {
            name: "Milk Road",
            url: "https://rss.beehiiv.com/feeds/v3hqiCe5Vw.xml",
            category: "newsletter",
            tier: 1
        },
        {
            name: "Bankless",
            url: "https://rss.beehiiv.com/feeds/2aeCe5g0lR.xml",
            category: "newsletter",
            tier: 1
        },
        {
            name: "The Defiant",
            url: "https://thedefiant.io/feed",
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
            name: "TLDR Crypto",
            url: "https://tldr.tech/crypto/rss",
            category: "newsletter",
            tier: 1
        },
        {
            name: "The Pomp Letter",
            url: "https://pomp.substack.com/feed",
            category: "newsletter",
            tier: 1
        },
        // =====================
        // TIER 2: CRYPTO NEWS SITES (single stories per item)
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
            name: "CryptoSlate",
            url: "https://cryptoslate.com/feed/",
            category: "news",
            tier: 2
        },
        {
            name: "Bitcoin Magazine",
            url: "https://bitcoinmagazine.com/.rss/full/",
            category: "news",
            tier: 2
        },
        // =====================
        // TIER 3: OFFICIAL BLOGS & RESEARCH
        // =====================
        {
            name: "Ethereum Blog",
            url: "https://blog.ethereum.org/feed.xml",
            category: "blog",
            tier: 3
        },
        {
            name: "a16z Crypto",
            url: "https://a16zcrypto.com/posts/feed/",
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
        // TIER 4: COMMUNITY / SOCIAL
        // =====================
        {
            name: "Hacker News Crypto",
            url: "https://hnrss.org/newest?q=Bitcoin+OR+Ethereum+OR+crypto+OR+blockchain&points=50",
            category: "social",
            tier: 4
        },
        // =====================
        // REDDIT COMMUNITIES (Sorted by Top Daily to capture high engagement)
        // =====================
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
            name: "r/altcoin",
            url: "https://www.reddit.com/r/altcoin/top/.rss?t=day",
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

// Scoring configuration
export const SCORING_CONFIG = {
    minScoreToShow: 6,
    crossSourceBoost: {
        twoSources: 1,
        threePlusSources: 2
    },
    categoryBoost: {
        price_movement: 1,      // Major price changes
        regulation: 1,          // Government/regulatory news
        exchange_news: 1,       // CEX/DEX updates
        defi_update: 1,         // DeFi protocol changes
        security_breach: 2,     // Hacks, exploits (high priority)
    },
    recencyBoostHours: 12, // Stories newer than this get +1
    tierWeight: {
        1: 1.0,  // Newsletters
        2: 0.9,  // News sites
        3: 1.1,  // Official blogs (important)
        4: 0.8   // Social
    }
};

// Prompt for extracting and scoring news stories
export const SMART_CURATION_PROMPT = `You are an expert crypto news curator for the "L8R by Crypto Mafia" newsletter.
Target Audience: 18-40 year old men in Kerala interested in crypto investing. They want to know "what happened" and "why it matters to their portfolio".

TASK: Analyze this content and extract individual news stories.

For EACH distinct news story, provide:
1. headline: Clear, engaging headline (max 12 words) - specific and punchy
2. summary: A 3-4 sentence explanation covering: WHAT happened? and WHY it matters to a crypto investor? Avoid excessive jargon.
3. category: One of [price_movement, exchange_news, defi_update, nft_news, regulation, security_breach, funding, partnership, protocol_upgrade, market_analysis]
4. baseScore: Score 1-10 based on importance to the general public:
   - 9-10: Major market events (BTC ATH, major exchange collapse, landmark regulation)
   - 7-8: Significant protocol updates, major exchange news, whale movements
   - 5-6: DeFi updates, new token launches, partnership announcements
   - 3-4: Minor altcoin news, NFT drops, community governance votes
   - 1-2: Spam, irrelevant, promotional only
5. entities: List of companies/products mentioned
6. originalUrl: Source URL if mentioned

RULES:
- Extract SEPARATE stories, not the whole newsletter
- Focus on the "Kerala Crypto Investor" angle in the summary
- Skip: job posts, sponsor sections, "also check out" links
- Max 6 stories per source

Return ONLY valid JSON array. No other text.`;
