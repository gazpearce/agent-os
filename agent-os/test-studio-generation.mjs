import fs from 'fs';
import path from 'path';

async function run() {
  console.log("🎨 Simulating Studio image generation using Zhipu CogView-3-Flash...");
  
  const payload = {
    prompt: "a highly detailed cute anime cat working as a programmer on a glowing laptop",
    model: "zhipu/cogview-3-flash",
    aspect: "16:9",
    style: "Anime"
  };

  try {
    const res = await fetch("http://localhost:3001/api/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (data.imageUrl) {
      console.log(`✅ Success! Generated image URL: ${data.imageUrl}`);
      console.log("📥 Downloading image file to workspace...");
      
      const imgRes = await fetch(data.imageUrl);
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        const destPath = "D:\\Agent OS\\shared\\zhipu-test-cat.png";
        fs.writeFileSync(destPath, buffer);
        console.log(`🎉 Image downloaded successfully! Saved to: ${destPath}`);
      } else {
        console.log(`❌ Failed to download image from URL: ${imgRes.statusText}`);
      }
    } else {
      console.log(`❌ Generation failed: ${data.error || JSON.stringify(data)}`);
    }
  } catch (e) {
    console.error("❌ Request error:", e.message);
  }
}

run();
