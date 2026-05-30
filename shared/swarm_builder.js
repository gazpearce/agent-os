#!/usr/bin/env node
/**
 * Swarm Software Builder Pipeline
 * Closed-loop software agent builder that coordinates AGY, Hermes, and LM Studio.
 */

import { argv } from 'process';

const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

async function callAgent(agentId, message) {
  console.log(`[Swarm] Dispatching to ${agentId.toUpperCase()}...`);
  try {
    const r = await fetch(`${BASE_URL}/api/agents/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: agentId, message, from: 'Swarm-Builder' })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return d.response || d.error || 'No response';
  } catch (e) {
    return `Error: ${e.message}`;
  }
}

async function runCode(code, language = 'javascript') {
  console.log(`[Swarm] Running code execution sandbox...`);
  try {
    const r = await fetch(`${BASE_URL}/api/run-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, language })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const d = await r.json();
    return d.output || 'No output';
  } catch (e) {
    return `Code runner error: ${e.message}`;
  }
}

async function build(goal) {
  console.log(`\n🧱 STARTING SWARM BUILD GOAL: "${goal}"\n`);

  // Step 1: Architectural Planning and Code Generation with AGY
  console.log('--- Phase 1: Planning & Code Gen (AGY) ---');
  const planPrompt = `We need to achieve this goal: "${goal}". 
Create a complete Node.js script that fulfills this goal. 
Output ONLY the raw JavaScript code. Do not wrap it in markdown code blocks or add text. Just output executable JS code.`;
  
  const agyOutput = await callAgent('agy', planPrompt);
  // Extract code block if AGY output wrapped it anyway
  let generatedCode = agyOutput.replace(/```javascript/g, '').replace(/```/g, '').trim();
  
  console.log(`[Swarm] AGY completed planning. Generated ${generatedCode.split('\n').length} lines of code.`);
  console.log('--- Code Preview ---');
  console.log(generatedCode.substring(0, 300) + '\n...\n');

  // Step 2: Write Code to Workspace & Compile/Verify with Hermes
  console.log('--- Phase 2: Execution & Verification (Hermes) ---');
  const verifyPrompt = `Create a test file named D:/Agent OS/shared/swarm-build-test.js containing this code:
\`\`\`javascript
${generatedCode}
\`\`\`
Then run the code in a sandbox to verify it outputs correctly and report the result.`;

  const hermesOutput = await callAgent('hermes', verifyPrompt);
  console.log('[Swarm] Hermes Verification Output:');
  console.log(hermesOutput);

  // Step 3: Closed-Loop Debugging with LM Studio if failures detected
  if (hermesOutput.toLowerCase().includes('error') || hermesOutput.toLowerCase().includes('failed') || hermesOutput.toLowerCase().includes('exception')) {
    console.log('\n🚨 Error detected! Initiating Closed-Loop Debugging Swarm...');
    console.log('--- Phase 3: Debugging (LM Studio) ---');
    
    const debugPrompt = `The following script failed verification:
\`\`\`javascript
${generatedCode}
\`\`\`

Here is the error/output logged by Hermes:
\`\`\`
${hermesOutput}
\`\`\`

Analyze this error, explain why it happened, and output the corrected version of the code. Output ONLY the raw corrected JavaScript code.`;

    const lmstudioOutput = await callAgent('lmstudio', debugPrompt);
    const correctedCode = lmstudioOutput.replace(/```javascript/g, '').replace(/```/g, '').trim();
    
    console.log('[Swarm] LM Studio analyzed and corrected the code.');
    
    // Re-verify with Hermes
    console.log('--- Phase 4: Re-Verification (Hermes) ---');
    const reverifyPrompt = `Overwrite D:/Agent OS/shared/swarm-build-test.js with this corrected code:
\`\`\`javascript
${correctedCode}
\`\`\`
Then run the code to verify it compiles and runs without error.`;

    const reverifyOutput = await callAgent('hermes', reverifyPrompt);
    console.log('[Swarm] Hermes Re-Verification Output:');
    console.log(reverifyOutput);

    // Save lessons learned
    if (!reverifyOutput.toLowerCase().includes('error')) {
      console.log('✅ Bug resolved successfully! Saving lesson to vault...');
      const logContent = `# Swarm Fix: ${goal.replace(/[^a-zA-Z0-9 ]/g, '')}
## Symptoms
Code threw errors during execution:
\`\`\`
${hermesOutput}
\`\`\`

## Solution
LM Studio corrected the code. Final verification passed.`;
      
      await fetch(`${BASE_URL}/api/shared/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `error_vault/fix-${Date.now()}.md`, content: logContent })
      });
      console.log('[Swarm] Lesson logged to error_vault.');
    }
  } else {
    console.log('✅ Swarm Build verified successfully on first run!');
  }
  
  console.log('\n🏆 SWARM BUILD PIPELINE COMPLETE!\n');
}

const args = argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node swarm_builder.js "<your-build-goal>"');
} else {
  build(args.join(' '));
}
