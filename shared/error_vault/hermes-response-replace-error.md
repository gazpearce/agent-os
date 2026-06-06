# Error: Hermes execution loop crashes due to non‑string `currentResponse`

## Symptoms
When the user asked “can you make images”, Hermes returned the following error message repeatedly:

```
HERMES execution loop error: currentResponse.replace is not a function
```

The same error appeared on consecutive user messages, preventing Hermes from delivering a proper response.

## Root Cause
The Hermes executor assumes that `currentResponse` is always a string and calls `.replace()` on it to perform post‑processing (e.g., stripping markup). In this interaction `currentResponse` was an object (or `null`) because the response generation pipeline produced a structured payload instead of a plain string. Calling `.replace()` on a non‑string value throws a TypeError, which bubbles up as the “execution loop error”.

## Solution
1. **Validate `currentResponse` type before calling string methods**  
   ```javascript
   if (typeof currentResponse === "string") {
       currentResponse = currentResponse.replace(...);
   } else {
       // Fallback: stringify or handle the object appropriately
       currentResponse = JSON.stringify(currentResponse);
   }
   ```

2. **Ensure response generators always return a string**  
   - Review all handlers (especially those that may return rich objects such as images, tables, or partial results) and coerce their output to a string before handing it to the execution loop.
   - If a non‑string response is intentional (e.g., binary data), route it through a separate channel instead of the text‑only loop.

3. **Add unit tests** covering:
   - Normal string responses.
   - Object/array responses that should be stringified.
   - Null/undefined responses.

4. **Deploy the fix** and monitor for recurrence of the same error in the logs.

By guarding the `.replace()` call and normalising response types, Hermes will no longer crash on non‑string payloads and can continue to answer user queries gracefully.