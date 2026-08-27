# Make both PDFs correct, consistent, and regression-proof

## Confirmed diagnosis

- The uploaded grocery PDF is an output from the previous exporter: its cart emoji and “Built by SmartyDiet” footer are not present in the current PDF source.
- The affected stored four-week plan still contains complete grocery arrays for all four weeks (180, 171, 185, and 191 entries). The PDF therefore failed while transforming/rendering existing data; the grocery data itself was not empty.
- Current automated tests validate meal-plan structure only. They do not validate grocery completeness, PDF content, pagination, branding, or visual consistency.
- The current generator copies every ingredient occurrence into the grocery list. It does not reliably consolidate equivalent items or quantities, so the grocery contract also needs to be made explicit rather than trusting generated shape.

## Implementation

### 1. One canonical export model

Create a deterministic preparation layer used by both the diet-plan PDF and grocery PDF:

- Sort weeks, days, and meals canonically before export.
- Normalize grocery items from each stored week.
- If a stored grocery list is absent or malformed, derive it from that week’s meal ingredients instead of producing empty week headings.
- Consolidate matching items where quantities are safely combinable; preserve separate quantity lines when units cannot be combined without guessing.
- Preserve or deterministically infer grocery categories and render categories in a fixed shopping-friendly order.
- Reject the download with a clear on-screen error if a week has meals but still resolves to zero grocery items. Never silently create an empty PDF.

### 2. One shared branded PDF system

Use the same document primitives for both exports:

- Identical SmartyDiet logo treatment, brand header, typography, spacing, colors, website address, footer, and `Page X of Y` numbering.
- The plan PDF and grocery PDF differ only in their content sections, not their visual identity or page architecture.
- Remove emoji and platform-dependent glyphs from PDF content.
- Keep every meal card, grocery row, section heading, and heading-plus-first-row group atomic during pagination.
- Repeat useful context on continued pages, such as the active week/category, without creating orphan headings.
- Use the actual A4 content height measured from the shared header/footer instead of unrelated hard-coded estimates.

### 3. Grocery PDF structure

Render a professional grocery document rather than a list of week labels:

- First page: plan verification/rules summary followed immediately by grocery content.
- Each week: visible item count and category sections.
- Each category: checkbox rows with quantity and item name.
- Multi-page weeks continue with a clear “Week N — continued” label.
- Empty categories are omitted; empty weeks are blocked before export.

### 4. Permanent validation and regression coverage

Add automated checks for the complete export contract:

- Every expected week appears and contains at least one grocery item when meals contain ingredients.
- Legacy plans, current plans, one-week plans, two-week plans, and the existing historical four-week plan shape all normalize correctly.
- Missing `groceryList`, malformed entries, duplicate ingredients, mixed units, long item names, and large lists are covered.
- Generated PDF text contains the logo/brand name, `smartydiet.com`, page numbers, every week, categories, quantities, and grocery item names.
- No content block exceeds its page bounds; no blank grocery-only pages or orphan headings are produced.
- Both PDF types pass the same branding assertions so future edits cannot make them diverge.

### 5. Visual QA before completion

Generate real diet-plan and grocery PDFs from representative short and maximum-size plans, convert every PDF page to images, and inspect every page for:

- missing content;
- clipped/split rows or cards;
- orphan headings;
- blank pages;
- logo, header, footer, URL, and page-number consistency;
- readable mobile PDF viewing and professional print output.

Fix any issue found, regenerate, and repeat the full inspection. Also run the complete structure/export test suite and confirm the application build is clean before reporting completion.

## Scope

This changes export preparation, both PDF layouts, validation/error handling, and PDF regression tests. It does not alter customer plan entitlements, questionnaire answers, or saved meal-plan content.
