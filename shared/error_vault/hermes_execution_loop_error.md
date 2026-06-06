# Error: HERMES execution loop `currentResponse.replace` is not a function

## Symptoms
The Hermes executor failed to process a user request for image generation, returning the error message:
```
HERMES execution loop error: currentResponse.replace is not a function
```
This occurred when the user asked: "can you make images" and triggered an automatic response loop.

## Root Cause
During the execution loop, `currentResponse` is expected to be a string so that string methods (like `.replace`) can be applied. However, in this case, `currentResponse` was set to an object (likely the incomplete response payload from a previous step), causing JavaScript’s `replace` method to be undefined. The function call inadvertently treated the object as a string, leading to the runtime error.

The underlying cause is a type mismatch propagated from an earlier step where a non‑string response was returned or not properly cast to string before the loop step.

## Solution
1. **Validate response type** before invoking string methods:
   ```javascript
   if (typeof currentResponse !== 'string') {
     currentResponse = JSON.stringify(currentResponse);
   }
   ```
2. **Add defensive checks** around any string manipulation:
   ```javascript
   if (currentResponse && typeof currentResponse.replace === 'function') {
     currentResponse = currentResponse.replace(...);
   } else {
     // log or fallback to safe handling
   }
   ```
3. **Update the executor template** to ensure all responses are coerced to strings prior to processing in the loop.
4. **Add unit tests** that simulate non‑string responses to verify the guard clauses.
5. **Monitor logs** for similar type errors and alert if they recur.

Implementing these changes will prevent the Hermes executor from crashing when encountering non‑string responses during the execution loop.