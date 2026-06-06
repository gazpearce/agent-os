# Error: HERMES execution loop error – `currentResponse.replace` is not a function

## Symptoms
When the user asked “what model are you”, Hermes returned a response that triggered the following error message:

```
HERMES execution loop error: currentResponse.replace is not a function
```

The interaction halted, and subsequent attempts to ask the same question produced normal answers, indicating an intermittent failure tied to this particular response handling.

## Root Cause
The Hermes execution loop assumes that `currentResponse` is always a string and attempts to call `.replace()` on it to clean up or format the output. In this case, the response object was inadvertently a non‑string type (e.g., an object or `null`) due to:

1. **Dynamic model switching logic** – the system cycles through multiple model descriptors (Gemini, GLM, Qwen, etc.). When the chosen model descriptor was `undefined` or an object, the response payload was constructed as an object rather than a plain string.
2. **Missing type guard** – there was no validation before invoking `.replace()`, so any non‑string payload caused a runtime TypeError.

## Solution
1. **Add Type Validation**  
   Before calling `.replace()`, ensure `currentResponse` is a string:

   ```javascript
   if (typeof currentResponse !== 'string') {
       currentResponse = String(currentResponse);
   }
   currentResponse = currentResponse.replace(/* … */);
   ```

2. **Normalize Model Descriptor Output**  
   Centralize model identity generation in a helper that always returns a string:

   ```javascript
   function getModelIdentity(modelObj) {
       if (!modelObj) return 'unknown model';
       return `${modelObj.name || 'Unnamed'} ${modelObj.version || ''}`.trim();
   }
   ```

   Use this helper wherever a model description is inserted into a response.

3. **Guard Against Empty or Null Responses**  
   Insert a fallback message when a model description cannot be resolved:

   ```javascript
   const modelInfo = getModelIdentity(selectedModel) || 'a generic AI model';
   const response = `I’m ${modelInfo}.`;
   ```

4. **Unit Tests**  
   Add tests to cover:
   - Normal string responses.
   - Object/null responses.
   - Rapid successive model switches.

   Ensure the execution loop never receives a non‑string `currentResponse`.

5. **Deploy Patch**  
   - Update the Hermes execution loop code with the above validation.
   - Run the new test suite.
   - Deploy to the production swarm after verification.

## Critical Fixes
* Always coerce `currentResponse` to a string before string operations.
* Centralize model description generation to guarantee string output.
* Include defensive fallback handling for undefined or malformed model data.