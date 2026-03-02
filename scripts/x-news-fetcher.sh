#!/bin/bash
# X/Twitter Crypto News Fetcher for L8R by Crypto Mafia Newsletter
# Fetches tweets from crypto accounts → filters → pushes to Supabase x_news table
set -euo pipefail

BIRD="/usr/local/bin/bird"

# Load secrets
SECRETS_FILE="/home/ubuntu/crypto-mafia-newsletter/.env.secrets"
if [ -f "$SECRETS_FILE" ]; then
  set -a; source "$SECRETS_FILE"; set +a
fi

OUTPUT_DIR="/home/ubuntu/crypto-mafia-newsletter/scripts/x-news-cache"
OUTPUT_FILE="$OUTPUT_DIR/latest.json"

mkdir -p "$OUTPUT_DIR"
echo "[$(date -u)] Starting X crypto news fetch..."

# Fetch tweets from top crypto accounts using bird user command
# bird can't do keyword search (Cloudflare blocks it), so we pull from key accounts
python3 << 'PYTHON'
import subprocess, json, re, hashlib, os
from datetime import datetime, timezone

OUTPUT_FILE = os.environ.get('OUTPUT_FILE', '/home/ubuntu/crypto-mafia-newsletter/scripts/x-news-cache/latest.json')

CRYPTO_ACCOUNTS = [
    'CoinDesk', 'Cointelegraph', 'WuBlockchain', 'whale_alert',
    'BitcoinMagazine', 'theaborai', 'lookonchain', 'tier10k',
    'PeterSchiff', 'saborai', 'VitalikButerin', 'caborai',
    'CryptoQuant', 'santaborai', 'DeItaone', 'zaborai'
]

CRYPTO_KEYWORDS = re.compile(
    r'crypto|bitcoin|btc|ethereum|eth|solana|sol|blockchain|defi|nft|token|'
    r'binance|coinbase|stablecoin|usdt|usdc|whale|altcoin|memecoin|xrp|'
    r'regulation|sec |etf|halving|mining|staking|web3|dao|airdrop|'
    r'cardano|polygon|avalanche|chainlink|uniswap|layer.2|rollup|'
    r'blackrock|microstrategy|gensler|cbdc|ordinals|arbitrum|optimism|sui|aptos|ton',
    re.IGNORECASE
)

SPAM_PATTERNS = [
    'dm for', 'dm me', 'signal group', 'trading signal', 'free signal',
    'join our', 'click here', 'giveaway', 'airdrop claim', 'claim your',
    'guaranteed profit', '100x', '1000x', 'get rich', 'limited time',
    'recovery service', 'pump signal'
]

def is_spam(text):
    t = text.lower()
    return len(t) < 20 or any(p in t for p in SPAM_PATTERNS)

def make_id(text):
    return hashlib.md5(text.encode()).hexdigest()[:12]

all_tweets = []
for account in CRYPTO_ACCOUNTS:
    print(f"[Fetch] @{account}...")
    try:
        r = subprocess.run(['bird', 'user', account, '-n', '5'],
            capture_output=True, text=True, timeout=30)
        
        # Parse bird output: @user (date)\n  text\n  stats\n  url
        current = {}
        for line in r.stdout.split('\n'):
            line = line.rstrip()
            if line.startswith('@') and '(' in line:
                if current.get('text'):
                    all_tweets.append(current)
                match = re.match(r'@(\w+) \((.+)\)', line)
                current = {
                    'author': match.group(1) if match else account,
                    'date': match.group(2) if match else '',
                    'text': '', 'likes': 0, 'retweets': 0, 'url': ''
                }
            elif line.startswith('  https://x.com/'):
                current['url'] = line.strip()
            elif line.startswith('  ❤️'):
                m = re.findall(r'(\d+)', line)
                if len(m) >= 2:
                    current['likes'] = int(m[0])
                    current['retweets'] = int(m[1])
            elif line.startswith('  ') and not line.startswith('  📊') and current:
                current['text'] = (current.get('text', '') + ' ' + line.strip()).strip()
        
        if current.get('text'):
            all_tweets.append(current)
            
    except Exception as e:
        print(f"  ⚠️ Failed: {e}")
    
    # Small delay between accounts
    import time
    time.sleep(1)

print(f"\n[Process] Got {len(all_tweets)} total tweets")

# Filter to crypto-relevant, non-spam
items = []
seen = set()
for t in all_tweets:
    text = t.get('text', '')
    if not CRYPTO_KEYWORDS.search(text):
        continue
    if is_spam(text):
        continue
    key = text[:60].lower()
    if key in seen:
        continue
    seen.add(key)
    items.append({
        'id': make_id(text),
        'text': text[:500],
        'author': t.get('author', 'unknown'),
        'url': t.get('url', ''),
        'engagement': t.get('likes', 0) + t.get('retweets', 0) * 2,
        'source_type': 'x_account',
        'fetched_at': datetime.now(timezone.utc).isoformat()
    })

# Sort by engagement
items.sort(key=lambda x: x['engagement'], reverse=True)

output = {
    'fetched_at': datetime.now(timezone.utc).isoformat(),
    'count': len(items),
    'items': items
}
with open(OUTPUT_FILE, 'w') as f:
    json.dump(output, f, indent=2)
print(f"[Done] {len(items)} crypto news items saved")
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

# Build JSON rows and insert
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

curl -s -o /dev/null -w "Insert: %{http_code}\n" \
  "${SUPABASE_URL}/rest/v1/x_news" \
  -H "apikey: ${SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation,resolution=merge-duplicates" \
  -d @/tmp/x_news_rows.json

rm -f /tmp/x_news_rows.json
echo "[$(date -u)] X crypto news fetch complete."
