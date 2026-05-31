# Free Claude Code API & Key Setup Guide

This guide explains how to use Claude Code completely free forever inside your local development environment and the Agent OS Swarm. 

The integration relies on the `fcc-server` (Free Claude Code proxy server) running locally on port `8082`. It acts as an Anthropic-to-OpenRouter (or other free provider) translation layer.

---

## 1. Supported Free / Cheap API Providers

You can configure any of the following providers in your `C:\Users\Gary\.fcc\.env` file:

| Provider | Access & Free Tier Details | Key Setup Link |
| :--- | :--- | :--- |
| **OpenRouter** | Offers multiple 100% free models (like Google Gemma 2 9B/27B, Qwen 2.5, Llama 3 8B, etc.). | [openrouter.ai](https://openrouter.ai/) |
| **Google Gemini** | Google AI Studio provides standard Gemini 2.5 Flash and Pro models completely free within generous rate limits. | [aistudio.google.com](https://aistudio.google.dev/) |
| **Cerebras** | Generous developer free tier with ultra-fast inference speed. | [cerebras.ai](https://cerebras.ai/) |
| **Groq Cloud** | High-speed inference with a free developer tier. | [console.groq.com](https://console.groq.com/) |
| **NVIDIA NIM** | Provides 1000 free credits on registration (plenty for thousands of developer codebase requests). | [build.nvidia.com](https://build.nvidia.com/) |
| **Mistral AI** | Offers free tiers for developers (including Codestral and general chat models). | [console.mistral.ai](https://console.mistral.ai/) |
| **Kimi (Moonshot)** | Provides a free trial / cheap developer credits. | [moonshot.cn](https://platform.moonshot.cn/) |
| **Local Offline** | Run completely offline models using **Ollama**, **LM Studio**, or **Llama.cpp** (No API keys required!). | Local PC |

---

## 2. Configuration (`.fcc/.env` mappings)

Open your `.env` configuration file at `C:\Users\Gary\.fcc\.env` and configure your keys:

```bash
# Example keys:
OPENROUTER_API_KEY="sk-or-v1-..."
GEMINI_API_KEY="AIzaSy..."
CEREBRAS_API_KEY="csk-..."

# Route Claude model queries to your preferred provider:
MODEL_OPUS="open_router/google/gemma-4-31b-it:free"
MODEL_SONNET="open_router/google/gemma-4-31b-it:free"
MODEL_HAIKU="open_router/google/gemma-4-31b-it:free"
MODEL="open_router/google/gemma-4-31b-it:free"
```

---

## 3. Running Claude Code CLI Free in terminal

To use it in any terminal shell:
1. Make sure `fcc-server` is running in the background.
2. Set the environment variables in your terminal session:
   - **PowerShell**:
     ```powershell
     $env:ANTHROPIC_API_KEY="freecc"
     $env:ANTHROPIC_BASE_URL="http://localhost:8082"
     claude
     ```
   - **Command Prompt (CMD)**:
     ```cmd
     set ANTHROPIC_API_KEY=freecc
     set ANTHROPIC_BASE_URL=http://localhost:8082
     claude
     ```
   - **Linux / Git Bash / macOS**:
     ```bash
     export ANTHROPIC_API_KEY="freecc"
     export ANTHROPIC_BASE_URL="http://localhost:8082"
     claude
     ```

Now, Claude Code CLI will execute prompts and codebase edits utilizing your configured free model routes without consuming Anthropic credits.
