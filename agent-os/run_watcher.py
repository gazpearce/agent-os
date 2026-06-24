import yt_dlp
import json
import os
import sys
import requests

sys.stdout.reconfigure(encoding='utf-8')

# Directories
SHARED_DIR = 'D:\\Agent OS\\shared'
TRANSCRIPTS_DIR = os.path.join(SHARED_DIR, 'knowledge_base', 'youtube_transcripts')
PROPOSALS_DIR = os.path.join(SHARED_DIR, 'knowledge_base', 'proposals')
SCANS_FILE = os.path.join(TRANSCRIPTS_DIR, 'recent_scans.json')

# Create dirs if not exist
os.makedirs(TRANSCRIPTS_DIR, exist_ok=True)
os.makedirs(PROPOSALS_DIR, exist_ok=True)

# Load recent scans robustly
scanned_videos = {}
if os.path.exists(SCANS_FILE):
    try:
        with open(SCANS_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, dict):
                scanned_videos = data
            elif isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        v_id = item.get("id") or item.get("video_id")
                        if v_id:
                            scanned_videos[v_id] = item
                    elif isinstance(item, str):
                        scanned_videos[item] = {"processed": True}
    except:
        pass

# Query multiple AI and SEO channels
channels = {
    "Julian Goldie SEO": "https://www.youtube.com/@JulianGoldieSEO/videos",
    "Matt Wolfe": "https://www.youtube.com/@MattWolfe/videos",
    "AI Explained": "https://www.youtube.com/@AIExplained/videos",
    "Wes Roth": "https://www.youtube.com/@WesRoth/videos"
}

ydl_opts = {
    'quiet': True,
    'skip_download': True,
    'playlistend': 10, # Check the latest 10 videos per channel to ensure we run solid scans without rate limits
}

new_discoveries = 0

for channel_name, channel_url in channels.items():
    print(f"[Watcher] Querying latest videos from {channel_name} ({channel_url})...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            result = ydl.extract_info(channel_url, download=False)
            entries = result.get('entries', [])
            for entry in entries:
                title = entry.get('title')
                video_id = entry.get('id')
                url = f"https://www.youtube.com/watch?v={video_id}"
                upload_date = entry.get('upload_date', 'unknown')
                description = entry.get('description', '')

                if video_id in scanned_videos:
                    continue

                print(f"[Watcher] New video detected on {channel_name}: {title} ({video_id})")
                scanned_videos[video_id] = {
                    "channel": channel_name,
                    "title": title,
                    "date": upload_date,
                    "url": url,
                    "processed": False
                }
                new_discoveries += 1

                # Download transcript
                transcript_content = ""
                try:
                    r = requests.get(f"https://youtubetranscript.com/?v={video_id}", headers={
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    }, timeout=10)
                    if r.status_code == 200 and "processVideo2" not in r.text:
                        from bs4 import BeautifulSoup
                        soup = BeautifulSoup(r.text, 'html.parser')
                        transcript_content = soup.get_text()
                except:
                    pass

                if len(transcript_content.strip()) < 100:
                    transcript_content = f"Title: {title}\nDescription:\n{description}"

                # Evaluate with local LLM server
                print(f"[Watcher] Requesting Agent OS LLM evaluation for: {title}")
                try:
                    payload = {
                        "query": f"Analyze this new video from {channel_name} to see if there is any new tool, workflow, AI model release, or automation pattern that can help our Agent OS tool grow. If so, write a structured proposal including: Title, Growth Potential, Workflows/Sequence, and Integration Steps. If it does not contain useful integrations, output exactly 'NO OPPORTUNITY'.\n\nVideo Title: {title}\nContent:\n{transcript_content[:8000]}"
                    }
                    res = requests.post("http://localhost:3001/api/chat/evaluate-growth", json=payload, timeout=60)
                    if res.status_code == 200:
                        analysis = res.json().get("analysis", "")
                        if "NO OPPORTUNITY" not in analysis:
                            # Write proposal file
                            prop_file = os.path.join(PROPOSALS_DIR, f"{video_id}_growth_opportunity.md")
                            with open(prop_file, 'w', encoding='utf-8') as pf:
                                pf.write(f"# Swarm Growth Opportunity: {title}\n\n* **Source Channel:** {channel_name}\n* **Video URL:** {url}\n* **Scanned Date:** {upload_date}\n\n---\n\n{analysis}")
                            print(f"[Watcher] Success! Growth proposal saved to {prop_file}")
                            
                            # Trigger system audio warning/notification
                            requests.post("http://localhost:3001/api/watcher/notify", json={
                                "message": f"New Growth Opportunity Found on {channel_name}: {title}"
                            })
                        else:
                            print(f"[Watcher] Evaluated: No useful growth opportunity found for this video.")
                    else:
                        print(f"[Watcher] LLM Server returned error {res.status_code}")
                except Exception as le:
                    print(f"[Watcher] Failed to evaluate: {le}")

                scanned_videos[video_id]["processed"] = True

        except Exception as e:
            print(f"[Watcher] Failed to fetch channel list for {channel_name}: {e}")

# Save recent scans
with open(SCANS_FILE, 'w', encoding='utf-8') as f:
    json.dump(scanned_videos, f, ensure_ascii=False, indent=2)

print(f"[Watcher] Scan finished. {new_discoveries} new videos scanned.")
