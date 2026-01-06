// Cost Tracking Utility
// Tracks API costs across the entire newsletter workflow
// Persists to localStorage for session-wide accumulation

// OpenRouter pricing (approximate, per call or per 1M tokens)
// Updated based on OpenRouter pricing page
export const MODEL_PRICING: Record<string, { inputPer1M: number; outputPer1M: number; perImage?: number }> = {
    // Text models (used for curation, research, drafts)
    'x-ai/grok-4.1-fast': { inputPer1M: 0.20, outputPer1M: 0.50 },
    'google/gemini-2.0-flash-001': { inputPer1M: 0.10, outputPer1M: 0.40 },
    'google/gemini-2.5-flash-preview': { inputPer1M: 0.15, outputPer1M: 0.60 },
    'google/gemini-3-pro-preview': { inputPer1M: 1.25, outputPer1M: 10.00 },
    'anthropic/claude-sonnet-4': { inputPer1M: 3.00, outputPer1M: 15.00 },
    'anthropic/claude-3.5-sonnet': { inputPer1M: 3.00, outputPer1M: 15.00 },
    'openai/gpt-4o': { inputPer1M: 2.50, outputPer1M: 10.00 },
    'deepseek/deepseek-r1': { inputPer1M: 0.55, outputPer1M: 2.19 },
    'perplexity/sonar-deep-research': { inputPer1M: 2.00, outputPer1M: 8.00 },
    'perplexity/sonar-pro': { inputPer1M: 3.00, outputPer1M: 15.00 },
    'perplexity/sonar': { inputPer1M: 1.00, outputPer1M: 1.00 },

    // Image models (per image generation)
    'google/gemini-3-pro-image-preview': { inputPer1M: 0, outputPer1M: 0, perImage: 0.03 },
    'google/gemini-2.0-flash-001:image': { inputPer1M: 0, outputPer1M: 0, perImage: 0.02 },
    'bytedance-seed/seedream-4.5': { inputPer1M: 0, outputPer1M: 0, perImage: 0.02 },
    'black-forest-labs/flux-pro-1.1': { inputPer1M: 0, outputPer1M: 0, perImage: 0.04 },
    'black-forest-labs/flux-1.1-pro': { inputPer1M: 0, outputPer1M: 0, perImage: 0.04 },
};

// Cost entry type
export interface CostEntry {
    id: string;
    timestamp: number;
    source: 'curate' | 'research' | 'enhance' | 'draft' | 'regen-section' | 'regen-story' | 'image-prompt' | 'image-gen';
    model: string;
    cost: number;
    description: string;
    tokenCount?: { input: number; output: number };
}

// Storage key
const STORAGE_KEY = 'newsletter_session_costs';

// Get all costs from localStorage
export function getCosts(): CostEntry[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

// Add a cost entry
export function addCost(entry: Omit<CostEntry, 'id' | 'timestamp'>): CostEntry {
    const newEntry: CostEntry = {
        ...entry,
        id: `cost-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
    };

    if (typeof window !== 'undefined') {
        const costs = getCosts();
        costs.push(newEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(costs));
    }

    return newEntry;
}

// Clear all costs (reset session)
export function clearCosts(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
    }
}

// Get total cost
export function getTotalCost(): number {
    return getCosts().reduce((sum, entry) => sum + entry.cost, 0);
}

// Get costs grouped by source
export function getCostsBySource(): Record<string, number> {
    const costs = getCosts();
    const grouped: Record<string, number> = {};

    for (const entry of costs) {
        grouped[entry.source] = (grouped[entry.source] || 0) + entry.cost;
    }

    return grouped;
}

// Get summary stats
export interface CostSummary {
    total: number;
    bySource: Record<string, number>;
    byCategory: {
        curation: number;
        research: number;
        drafting: number;
        images: number;
    };
    entryCount: number;
    sessionStart: number | null;
}

export function getCostSummary(): CostSummary {
    const costs = getCosts();
    const bySource = getCostsBySource();

    return {
        total: costs.reduce((sum, e) => sum + e.cost, 0),
        bySource,
        byCategory: {
            curation: bySource['curate'] || 0,
            research: (bySource['research'] || 0) + (bySource['enhance'] || 0),
            drafting: (bySource['draft'] || 0) + (bySource['regen-section'] || 0) + (bySource['regen-story'] || 0),
            images: (bySource['image-prompt'] || 0) + (bySource['image-gen'] || 0),
        },
        entryCount: costs.length,
        sessionStart: costs.length > 0 ? Math.min(...costs.map(e => e.timestamp)) : null,
    };
}

// Estimate cost for a text API call based on token counts
export function estimateTextCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = MODEL_PRICING[model];
    if (!pricing) {
        // Fallback: assume moderate pricing
        return (inputTokens / 1_000_000) * 1.0 + (outputTokens / 1_000_000) * 5.0;
    }
    return (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M;
}

// Estimate cost for an image generation
export function estimateImageCost(model: string): number {
    const pricing = MODEL_PRICING[model];
    return pricing?.perImage || 0.03; // Default to $0.03 if unknown
}

// Human-readable source names
export const SOURCE_LABELS: Record<string, string> = {
    'curate': 'News Curation',
    'research': 'Deep Research',
    'enhance': 'Prompt Enhancement',
    'draft': 'Draft Generation',
    'regen-section': 'Section Regeneration',
    'regen-story': 'Story Regeneration',
    'image-prompt': 'Image Prompt',
    'image-gen': 'Image Generation',
};
