# Error: Redundant Response Triggering

## Symptoms
The agent `hermes` is sending multiple identical responses to a single user message. Specifically, a single "hello" message resulted in two identical "Hello! How can I assist you today?" responses being sent back-to-back.

## Root Cause
Race condition or double-triggering of the response logic. The logs show a `message` event followed by two `response` events without an intervening user message, suggesting the response handler was invoked twice for a single input event.

## Solution
Implement an idempotency key or a message-tracking mechanism to ensure that each unique user message ID is processed and responded to only once. Verify the event listener logic to ensure no duplicate triggers are firing upon receipt of a `message` type event.