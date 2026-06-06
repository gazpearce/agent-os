import puppeteer from 'puppeteer';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function run() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log("🚀 Navigating to Agent OS Dashboard at http://localhost:3001...");
    await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });

    console.log("🎯 Accessing the Studio tab...");
    const buttons = await page.$$('button');
    let studioBtn = null;
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.trim() === 'Studio') {
        studioBtn = btn;
        break;
      }
    }
    if (!studioBtn) throw new Error("Studio tab button not found.");
    await studioBtn.click();
    await wait(2000);

    console.log("🎨 Selecting Zhipu Swarm Agent for high-quality rendering...");
    await page.select('select', 'zhipu'); 
    await wait(1000);

    console.log("📝 Typing initial prompt: 'Starlink Installation Guide for UK households'...");
    const textarea = await page.$('textarea');
    if (!textarea) throw new Error("Prompt textarea not found.");
    await textarea.click();
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await page.type('textarea', 'Starlink Installation Guide for UK households');
    await wait(1000);

    console.log("✨ Clicking 'Auto-prompt' button to enhance prompt...");
    const autoPromptBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.includes('Auto-prompt'));
    });
    if (!autoPromptBtn) throw new Error("Auto-prompt button not found.");
    await autoPromptBtn.click();
    
    console.log("⏳ Waiting 10s for LLM to enhance the prompt...");
    await wait(10000);

    console.log("ℹ️ Clicking the 'Infographic' Style Preset...");
    const infographicBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.textContent && b.textContent.trim() === 'Infographic');
    });
    if (!infographicBtn) throw new Error("Infographic style button not found.");
    await infographicBtn.click();
    await wait(1000);

    console.log("🎬 Initiating Infographic Image Generation...");
    const buttonsAfterMode = await page.$$('button');
    let genBtn = null;
    for (const btn of buttonsAfterMode) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Initialize Generation')) {
        genBtn = btn;
        break;
      }
    }
    if (!genBtn) throw new Error("Initialize Generation button not found.");
    await genBtn.click();

    console.log("⏳ Rendering Infographic image (waiting up to 90s for Zhipu)...");
    await page.waitForSelector('img[alt="AI Preview"]', { timeout: 90000 });
    await wait(3000); 

    console.log("📸 Capturing screenshot...");
    const screenshotPath = 'C:\\Users\\Gary\\.gemini\\antigravity\\brain\\5c873911-01e1-4926-9277-db2e89bdc677\\studio-screenshot.png';
    await page.screenshot({ path: screenshotPath });
    console.log(`🎉 Screenshot captured and saved to: ${screenshotPath}`);

  } catch (e) {
    console.error("❌ Automation failed:", e.message);
  } finally {
    if (browser) await browser.close();
  }
}

run();
