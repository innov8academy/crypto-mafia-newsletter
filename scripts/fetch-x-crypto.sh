#!/bin/bash
# Fetch crypto-related curated news from X's Explore section
# Uses bird CLI's `news` command which taps into X's AI-curated trending/news
# Then filters for crypto keywords and pushes to Supabase
#
# Usage: ./fetch-x-crypto.sh
# Cron: Run every 4-6 hours

set -euo pipefail

SUPABASE_URL="${SUPABASE_URL:-https://vzhxeardtorqksrymjms.supabase.co}"
SUPABASE_KEY="${SUPABASE_SERVICE_KEY:-}"

if [ -z "$SUPABASE_KEY" ]; then
    echo "ERROR: SUPABASE_SERVICE_KEY not set"
    exit 1
fi

CRYPTO_KEYWORDS="crypto|bitcoin|btc|ethereum|eth|solana|sol|blockchain|defi|nft|token|altcoin|binance|coinbase|stablecoin|usdt|usdc|mining|halving|whale|matic|polygon|cardano|ripple|xrp|dogecoin|memecoin|web3|dao|airdrop|exchange|ledger|wallet|layer.2|rollup|ordinals|rune"

echo "[X Crypto] Fetching curated news from X..."

# Fetch from X's News tab (AI-curated by Twitter)
NEWS_JSON=$(bird news --news-only --with-tweets --tweets-per-item 3 --json -n 30 2>/dev/null || echo "[]")

# Fetch from For You tab too (personalized curation)
FORYOU_JSON=$(bird news --for-you --json -n 20 2>/dev/null || echo "[]")

# Merge and filter for crypto keywords
echo "$NEWS_JSON" "$FORYOU_JSON" | python3 -c "
import json, sys, re, os
from datetime import datetime

CRYPTO_RE = re.compile(r'${CRYPTO_KEYWORDS}', re.IGNORECASE)
SUPABASE_URL = os.environ.get('SUPABASE_URL', '${SUPABASE_URL}')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_KEY', '${SUPABASE_KEY}')

# Read all JSON arrays from stdin
items = []
for line in sys.stdin:
    line = line.strip()
    if not line or line == '[]':
        continue
    try:
        data = json.loads(line)
        if isinstance(data, list):
            items.extend(data)
    except json.JSONDecodeError:
        continue

# Filter for crypto-related news
crypto_news = []
seen_ids = set()
for item in items:
    xid = item.get('id', '')
    if xid in seen_ids:
        continue
    
    headline = item.get('headline', '') or item.get('trendName', '')
    category = item.get('category', '')
    tweets = item.get('tweets', [])
    tweet_text = ' '.join([t.get('text', '') for t in tweets]) if tweets else ''
    
    searchable = f'{headline} {category} {tweet_text}'.lower()
    
    if CRYPTO_RE.search(searchable):
        seen_ids.add(xid)
        crypto_news.append({
            'x_id': xid,
            'headline': headline,
            'category': category,
            'post_count': item.get('postCount'),
            'time_ago': item.get('timeAgo'),
            'tweets': json.dumps(tweets[:3]) if tweets else '[]',
            'fetched_at': datetime.utcnow().isoformat()
        })

print(f'[X Crypto] Found {len(crypto_news)} crypto items out of {len(items)} total')

if not crypto_news:
    print('[X Crypto] No crypto news found in X curated section')
    sys.exit(0)

# Push to Supabase
import urllib.request

for item in crypto_news:
    payload = json.dumps(item).encode()
    req = urllib.request.Request(
        f'{SUPABASE_URL}/rest/v1/x_news',
        data=payload,
        headers={
            'apikey': SUPABASE_KEY,
            'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
        },
        method='POST'
    )
    try:
        urllib.request.urlopen(req, timeout=10)
        print(f'  ✓ {item[\"headline\"][:60]}')
    except Exception as e:
        print(f'  ✗ Failed: {item[\"headline\"][:40]} — {e}')

print(f'[X Crypto] Done. Pushed {len(crypto_news)} items to Supabase.')
"

echo "[X Crypto] Complete."
