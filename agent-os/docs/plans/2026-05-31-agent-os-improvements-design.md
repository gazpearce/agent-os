# Design Doc: Agent OS Parser Robustness & Model Failovers (2026-05-31)

## Overview
Optimize Agent OS to prevent latency, eliminate raw XML code-dumping/parser leakage, and prevent authentication/credit failures by implementing a robust multi-format tool parser and automatic free-model failover.

## Goals
- Parse both classic flat `<longcat_arg_key>` formats and nested XML tool formats.
- Eliminate raw XML leaking to user chat due to failed parser tool loops.
- Prevent Swarm blocking by dynamically reading default models and failing over to working free models (e.g. `google/gemma-4-31b-it:free`).

## Design Details

### 1. Unified Parser (`executeToolCall`)
Upgrade parsing in `server.mjs`:
- If classic keys (`<longcat_arg_key>`) exist, parse them.
- Otherwise, run regex matches on all `<key>value</key>` child tags.
- Extract tool types from the first line or `<tool>`, `<type>`, or `<command>` tags.
- Normalize key casing and aliases (e.g., `TargetFile` -> `file_path`, `CodeContent` -> `content`).

### 2. Swarm Failover List
All models queried via OpenRouter in completion handlers (`chatCompletion`, `chatCompletionWithHistory`, `getOrchestratorPlan`) will use a failover list:
1. Configured default model.
2. `google/gemma-4-31b-it:free`.
3. `openrouter/free`.

### 3. Config Update
Set `default` model in `config.yaml` to `google/gemma-4-31b-it:free`.
