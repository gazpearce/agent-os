// Test script to verify the new send_agent_message tool and swarm collaboration
// Runs on native Node.js (fetch is built-in in Node v18+)

async function testCollaboration() {
  console.log('🚀 Sending message to AGY to trigger a tool call to CLAUDE...');
  try {
    const res = await fetch('http://localhost:3001/api/agents/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'agy',
        from: 'test-runner',
        message: 'Please use your send_agent_message tool to ask the "claude" agent to write a one-sentence greeting. Then report exactly what it replied.'
      })
    });
    
    if (res.status !== 200) {
      console.error(`Error status: ${res.status}`);
      const errText = await res.text();
      console.error(errText);
      return;
    }
    
    const data = await res.json();
    console.log('\n🌟 RESPONSE FROM SWARM:');
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Test run failed:', e.message);
  }
}

testCollaboration();
