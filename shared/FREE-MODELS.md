# Free & Test Models — OpenRouter
> Last updated: June 1 2026
> Tested against OpenRouter API. "Rate-limited" = free tier daily cap (50 req/key/day), not broken.

---

## FREE MODELS (22 total)

### Tier 1 — High Context (1M+ tokens) ⚠️ Rate-limited upstream
| Model | Context | Notes |
|---|---|---|
| `qwen/qwen3-coder:free` | 1,048,576 | Best coding model. Often rate-limited upstream. |
| `nvidia/nemotron-3-super-120b-a12b:free` | 1,000,000 | NVIDIA 120B beast. High quality, often rate-limited. |

### Tier 2 — Medium Context (256K tokens) ⚠️ Rate-limited upstream
| Model | Context | Notes |
|---|---|---|
| `google/gemma-4-31b-it:free` | 262,144 | Gemini-class quality. Your current default model. |
| `google/gemma-4-26b-a4b-it:free` | 262,144 | Gemma 4 A4B variant. Fast. |
| `moonshotai/kimi-k2.6:free` | 262,144 | Moonshot AI. Good for long docs. |
| `qwen/qwen3-next-80b-a3b-instruct:free` | 262,144 | Qwen 80B next-gen. |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | 256,000 | NVIDIA reasoning model. Multimodal. |
| `nvidia/nemotron-3-nano-30b-a3b:free` | 256,000 | NVIDIA nano. Fast, decent quality. |
| `poolside/laguna-xs.2:free` | 262,144 | Poolside small model. |
| `poolside/laguna-m.1:free` | 262,144 | Poolside medium model. |

### Tier 3 — Standard Context (128K tokens) ✅ Most reliable
| Model | Context | Notes |
|---|---|---|
| `openai/gpt-oss-120b:free` | 131,024 | OpenAI open-weight 120B. CONFIRMED WORKING. |
| `openai/gpt-oss-20b:free` | 131,024 | OpenAI open-weight 20B. Fast coding. |
| `z-ai/glm-4.5-air:free` | 131,024 | Zhipu AI. Fast, good quality. |
| `meta-llama/llama-3.3-70b-instruct:free` | 131,024 | Llama 3.3 70B. General purpose. |
| `nousresearch/hermes-3-llama-3.1-405b:free` | 131,024 | Nous 405B. High quality. |

### Tier 4 — Small/Fast (128K) ✅ Reliable
| Model | Context | Notes |
|---|---|---|
| `nvidia/nemotron-nano-12b-v2-vl:free` | 128,000 | NVIDIA vision+language. |
| `nvidia/nemotron-nano-9b-v2:free` | 128,000 | NVIDIA 9B. Very fast. |

### Tier 5 — Lightweight (32K) ✅ Ultra fast
| Model | Context | Notes |
|---|---|---|
| `liquid/lfm-2.5-1.2b-thinking:free` | 32,768 | Liquid AI thinking model. |
| `liquid/lfm-2.5-1.2b-instruct:free` | 32,768 | Liquid AI instruct. |
| `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` | 32,768 | Dolphin uncensored-style. |

### Random Router
| Model | Context | Notes |
|---|---|---|
| `openrouter/free` | 200,000 | Randomly picks any free model. Good for variety. |

---

## TEST MODELS (3 total)

| Model | Context | Status | Notes |
|---|---|---|---|
| `openrouter/owl-alpha` | 1,048,756 | ✅ WORKING | Your current model. Free during testing period. Prompts logged by creator. |
| `google/lyria-3-pro-preview` | 1,048,576 | ❌ BROKEN (502) | Google Lyria audio model. Provider error. |
| `google/lyria-3-clip-preview` | 1,048,576 | ❌ BROKEN (502) | Google Lyria audio. Provider error. |

---

## KEY ROTATION STRATEGY

### The Problem
- OpenRouter free tier = **50 requests per key per day** (all free models combined)
- Server.mjs currently has only **6 keys** = 300 free reqs/day total
- Many models get "temporarily rate-limited upstream" errors
- With 6 keys, cascading retries waste time (10s timeout per attempt)

### The Fix
- **All 16 of Gary's OpenRouter keys should be in server.mjs**
- Currently only 6 are loaded. Missing 10 keys.
- With 16 keys = 800 free reqs/day
- Keys should rotate: skip keys that returned 429 recently, try fresh ones first

### Recommended Fallback Order (fast → powerful)
1. `openai/gpt-oss-120b:free` — reliably works, good quality
2. `openrouter/free` — random free model, often gets lucky
3. `google/gemma-4-31b-it:free` — your preferred default
4. `openai/gpt-oss-20b:free` — fast coding tasks
5. `z-ai/glm-4.5-air:free` — fast general purpose
6. `meta-llama/llama-3.3-70b-instruct:free` — general fallback
7. `qwen/qwen3-coder:free` — coding (when not rate-limited)
8. `nvidia/nemotron-3-super-120b-a12b:free` — power tasks (when available)
