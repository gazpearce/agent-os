# Uni-Blog SEO Network — Master To-Do Plan

> Maintained by Hermes (L3) · Last updated: 2025-01-09
> Shared workspace: `D:/Agent OS/shared/`
> Live site: https://uni-blog.vercel.app

---

## 📋 Project Status Legend

| Symbol | Meaning |
|---------|---------|
| ✅ | Complete |
| 🔄 | In Progress |
| ⬜ | Not Started |
| 🚫 | Blocked |

---

## Phase 1 — Architecture & Setup

| # | Task | Status | Owner | Notes |
|---|-------|--------|-------|-------|
| 1.1 | Initialise VitePress project structure | ✅ | OpenClaw | `D:/Agent OS/uni-blog/` exists |
| 1.2 | Configure `transformHead` for JSON-LD & OG meta injection | ✅ | OpenClaw | Hook in `.vitepress/config.mts` |
| 1.3 | Set up shared knowledge vault at `D:/Agent OS/shared/` | ✅ | Hermes | `knowledge_base/`, `error_vault/`, `todo-plan.md` |
| 1.4 | Define Content Guidelines & image spacing rules | ✅ | Obsidian | Retrieved — see below |
| 1.5 | Create shared style assets (CSS, logo, favicon) | ⬜ | OpenClaw | |

---

## Phase 2 — Content Template & Schema

| # | Task | Status | Owner | Notes |
|---|-------|--------|-------|-------|
| 2.1 | Standard post frontmatter template | ✅ | Obsidian | Obsidian retrieved existing guidelines |
| 2.2 | Create reusable post template with image slots | ⬜ | Hermes | Use image spacing rules from Obsidian |
| 2.3 | Create reusable comparison table component | ⬜ | Hermes | VitePress-compatible, responsive |
| 2.4 | Create FAQPage schema component | ⬜ | Hermes | JSON-LD via `transformHead`, not inline |
| 2.5 | E-E-A-T Bio component (Gary Pearce) | ⬜ | Hermes | 07830 638 337, 15 yr expert |

---

## Phase 3 — Content Production (Batch 1 — Priority Keywords)

| # | Task | Status | Owner | Target Word Count | Notes |
|---|-------|--------|-------|-----------------|-------|
| 3.1 | uk-cctv-installation-guide | ⬜ | AGY → Hermes | 2500 | Comparison table: wired vs wireless |
| 3.2 | best-home-security-cameras-uk | ⬜ | AGY → Hermes | 3000 | Top 10 list, E-E-A-T |
| 3.3 | cctv-laws-uk | ⬜ | AGY → Hermes | 2000 | Legal compliance, 2024 update |
| 3.4 | wireless-vs-wired-cctv | ⬜ | AGY → Hermes | 2000 | Dynamic comparison table |
| 3.5 | outdoor-security-lighting | ⬜ | AGY → Hermes | 1500 | Links to CCTV posts (internal) |

---

## Phase 4 — Image Pipeline

| # | Task | Status | Owner | Notes |
|---|-------|--------|-------|-------|
| 4.1 | Source hero/cover images (Unsplash `?w=800`) | ⬜ | Hermes | Per Obsidian guidelines |
| 4.2 | Create infographic SVGs for each post | ⬜ | Hermes | `/images/post-slug-infographic.svg` |
| 4.3 | Create category photo assets (webp) | ⬜ | Hermes | `/images/category/webp` |
| 4.4 | Validate image spacing per Obsidian rules | ⬜ | Hermes | No clustering, correct % positions |
| 4.5 | Optimise all assets for web | ⬜ | Hermes | < 200 KB each |

---

## Phase 5 — Cross-Domain Dedup & QA

| # | Task | Status | Owner | Notes |
|---|-------|--------|-------|-------|
| 5.1 | Run duplicate content scan | ⬜ | Hermes | Across all domains |
| 5.2 | Validate H2/H3 heading hierarchy | ⬜ | Hermes | Every post |
| 5.3 | Validate FAQPage schema via Google Rich Results | ⬜ | Hermes | |
| 5.4 | Check all internal links resolve | ⬜ | Hermes | |
| 5.5 | Mobile responsiveness audit | ⬜ | Hermes | |

---

## Phase 6 — Deployment & Monitoring

| # | Task | Status | Owner | Notes |
|---|-------|--------|-------|-------|
| 6.1 | Deploy to Vercel (staging) | ⬜ | OpenClaw | https://uni-blog.vercel.app |
| 6.2 | Configure GA4 / Search Console | ⬜ | Hermes | |
| 6.3 | Set up sitemap generation | ⬜ | OpenClaw | Auto from VitePress |
| 6.4 | Performance audit (Lighthouse) | ⬜ | Hermes | Target > 90 all categories |
| 6.5 | Post-launch monitoring (48 h) | ⬜ | AGY | Indexing, crawl errors |

---

## 📐 Content Guidelines (from Obsidian — Phase 1.4)

Every blog post with 2+ images must distribute them evenly:

| Image count | Target positions |
|-------------|-----------------|
| 2 images | ~33%, ~66% |
| 3 images | ~25%, ~50%, ~75% |
| 4 images | ~20%, ~40%, ~60%, ~80% |
| 5 images | ~17%, ~33%, ~50%, ~67%, ~83% |

**Rules:**
- Images must NOT be placed within 10 lines of each other
- Images must NOT be placed inside markdown tables
- Never cluster all images at the top (after frontmatter) or bottom (after author byline)
- Blank line before and after each image

### Image Format
- **Hero/cover**: Unsplash URLs with `?w=800` parameter
- **Infographics**: Local `/images/post-slug-infographic.svg`
- **Photos**: Local `/images/category/webp` files
- Use markdown: `![Alt text](url)`

### Standard Post Structure

```markdown
---
title: Post Title
description: "SEO meta description"
date: YYYY-MM-DD
---

# Post Title

[No images here — first image at ~33% through content]

## Section 1

Content...

[Image 1 at ~33%]

## Section 2

Content...

[Image 2 at ~66%]

## About the Author

...

---

Article by Gary Pearce
[No images at bottom either]
```

---

## 🧠 Known Errors (from shared/error_vault/)

| Error | Fix | Source |
|-------|-----|--------|
| `Win32 NoConsoleScreenBufferError` | Use `start cmd.exe` or PowerShell `start-process` | Learned |
| `VitePress double URL prefix on posts/ slug` | Avoid double prefixing in `transformHead` | Learned |
| `Description with colons breaking frontmatter` | Wrap descriptions containing colons in quotes | Learned |

---

## 📨 Agent Communication Log

| Timestamp | From | To | Message |
|-----------|------|----|---------|
| 2025-01-09 | Hermes | Obsidian | Retrieved Content Guidelines |
| 2025-01-09 | Hermes | AGY | Awaiting delegation for Phase 3 content batch |