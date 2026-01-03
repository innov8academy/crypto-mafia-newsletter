'use client';

import { useState, useEffect } from 'react';
import { getCostSummary, clearCosts, CostSummary, SOURCE_LABELS } from '@/lib/cost-tracker';
import { DollarSign, TrendingUp, TrendingDown, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CostTrackerProps {
    refreshTrigger?: number; // Increment to refresh costs
    targetEarnings?: number; // Default $12.50 (midpoint of $10-15)
}

export function CostTracker({ refreshTrigger = 0, targetEarnings = 12.50 }: CostTrackerProps) {
    const [summary, setSummary] = useState<CostSummary | null>(null);
    const [expanded, setExpanded] = useState(false);

    // Load costs on mount and when trigger changes
    useEffect(() => {
        setSummary(getCostSummary());
    }, [refreshTrigger]);

    // Auto-refresh every 2 seconds to catch updates from other tabs/API calls
    useEffect(() => {
        const interval = setInterval(() => {
            setSummary(getCostSummary());
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    function handleClear() {
        if (confirm('Clear all session costs? This cannot be undone.')) {
            clearCosts();
            setSummary(getCostSummary());
        }
    }

    if (!summary || summary.entryCount === 0) {
        return (
            <div className="fixed bottom-0 left-0 right-0 bg-[#0B0B0F]/95 backdrop-blur-xl border-t border-white/10 px-6 py-3 z-50">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/40">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-sm">No API costs recorded this session</span>
                    </div>
                </div>
            </div>
        );
    }

    const profit = targetEarnings - summary.total;
    const isProfitable = profit > 5;
    const isWarning = profit <= 5 && profit > 0;
    const isOver = profit <= 0;

    const statusColor = isProfitable ? 'text-teal-400' : isWarning ? 'text-amber-400' : 'text-coral-400';
    const statusBg = isProfitable ? 'bg-teal-500/10 border-teal-500/30' : isWarning ? 'bg-amber-500/10 border-amber-500/30' : 'bg-coral-500/10 border-coral-500/30';

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0B0B0F]/95 backdrop-blur-xl border-t border-white/10 z-50">
            <div className="max-w-7xl mx-auto px-6">
                {/* Main Bar */}
                <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-6">
                        {/* Total Cost */}
                        <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${statusBg} border`}>
                                <DollarSign className={`w-4 h-4 ${statusColor}`} />
                            </div>
                            <div>
                                <p className="text-xs text-white/40">Session Cost</p>
                                <p className="text-lg font-bold text-white">${summary.total.toFixed(3)}</p>
                            </div>
                        </div>

                        {/* Profit/Loss */}
                        <div className="flex items-center gap-2">
                            {isOver ? (
                                <TrendingDown className="w-4 h-4 text-coral-400" />
                            ) : (
                                <TrendingUp className="w-4 h-4 text-teal-400" />
                            )}
                            <div>
                                <p className="text-xs text-white/40">vs ${targetEarnings} target</p>
                                <p className={`text-sm font-semibold ${statusColor}`}>
                                    {isOver ? '-' : '+'}${Math.abs(profit).toFixed(2)} {isOver ? 'loss' : 'margin'}
                                </p>
                            </div>
                        </div>

                        {/* Category Pills */}
                        <div className="hidden md:flex items-center gap-2">
                            {summary.byCategory.curation > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-xs border border-blue-500/20">
                                    Curation: ${summary.byCategory.curation.toFixed(3)}
                                </span>
                            )}
                            {summary.byCategory.research > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-xs border border-purple-500/20">
                                    Research: ${summary.byCategory.research.toFixed(3)}
                                </span>
                            )}
                            {summary.byCategory.drafting > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs border border-amber-500/20">
                                    Draft: ${summary.byCategory.drafting.toFixed(3)}
                                </span>
                            )}
                            {summary.byCategory.images > 0 && (
                                <span className="px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-xs border border-pink-500/20">
                                    Images: ${summary.byCategory.images.toFixed(3)}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpanded(!expanded)}
                            className="text-white/40 hover:text-white"
                        >
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            {summary.entryCount} calls
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleClear}
                            className="text-white/40 hover:text-coral-400"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Expanded Details */}
                {expanded && (
                    <div className="border-t border-white/5 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(summary.bySource).map(([source, cost]) => (
                            <div key={source} className="bg-white/5 rounded-lg p-3 border border-white/5">
                                <p className="text-xs text-white/40">{SOURCE_LABELS[source] || source}</p>
                                <p className="text-sm font-semibold text-white">${cost.toFixed(4)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
