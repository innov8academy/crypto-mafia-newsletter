// Draft Generator Module
// Converts deep research reports into newsletter-ready content
// Target: 18-40 year olds in Kerala who want to stay updated on AI

import { ResearchReport } from './types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Available models for draft generation
export const DRAFT_MODELS = [
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', description: 'Best writing quality' },
    { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro', description: 'Google flagship' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', description: 'OpenAI flagship' },
    { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1', description: 'Powerful reasoning' },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini Flash', description: 'Fast & reliable' },
] as const;

export type DraftModelId = typeof DRAFT_MODELS[number]['id'];
export const DEFAULT_DRAFT_MODEL: DraftModelId = 'anthropic/claude-sonnet-4';

// Newsletter draft structure
export interface NewsletterDraft {
    title: string;
    subtitle: string;
    date: string;
    memeIdeas: MemeIdea[]; // Meme suggestions for the intro image
    intro: string;
    toc: string[];
    stories: StoryBlock[];
    quickSummary: string;
    rawMarkdown: string;
}

// Meme idea for intro image
export interface MemeIdea {
    templateName: string;     // e.g., "Distracted Boyfriend", "Drake Hotline Bling"
    topText: string;          // Text for top of meme
    bottomText: string;       // Text for bottom of meme
    angle: string;            // The comedic angle/approach
}

export interface StoryBlock {
    emoji: string;
    title: string;
    hookParagraph: string;
    bulletPoints: string[];
    whyItMatters: string[];
    whatsNext: string[];
    imageUrl?: string; // Generated image URL for this story
}

interface DraftGenerationResult {
    success: boolean;
    draft?: NewsletterDraft;
    error?: string;
}

/**
 * Generate a complete newsletter draft from research reports.
 * The order of reports determines story priority (first = main story).
 */
export async function generateNewsletterDraft(
    reports: ResearchReport[],
    apiKey: string,
    modelId?: DraftModelId
): Promise<DraftGenerationResult> {
    if (reports.length === 0) {
        return { success: false, error: 'No research reports provided' };
    }

    const selectedModel = modelId || DEFAULT_DRAFT_MODEL;

    // Create a clean summary of each research report to pass to AI
    const researchSummaries = reports.map((r, i) => {
        // Extract the actual research content
        const content = r.deepResearch || r.story.summary;
        return `
STORY ${i + 1}: ${r.story.headline}
Category: ${r.story.category}
Research Content:
${content}
`;
    }).join('\n---\n');

    const systemPrompt = `You are Alex — a 25-year-old crypto investor and content creator from Kerala, India. You write "L8R by Crypto Mafia," a crypto newsletter for young Malayali men (18-40) who want to stay updated on crypto while cutting through the hype.

## WHO YOU ARE:
- Active crypto trader and investor who's been through multiple bull/bear cycles
- You USE crypto daily. You're not just reporting on it — you're in the trenches.
- You're a witty friend who explains things, not a hype-man or a journalist.
- You give straight, unbiased takes. You're NOT a shill. If something smells like a scam, you say it. If it's actually groundbreaking, you give it credit.

## YOUR READERS:
- 18-40 year old Malayali men interested in crypto investing
- Mix of beginners and experienced traders — they want to know what affects their portfolio
- Busy — they SCAN, they don't read. Scannability is CRITICAL.
- They appreciate casual, fun writing with personality
- They're tired of shills and want honest takes

## YOUR WRITING STYLE:
- **Simple English.** Grade 5-6 level. No jargon.
- **Short sentences.** One idea per sentence. Punchy.
- **Scannable.** Bullet points must be 1-2 lines MAX. No walls of text.
- Use **bold** for company names, numbers, key terms.
- Use emojis naturally: 💰 📈 📉 🚨 ⚠️ 🔥 💀 🐳 ⛓️ 🪙
- Be conversational. Talk TO the reader ("You", "Your").
- Self-deprecating humor is your thing ("I lost money on this so you don't have to").
- Rhetorical questions are great ("Want to know the crazy part?").

## HYPE CALIBRATION:
- Default: "Another day, another shitcoin." Don't overhype.
- Exception: If a major market event happens (BTC ATH, major hack, etc.), match the energy.
- Always give YOUR opinion. Strong takes. "This is clearly better than X."
- NEVER financial advice. Always remind readers to DYOR.

## MANGLISH (Malayalam + English):
- Use Manglish ONLY for the outro and occasional casual asides.
- Example outro: "Ithrollu innathe Crypto Update. appo adutha l8ril varam.. bie."
- Don't force it. Keep it natural.

## NEVER USE:
- Technical jargon unless explained (gas fees, TVL, APY - explain if used)
- Corporate speak (synergy, leverage, paradigm, ecosystem)
- Vague hedging (might, could potentially, remains to be seen)
- Placeholder text like "Point 1" or "Impact 1" — ALWAYS write real content
- Overly formal language
- Shilling language`;

    const userPrompt = `Write a complete newsletter from these ${reports.length} crypto stories:

${researchSummaries}

## NEWSLETTER FORMAT:

---

# [CATCHY TITLE BASED ON MAIN STORY - Make it punchy, not clickbait]

PLUS: [Short teaser for story 2] | [Short teaser for story 3]

---

## 🎭 MEME IDEAS (For intro image - based on main story)

Generate 2-3 meme template ideas. For each:
- **Template:** [Famous meme template name, e.g., "Distracted Boyfriend", "Drake Hotline Bling", "This is Fine", "Surprised Pikachu"]
- **Top Text:** [What goes on top]
- **Bottom Text:** [What goes on bottom]
- **Angle:** [The joke/commentary - what makes it funny]

Focus on: irony, crypto Twitter absurdity, market reactions, or the "Alex" perspective.

---

## INTRO (This is crucial - it hooks the reader)

**Structure:**
1. Start with the MAIN STORY hook. 2-3 punchy sentences. What happened? Why should I care?
2. Then, tease the OTHER stories with quick questions or bullet points to create curiosity.
3. End EXACTLY with:

I'm Alex. Welcome to **L8R by Crypto Mafia**.
Let's dive deep 💰👇

---

**In today's post:**
• 📈 [Story 1 short title with emoji]
• 💰 [Story 2 short title with emoji]
• 🪙 [Story 3 short title with emoji]

---

## FOR EACH STORY:

### [Emoji] [Story Title - Catchy, not boring]

[HOOK: 2-3 sentences explaining what happened. Simple terms. Make it interesting. You can use rhetorical questions here.]

**🔍 Key Points:**
• [Fact 1 - ONE sentence. Be specific. Use numbers.]
• [Fact 2 - ONE sentence.]
• [Fact 3 - ONE sentence.]
• [Fact 4 - ONE sentence. (Optional)]

**🚨 Why This Matters:**
• [How does this affect a Kerala crypto investor? Their portfolio? Their strategy?]
• [The bigger picture for the crypto market]
• [What should readers know or do? (Not financial advice)]

**⏭️ What's Next:**
• [What to watch for in the coming weeks/months]
• [Expected timeline or next steps]
• [Who will be most affected?]

---

## After all stories:

### 🚀 Quick L8R Summary

• **[Story 1 keyword]:** [1 punchy sentence with **bold** keywords]
• **[Story 2 keyword]:** [1 punchy sentence with **bold** keywords]
• **[Story 3 keyword]:** [1 punchy sentence with **bold** keywords]

---

Ithrollu innathe Crypto Update.
appo adutha l8ril varam.. bie. ✌️

*Disclaimer: This is not financial advice. DYOR.*

---

## CRITICAL RULES - READ BEFORE WRITING:

1. **SCANNABILITY IS KING.** Every bullet point = 1 sentence. Max 2 lines. Readers SCAN, they don't read.
2. **Write ACTUAL content.** Never use "Point 1" or placeholder text.
3. **Each section must be UNIQUE.** Key Points = Facts. Why This Matters = Impact. What's Next = Future. NO OVERLAP.
4. **Be specific.** Use company names, numbers, dates from the research.
5. **Hook first.** The intro and story hooks must grab attention immediately.
6. **Use the Manglish outro.** "Ithrollu innathe Crypto Update. appo adutha l8ril varam.. bie."
7. **Give strong opinions.** Don't hedge. Say what you think.
8. **Max 4 bullets per section.** Less is more.`;

    try {
        const response = await fetch(OPENROUTER_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://cryptomafia.local',
                'X-Title': 'L8R by Crypto Mafia Draft Generator',
            },
            body: JSON.stringify({
                model: selectedModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt },
                ],
                temperature: 0.7,
                max_tokens: 8000,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return { success: false, error: `API Error (${selectedModel}): ${response.status} - ${errorText}` };
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
            return { success: false, error: 'No content in API response' };
        }

        // Parse the generated content into structured format
        const draft = parseNewsletterDraft(content, reports);
        return { success: true, draft };

    } catch (error) {
        console.error('Draft generation error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

// Helper to assign emojis to stories
function getEmoji(index: number): string {
    const emojis = ['💰', '📈', '🪙', '🔥', '⚡', '🐳', '⛓️', '🚀'];
    return emojis[index % emojis.length];
}

// Parse the raw markdown into structured sections
// This is a simplified parser that just splits by sections
function parseNewsletterDraft(content: string, reports: ResearchReport[]): NewsletterDraft {
    // Extract title (first # heading)
    const titleMatch = content.match(/^#\s+(.+?)$/m);
    const title = titleMatch ? titleMatch[1].trim() : reports[0].story.headline;

    // Extract subtitle (PLUS: line)
    const subtitleMatch = content.match(/PLUS:\s*(.+?)(?:\n|$)/i);
    const subtitle = subtitleMatch ? subtitleMatch[1].trim() : '';

    // Extract intro - everything between first --- and "In today's post"
    const introMatch = content.match(/Let's dive in.*?\n\n([\s\S]*?)(?=\*\*In today|In today's post|---)/i);
    const introRaw = content.match(/---\s*\n\n([\s\S]*?)I'm Alex/i);
    const intro = introRaw
        ? introRaw[1].trim() + "\n\nI'm Alex. Welcome to **L8R by Crypto Mafia**.\nLet's dive in 💰👇"
        : '';

    // Extract TOC
    const tocMatch = content.match(/In today's post:\*?\*?\s*([\s\S]*?)(?=\n---|\n##)/i);
    const tocText = tocMatch ? tocMatch[1] : '';
    const toc = tocText
        .split('\n')
        .filter(line => line.trim().match(/^[•\-\*]/))
        .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
        .filter(line => line.length > 0);

    // Extract story blocks - look for emoji headers
    const storyEmojis = ['💰', '📈', '🪙', '🔥', '⚡', '🐳', '⛓️', '🚀'];
    const stories: StoryBlock[] = [];

    for (let i = 0; i < reports.length; i++) {
        const emoji = storyEmojis[i % storyEmojis.length];

        // Find this story's section
        const escapedEmoji = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const nextEmoji = storyEmojis[(i + 1) % storyEmojis.length];
        const escapedNextEmoji = nextEmoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // Try to match the story section
        let storyPattern: RegExp;
        if (i < reports.length - 1) {
            storyPattern = new RegExp(
                `##\\s*${escapedEmoji}\\s*([^\\n]+)\\n([\\s\\S]*?)(?=##\\s*[${storyEmojis.join('')}]|##\\s*🚀\\s*Quick)`,
                'i'
            );
        } else {
            storyPattern = new RegExp(
                `##\\s*${escapedEmoji}\\s*([^\\n]+)\\n([\\s\\S]*?)(?=##\\s*🚀\\s*Quick|---\\s*\\n\\s*That's)`,
                'i'
            );
        }

        const storyMatch = content.match(storyPattern);

        if (storyMatch) {
            const storyTitle = storyMatch[1].trim();
            const storyContent = storyMatch[2];

            // Extract sections
            const hookMatch = storyContent.match(/^([^*#\n]+(?:\n[^*#\n]+)*)/);
            const hookParagraph = hookMatch ? hookMatch[1].trim() : reports[i].story.summary;

            const bulletPoints = extractBulletsFromSection(storyContent, 'Key Points');
            const whyItMatters = extractBulletsFromSection(storyContent, 'Why This Matters');
            const whatsNext = extractBulletsFromSection(storyContent, "What's Next");

            stories.push({
                emoji,
                title: storyTitle || reports[i].story.headline,
                hookParagraph,
                bulletPoints,
                whyItMatters,
                whatsNext,
            });
        } else {
            // Fallback - use report data
            stories.push({
                emoji,
                title: reports[i].story.headline,
                hookParagraph: reports[i].story.summary,
                bulletPoints: extractFromResearch(reports[i].deepResearch, 'key'),
                whyItMatters: extractFromResearch(reports[i].deepResearch, 'matters'),
                whatsNext: extractFromResearch(reports[i].deepResearch, 'next'),
            });
        }
    }

    // Extract quick summary (matches "Quick Summary" or "Quick L8R Summary")
    const summaryMatch = content.match(/(?:##|###)\s*🚀\s*Quick(?:\s+L8R)?\s+Summary\s*([\s\S]*?)(?=---\s*\n\s*Ithrollu|---\s*\n\s*That's|$)/i);
    const quickSummary = summaryMatch ? summaryMatch[1].trim() : '';

    // Extract meme ideas
    const memeIdeas = extractMemeIdeas(content);

    return {
        title,
        subtitle,
        date: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        memeIdeas,
        intro,
        toc,
        stories,
        quickSummary,
        rawMarkdown: content,
    };
}

// Extract meme ideas from content
function extractMemeIdeas(content: string): { templateName: string; topText: string; bottomText: string; angle: string }[] {
    const memeSection = content.match(/##\s*🎭\s*MEME IDEAS[\s\S]*?(?=---\s*\n\s*##\s*INTRO|---\s*\n\s*\*\*In today)/i);
    if (!memeSection) return [];

    const memes: { templateName: string; topText: string; bottomText: string; angle: string }[] = [];

    // Match each meme block
    const templateMatches = memeSection[0].matchAll(/\*\*Template:\*\*\s*([^\n]+)/gi);
    const topTextMatches = memeSection[0].matchAll(/\*\*Top Text:\*\*\s*([^\n]+)/gi);
    const bottomTextMatches = memeSection[0].matchAll(/\*\*Bottom Text:\*\*\s*([^\n]+)/gi);
    const angleMatches = memeSection[0].matchAll(/\*\*Angle:\*\*\s*([^\n]+)/gi);

    const templates = [...templateMatches].map(m => m[1].trim());
    const topTexts = [...topTextMatches].map(m => m[1].trim());
    const bottomTexts = [...bottomTextMatches].map(m => m[1].trim());
    const angles = [...angleMatches].map(m => m[1].trim());

    for (let i = 0; i < templates.length; i++) {
        memes.push({
            templateName: templates[i] || '',
            topText: topTexts[i] || '',
            bottomText: bottomTexts[i] || '',
            angle: angles[i] || '',
        });
    }

    return memes;
}

// Extract bullets from a specific section
function extractBulletsFromSection(content: string, sectionName: string): string[] {
    const pattern = new RegExp(
        `\\*\\*[^*]*${sectionName}[^*]*\\*\\*:?\\s*\\n([\\s\\S]*?)(?=\\*\\*[^*]+\\*\\*:|##|$)`,
        'i'
    );
    const match = content.match(pattern);
    if (!match) return [];

    // Section header emojis that should NOT appear in bullet content
    const sectionEmojis = ['🔍', '🚨', '⏭️'];

    return match[1]
        .split('\n')
        .filter(line => line.trim().match(/^[•\-\*]/))
        .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
        .filter(line => {
            if (line.length === 0) return false;
            // Filter out placeholder text
            if (line.match(/^(Point|Impact|Watch|Fact)\s*\d/i)) return false;
            // Filter out lines that are actually section headers embedded in bullets
            if (sectionEmojis.some(emoji => line.includes(emoji) && line.includes('**'))) return false;
            // Filter out lines that look like section headers
            if (line.match(/^(\*\*)?(Key Points|Why This Matters|What's Next)/i)) return false;
            return true;
        });
}

// Fallback: extract content from research when parsing fails
function extractFromResearch(research: string, type: 'key' | 'matters' | 'next'): string[] {
    // Try to extract from the research sections
    const patterns: Record<string, RegExp> = {
        key: /(?:The Story|Key Points?|What Happened)[\s\S]*?((?:[•\-\*]\s*.+\n?)+)/i,
        matters: /(?:The Context|Why.*Matters|The Hot Take)[\s\S]*?((?:[•\-\*]\s*.+\n?)+)/i,
        next: /(?:What's Next|Future|Watch For)[\s\S]*?((?:[•\-\*]\s*.+\n?)+)/i,
    };

    const match = research.match(patterns[type]);
    if (match) {
        return match[1]
            .split('\n')
            .filter(line => line.trim().match(/^[•\-\*]/))
            .map(line => line.replace(/^[•\-\*]\s*/, '').trim())
            .filter(line => line.length > 0)
            .slice(0, 4);
    }

    // If no bullets found, try to extract first few sentences
    const sentences = research.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).map(s => s.trim());
}
