# Message from orchestrator

Open and read C:/Users/Gary/uni-blog/blog/posts/wifi directory structure and any existing wifi posts to understand the frontmatter schema and formatting rules used previously

Here is the accumulated output and progress from the previous swarm steps:

### Step 1 (Obsidian output):
[Obsidian Memory System] Successfully retrieved Content Guidelines:

# Content Guidelines for Uni-Blog

## Image Spacing Rule

Every blog post with 2+ images must distribute them evenly through the body content:

| Image count | Target positions |
|-------------|-----------------|
| 2 images    | ~33%, ~66%      |
| 3 images    | ~25%, ~50%, ~75% |
| 4 images    | ~20%, ~40%, ~60%, ~80% |
| 5 images    | ~17%, ~33%, ~50%, ~67%, ~83% |

**Rules:**
- Images must NOT be placed within 10 lines of each other
- Images must NOT be placed inside markdown tables (between header and data rows)
- Never cluster all images at the top (after frontmatter) or bottom (after author byline)
- Images should sit between sections/paragraphs, not mid-sentence
- A blank line before and after each image is required for proper markdown rendering

## Post Structure

```
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

[No images at the bottom either]
```

## Image Format

- **Hero/cover images**: Unsplash URLs with `?w=800` parameter
- **Infographics**: Local `/images/post-slug-infographic.svg`
- **Photos**: Local `/images/category/` webp files
- Use markdown syntax: `![Alt text](url)`

## SEO Metadata

- Every post needs `title`, `description`, `date` in frontmatter
- Description: 150-160 characters, includes primary keyword naturally
- No inline JSON-LD in body — schema is injected globally via `transformHead`


### Step 2 (Hermes output):
File created at `D:/Agent OS/shared/todo-plan.md`. Here's a summary of what's captured:

**6 Phases, ~25 tasks tracked:**

| Phase | Focus | Status |
|-------|-------|--------|
| **Phase 1** | Architecture & Setup | ✅ Largely complete |
| **Phase 2** | Content Template & Schema | ⬜ Not started — needs components (comparison table, FAQPage, Bio) |
| **Phase 3** | Content Production (Batch 1) | ⬜ Ready for AGY delegation — 5 priority posts |
| **Phase 4** | Image Pipeline | ⬜ Needs Unsplash / SVGs / webp assets |
| **Phase 5** | Cross-Domain Dedup & QA | ⬜ Schema validation, link checks |
| **Phase 6** | Deployment & Monitoring | ⬜ Vercel staging → GA4 → Lighthouse |

Also embedded:
- **Obsidian's image spacing rules** for quick reference
- **Known errors** from the error vault (`NoConsoleScreenBufferError`, URL prefix wrapping, colon-in-description quoting)
- **Agent communication log**

Ready to delegate Phase 3 to **Antigravity (AGY)** for parallel post authoring — say the word.


---
*Logged at 2026-05-30T22:50:44.918Z*