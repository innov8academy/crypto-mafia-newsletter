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

# SOURCE 1: X's trending news (catch any crypto trending topics)
echo "[Fetch] Getting X trending news..."
$BIRD news -n 30 --json > "$TEMP_DIR/trending_general.json" 2>/dev/null || echo "[]" > "$TEMP_DIR/trending_general.json"
sleep 2

# SOURCE 2-5: Targeted crypto searches (the real content source)
echo "[Fetch] Searching Bitcoin + Ethereum news..."
$BIRD search "Bitcoin OR Ethereum news min_faves:50 -filter:replies" -n 20 --json > "$TEMP_DIR/search1.json" 2>/dev/null || echo "[]" > "$TEMP_DIR/search1.json"
sleep 2

echo "[Fetch] Searching DeFi + altcoin news..."
$BIRD search "crypto OR DeFi OR Solana news min_faves:50 -filter:replies" -n 20 --json > "$TEMP_DIR/search2.json" 2>/dev/null || echo "[]" > "$TEMP_DIR/search2.json"
sleep 2

echo "[Fetch] Searching crypto regulation + ETF + market..."
$BIRD search "crypto regulation OR Bitcoin ETF OR SEC crypto OR crypto market min_faves:20 -filter:replies" -n 15 --json > "$TEMP_DIR/search3.json" 2>/dev/null || echo "[]" > "$TEMP_DIR/search3.json"
sleep 2

echo "[Fetch] Searching crypto whale + breaking..."
$BIRD search "crypto breaking OR whale alert OR Bitcoin price min_faves:100 -filter:replies" -n 15 --json > "$TEMP_DIR/search4.json" 2>/dev/null || echo "[]" > "$TEMP_DIR/search4.json"

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

# Spam/scam patterns to filter out
SPAM_PATTERNS = {
    'dm for', 'dm me', 'signal group', 'trading signal', 'free signal',
    'join our', 'click here', 'check link', 'recovery help', 'recovery service',
    'send me', 'giveaway', 'airdrop claim', 'claim your', 'congratulations',
    'pump signal', 'guaranteed profit', '100x', '1000x', 'get rich',
    'limited time', 'act now', 'hurry up', 'dont miss', "don't miss",
    'scam alert', 'fraudulent', 'caution', 'warning ⚠', '⚠️ caution',
    'alpha 🎯', '🎯 alpha', 'check 👉', '💎 gem', 'moonshot',
    # Note: t.co links removed from spam filter — trending headlines often have links
}

def is_spam(text):
    t = text.lower()
    # Too short = probably not a real news headline
    if len(t) < 20:
        return True
    # Non-English heavy content (French, etc)
    if any(w in t for w in ['le ', 'la ', 'les ', 'des ', 'une ', 'est ', 'avec ']):
        return True
    # Mostly links
    if t.count('http') >= 2:
        return True
    # Spam patterns
    return any(p in t for p in SPAM_PATTERNS)

# Combine feeds and filter to crypto-only
all_trending = (safe_load(f"{temp_dir}/trending_general.json") +
                safe_load(f"{temp_dir}/search1.json") +
                safe_load(f"{temp_dir}/search2.json") +
                safe_load(f"{temp_dir}/search3.json") +
                safe_load(f"{temp_dir}/search4.json"))
items = []
skipped = 0
spam_filtered = 0
for item in all_trending:
    # Handle both trending (headline) and search (text) formats
    text = item.get('headline', '') or item.get('text', '') or item.get('full_text', '')
    if not text:
        continue
    if not is_crypto(text):
        skipped += 1
        continue
    if is_spam(text):
        spam_filtered += 1
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
if spam_filtered:
    print(f"[Filter] Dropped {spam_filtered} spam/scam items")

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

# Delete old X news (with retry for Cloudflare 525)
for attempt in 1 2 3; do
  DEL_CODE=$(curl -s -o /dev/null -w "%{http_code}" --retry 2 \
    "${SUPABASE_URL}/rest/v1/x_news?headline=neq.KEEP_NONE" \
    -X DELETE \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}")
  echo "Delete attempt $attempt: $DEL_CODE"
  [ "$DEL_CODE" = "204" ] && break
  sleep 2
done

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

for attempt in 1 2 3; do
  INS_CODE=$(curl -s -o /dev/null -w "%{http_code}" --retry 2 \
    "${SUPABASE_URL}/rest/v1/x_news" \
    -H "apikey: ${SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_KEY}" \
    -H "Content-Type: application/json" \
    -H "Prefer: return=representation,resolution=merge-duplicates" \
    -d @/tmp/x_news_rows.json)
  echo "Insert attempt $attempt: $INS_CODE"
  [ "$INS_CODE" = "201" ] && break
  sleep 2
done
rm -f /tmp/x_news_rows.json

echo "[$(date -u)] X crypto news fetch complete."
