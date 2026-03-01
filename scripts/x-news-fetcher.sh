#!/bin/bash
# X/Twitter Crypto News Fetcher for L8R by Crypto Mafia Newsletter
# Fetches X's trending crypto news → pushes to Supabase x_news table
set -euo pipefail

BIRD="/home/ubuntu/.local/bin/bird"

# Load secrets
SECRETS_FILE="/home/ubuntu/clawd/projects/crypto-mafia-newsletter/.env.secrets"
if [ -f "$SECRETS_FILE" ]; then
  set -a; source "$SECRETS_FILE"; set +a
fi

# Fallback: try loading from newsletter-auto secrets
if [ -z "${SUPABASE_URL:-}" ]; then
  FALLBACK="/home/ubuntu/clawd/projects/newsletter-auto/.env.secrets"
  if [ -f "$FALLBACK" ]; then
    set -a; source "$FALLBACK"; set +a
  fi
fi

OUTPUT_DIR="/home/ubuntu/clawd/projects/crypto-mafia-newsletter/scripts/x-news-cache"
OUTPUT_FILE="$OUTPUT_DIR/latest.json"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

mkdir -p "$OUTPUT_DIR"
echo "[$(date -u)] Starting X crypto news fetch..."

# SOURCE 1: Search for crypto trending topics
echo "[Fetch] Getting X trending news..."
$BIRD news -n 30 --json > "$TEMP_DIR/trending_general.json" 2>/dev/null || echo "[]" > "$TEMP_DIR/trending_general.json"
sleep 2

# SOURCE 2: Search crypto-specific terms
echo "[Fetch] Searching crypto keywords on X..."
$BIRD search "Bitcoin OR Ethereum OR crypto OR DeFi OR blockchain" -n 20 --json > "$TEMP_DIR/crypto_search.json" 2>/dev/null || echo "[]" > "$TEMP_DIR/crypto_search.json"

# Process and save
echo "[Process] Processing trending items..."
export TEMP_DIR OUTPUT_FILE
python3 << 'PYTHON'
import json, os, hashlib
from datetime import datetime, timezone

temp_dir = os.environ['TEMP_DIR']
output_file = os.environ['OUTPUT_FILE']

def safe_load(path):
    try:
        with open(path) as f:
            data = json.load(f)
            return data if isinstance(data, list) else data.get('items', data.get('tweets', data.get('results', [])))
    except:
        return []

def make_id(text):
    return hashlib.md5(text.encode()).hexdigest()[:12]

# Crypto keyword filter
CRYPTO_KEYWORDS = {
    'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'crypto', 'blockchain',
    'defi', 'nft', 'binance', 'coinbase', 'stablecoin', 'usdt', 'usdc', 'tether',
    'whale', 'altcoin', 'memecoin', 'dogecoin', 'doge', 'shiba', 'xrp', 'ripple',
    'cardano', 'ada', 'polygon', 'matic', 'avalanche', 'avax', 'chainlink', 'link',
    'uniswap', 'aave', 'lido', 'layer 2', 'l2', 'zk', 'rollup', 'sec', 'etf',
    'halving', 'mining', 'staking', 'yield', 'liquidity', 'dex', 'cex', 'web3',
    'dao', 'token', 'airdrop', 'rug pull', 'bull', 'bear', 'hodl', 'satoshi',
    'ledger', 'wallet', 'gas fee', 'tvl', 'market cap', 'spot etf', 'blackrock',
    'microstrategy', 'saylor', 'gensler', 'crypto regulation', 'cbdc',
    'ordinals', 'brc-20', 'base chain', 'arbitrum', 'optimism', 'sui', 'aptos',
    'ton', 'toncoin', 'pepe', 'bonk', 'jupiter', 'raydium', 'pancakeswap'
}

def is_crypto(text):
    t = text.lower()
    return any(kw in t for kw in CRYPTO_KEYWORDS)

# Combine feeds and filter to crypto-only
all_trending = safe_load(f"{temp_dir}/trending_general.json") + safe_load(f"{temp_dir}/crypto_search.json")
items = []
skipped = 0
for item in all_trending:
    # Handle both trending (headline) and search (text) formats
    text = item.get('headline', '') or item.get('text', '') or item.get('full_text', '')
    if not text:
        continue
    if not is_crypto(text):
        skipped += 1
        continue
    items.append({
        'id': make_id(text),
        'text': text,
        'author': item.get('author', item.get('user', {}).get('screen_name', 'X_Trending')) if isinstance(item.get('user'), dict) else item.get('author', 'X_Trending'),
        'url': item.get('url', ''),
        'engagement': item.get('postCount', 0) or item.get('favorite_count', 0) or 0,
        'source_type': 'trending',
        'fetched_at': datetime.now(timezone.utc).isoformat()
    })

if skipped:
    print(f"[Filter] Dropped {skipped} non-crypto items")

# Deduplicate
seen = set()
unique = []
for item in items:
    key = item['text'][:60].lower().strip()
    if key not in seen:
        seen.add(key)
        unique.append(item)

# Sort by engagement
unique.sort(key=lambda x: x['engagement'], reverse=True)

output = {
    'fetched_at': datetime.now(timezone.utc).isoformat(),
    'count': len(unique),
    'items': unique
}
with open(output_file, 'w') as f:
    json.dump(output, f, indent=2)
print(f"[Done] {len(unique)} trending crypto news items saved")
PYTHON

# Push to Supabase x_news table
if [ -z "${SUPABASE_URL:-}" ] || [ -z "${SUPABASE_KEY:-}" ]; then
  echo "[Supabase] ⚠️ SUPABASE_URL or SUPABASE_KEY not set, skipping push"
  echo "[$(date -u)] X crypto news fetch complete (local only)."
  exit 0
fi

echo "[$(date -u)] Pushing to Supabase x_news table..."

# Delete old X news
curl -s -o /dev/null -w "Delete: %{http_code}\n" \
  "${SUPABASE_URL}/rest/v1/x_news?headline=neq.KEEP_NONE" \
  -X DELETE \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}"

# Build JSON rows from the cached file and insert
python3 -c "
import json
with open('${OUTPUT_FILE}') as f:
    data = json.load(f)
rows = []
for item in data['items'][:20]:
    rows.append({
        'x_id': item['id'],
        'headline': item['text'][:500],
        'category': 'crypto',
        'post_count': item.get('engagement', 0),
        'time_ago': 'now',
        'tweets': '[]'
    })
print(json.dumps(rows))
" > /tmp/x_news_rows.json

INSERTED=$(curl -s -w "\n%{http_code}" \
  "${SUPABASE_URL}/rest/v1/x_news" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d @/tmp/x_news_rows.json)

echo "[Supabase] Insert response: $(echo "$INSERTED" | tail -1)"
rm -f /tmp/x_news_rows.json

echo "[$(date -u)] X crypto news fetch complete."
