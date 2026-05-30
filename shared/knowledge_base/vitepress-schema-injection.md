# VitePress Schema & OG Meta Tag Injection via transformHead

## Context
When building VitePress blogs, you must inject structured schema markup (JSON-LD) and Open Graph (OG) tags dynamically for search engine and AI-overview crawl optimization. Doing this in templates can lead to static or duplicate tags.

## Implementation Details
Use the VitePress `transformHead` hook in `.vitepress/config.mjs` (or `.config.ts`) to read the page frontmatter and generate page-specific metadata.

### Configuration Example
```javascript
export default defineConfig({
  srcDir: 'blog',
  transformHead: ({ pageData }) => {
    const head = [];
    const { title, description, category, slug, image } = pageData.frontmatter;
    const url = `https://uni-blog.vercel.app/posts/${category}/${slug}`;

    // 1. Ingest OG Tags
    head.push(['meta', { property: 'og:title', content: title }]);
    head.push(['meta', { property: 'og:description', content: description }]);
    if (image) {
      head.push(['meta', { property: 'og:image', content: image }]);
    }
    head.push(['meta', { property: 'og:type', content: 'article' }]);
    head.push(['meta', { property: 'og:url', content: url }]);

    // 2. Inject Article JSON-LD
    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": title,
      "description": description,
      "image": image || "https://uni-blog.vercel.app/og-default.jpg",
      "author": {
        "@type": "Person",
        "name": "Gary Pearce"
      }
    };
    head.push(['script', { type: 'application/ld+json' }, JSON.stringify(articleSchema)]);

    // 3. Inject Breadcrumbs JSON-LD
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://uni-blog.vercel.app" },
        { "@type": "ListItem", "position": 2, "name": category, "item": `https://uni-blog.vercel.app/${category}` },
        { "@type": "ListItem", "position": 3, "name": title, "item": url }
      ]
    };
    head.push(['script', { type: 'application/ld+json' }, JSON.stringify(breadcrumbSchema)]);

    return head;
  }
});
```

## Critical Fixes
* **Double URL bug**: Avoid prefixing `/posts/` twice when assembling URLs (e.g., `posts/${category}/posts/${slug}`). Check `srcDir` mapping.
* **Quote escaping in frontmatter**: When frontmatter `description` contains colons, wrap it in double quotes in YAML to prevent parsing failures.
