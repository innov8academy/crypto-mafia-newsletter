import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
    try {
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
        }

        // Fetch X crypto news from last 24 hours
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        const { data, error } = await supabaseAdmin
            .from('x_news')
            .select('*')
            .gte('fetched_at', oneDayAgo.toISOString())
            .order('fetched_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || []);
    } catch (error) {
        console.error('X news fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch X news' }, { status: 500 });
    }
}
