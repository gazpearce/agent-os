import os
import sys
import json
import sqlite3
import requests
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

SHARED_DIR = 'D:\\Agent OS\\shared'
PROPOSALS_DIR = os.path.join(SHARED_DIR, 'knowledge_base', 'proposals')
PENDING_BRIEF = os.path.join(PROPOSALS_DIR, 'pending_update_brief.md')

os.makedirs(PROPOSALS_DIR, exist_ok=True)

# Helper to get SQLite connection
def get_db_conn():
    db_path = os.path.join(SHARED_DIR, 'state.db')
    # fallback to database locations
    if not os.path.exists(db_path):
        db_path = 'D:\\Agent OS\\agent-os\\agent-os-backend.db'
    return sqlite3.connect(db_path)

def scan_openrouter_free_models():
    print("[Model Scanner] Querying OpenRouter API for free models...")
    try:
        r = requests.get('https://openrouter.ai/api/v1/models', timeout=15)
        if r.status_code == 200:
            data = r.json()
            models = data.get('data', [])
            free_models = []
            for m in models:
                is_free = m.get('id', '').endswith(':free')
                pricing = m.get('pricing', {})
                if is_free or (pricing and float(pricing.get('prompt', 0)) == 0 and float(pricing.get('completion', 0)) == 0):
                    free_models.append({
                        "id": m.get('id'),
                        "name": m.get('name'),
                        "context_length": m.get('context_length', 4096),
                        "prompt_pricing": str(pricing.get('prompt', '0')),
                        "completion_pricing": str(pricing.get('completion', '0'))
                    })
            return free_models
    except Exception as e:
        print(f"[Model Scanner] OpenRouter fetch failed: {e}")
    return []

def scan_github_releases():
    print("[Model Scanner] Querying GitHub for Nous Research (Hermes) releases...")
    repos = [
        "nousresearch/Hermes-3-Llama-3.1-8B",
        "nousresearch/Hermes-2-Theta",
        "ollama/ollama"
    ]
    latest_releases = []
    for repo in repos:
        try:
            url = f"https://api.github.com/repos/{repo}/releases/latest"
            headers = {"User-Agent": "Mozilla/5.0"}
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code == 200:
                data = r.json()
                latest_releases.append({
                    "repo": repo,
                    "tag": data.get("tag_name"),
                    "name": data.get("name"),
                    "published_at": data.get("published_at"),
                    "url": data.get("html_url"),
                    "body": data.get("body", "")[:500] + "..."
                })
        except Exception as e:
            print(f"[Model Scanner] GitHub check failed for {repo}: {e}")
    return latest_releases

def update_database(free_models):
    conn = get_db_conn()
    cursor = conn.cursor()
    
    # Check if discovered_models table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='discovered_models';")
    exists = cursor.fetchone()
    if not exists:
        # Create it if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS discovered_models (
                id TEXT PRIMARY KEY,
                name TEXT,
                provider TEXT,
                context_length INTEGER,
                prompt_pricing TEXT,
                completion_pricing TEXT,
                discovered_at TEXT
            );
        """)
        conn.commit()

    new_discovered = []
    for m in free_models:
        cursor.execute("SELECT id FROM discovered_models WHERE id = ?;", (m['id'],))
        row = cursor.fetchone()
        if not row:
            # New model discovered!
            cursor.execute("""
                INSERT INTO discovered_models (id, name, provider, context_length, prompt_pricing, completion_pricing, discovered_at)
                VALUES (?, ?, 'openrouter', ?, ?, ?, ?);
            """, (m['id'], m['name'], m['context_length'], m['prompt_pricing'], m['completion_pricing'], datetime.now().isoformat()))
            new_discovered.append(m)
    
    conn.commit()
    conn.close()
    return new_discovered

def main():
    print("[Model Scanner] Starting daily self-evolution model scan...")
    free_models = scan_openrouter_free_models()
    github_releases = scan_github_releases()
    
    new_models = []
    if free_models:
        new_models = update_database(free_models)
        print(f"[Model Scanner] DB Sync: Found {len(new_models)} new models.")
        
    # Write the update brief
    brief_content = f"""# System Evolution Update Brief
Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

This brief outlines newly discovered AI models and open-source releases detected by the 3 AM background scanner.

## 🌟 Newly Discovered Models (OpenRouter Free Tier)
Total Discovered: {len(new_models)}

"""
    if new_models:
        for m in new_models:
            brief_content += f"*   **{m['name']}** (`{m['id']}`)\n    *   Context Length: {m['context_length']} tokens\n"
    else:
        brief_content += "*No new models added to catalog in this run.*\n"

    brief_content += "\n## 📦 Latest GitHub Releases\n"
    if github_releases:
        for rel in github_releases:
            brief_content += f"### [{rel['repo']}]({rel['url']}) - {rel['tag']}\n"
            brief_content += f"*   **Release Name:** {rel['name']}\n"
            brief_content += f"*   **Published At:** {rel['published_at']}\n"
            brief_content += f"*   **Highlights:** {rel['body']}\n\n"
    else:
        brief_content += "*No GitHub release updates fetched.*\n"
        
    brief_content += """
---

## 🛠️ Auto-Evolution Action Items
If you want to sync these updates:
1. Speak with your coding assistant **Antigravity** and say: `"Run self-evolution updates from the 3am scanner."`
2. Antigravity will automatically apply any recommended system configuration updates or active prompt patches.
"""
    
    with open(PENDING_BRIEF, 'w', encoding='utf-8') as f:
        f.write(brief_content)
        
    print(f"[Model Scanner] Daily scan complete. Brief written to {PENDING_BRIEF}")

if __name__ == '__main__':
    main()
