---
name: incarn-design-system
description: Use when designing or building websites with warm editorial aesthetics, tactile paper parchment tones, literary serif typography, interactive before-after split sliders, generative AI showcase cards, or when recreating the visual style and layout structure of incarn.co.
---

# Incarn Design System & Editorial Web Architecture

## Overview

The **Incarn Design System** fuses **analog craft, darkroom photography, and editorial print publishing** with **cutting-edge generative AI technology**.

Unlike conventional AI SaaS products—which frequently rely on sterile white backgrounds, pitch-black dark modes, electric purple/cyan gradients, and generic modern sans-serifs—the Incarn design language is grounded in **warm tactile paper tones, deep roasted espresso ink, literary high-contrast serifs, and subtle organic micro-animations**.

It honors personal and historical memory through craftsmanship, emotional warmth, and respectful transparency.

---

## When to Use

```
Is the site dealing with memories, history, vintage media, emotional storytelling, or craft AI?
  ├── YES ──> USE this design system
  └── NO  ──> Is the product a high-velocity enterprise B2B dashboard / developer CLI?
                ├── YES ──> Do NOT use (prefer clean technical minimalism)
                └── NO  ──> Does it need a distinguished, warm, anti-corporate human feel?
                              └── YES ──> USE this design system
```

### Ideal Use Cases
- Generative AI media tools (photo restoration, family history animation, voice cloning, heirlooms).
- Heritage brands, artisanal products, publishing platforms, archives, and cultural institutions.
- Pay-per-use, no-subscription consumer applications emphasizing transparency and trust.
- Story-driven landing pages that require emotional resonance and intimacy.

### When NOT to Use
- High-density enterprise SaaS data tables and developer-centric devtools.
- Neomorphic, cyberpunk, or hyper-futuristic neon themes.
- Medical, sterile clinical applications where warm aged paper feels antiquated rather than premium.

---

## 1. Color Palette & Semantic Tokens

The palette avoids clinical `#FFFFFF` and harsh `#000000`. Instead, it uses organic, tactile tones derived from handmade paper, darkroom chemicals, sepia silver prints, and glowing embers.

| Token Name | Hex / RGBA | Role & Semantic Purpose |
| :--- | :--- | :--- |
| `--color-paper` | `#F3ECDF` | **Primary Canvas:** Warm, aged parchment/newsprint background. |
| `--color-paper-2` | `#FBF6EC` | **Elevated Surface:** Pale cream tone for cards, dropzones, and footers. |
| `--color-paper-3` | `#EDE3D2` | **Neutral Beige:** Subtle contrast borders and neutral dividers. |
| `--color-paper-soft` | `#D8CCB8` | **Muted Paper:** Subtitle text on dark ink sections. |
| `--color-ink` | `#241C15` | **Primary Ink & Dark Mode:** Deep roasted espresso charcoal black. |
| `--color-ink-2` | `#3A2E23` | **Secondary Ink:** Dark charcoal brown for hover states and list items. |
| `--color-ink-soft` | `#544636` | **Muted Body Text:** Editorial body copy and lede paragraphs. |
| `--color-sepia` | `#7A6248` | **Heritage Accent:** Vintage sepia for dates, subtitles, and rating counts. |
| `--color-sepia-soft` | `#B4A184` | **Soft Sepia:** Dashed upload borders, outline buttons, and star badges. |
| `--color-line` | `rgba(36, 28, 21, 0.14)` | **Fine Hairline (Light Mode):** Subtle ~14% ink border on paper. |
| `--color-line-ink` | `rgba(243, 236, 223, 0.16)`| **Fine Hairline (Dark Mode):** Subtle ~16% paper border on ink. |
| `--color-ember` | `#C4703A` | **Primary CTA Accent:** Burnt terracotta ember for buttons and active tags. |
| `--color-ember-deep` | `#A2542A` | **Ember Hover/Active:** Deepened terracotta for interactive button press. |
| `--color-gold` | `#B8863B` | **Rating Stars:** Antique heirloom gold for 5-star review indicators. |
| `--color-sage` | `#3E5B52` | **Status / Checks:** Heritage sage green for trust checks (`✓`) and optical diodes. |

---

## 2. Typography & Editorial Hierarchy

Typography pairs a **high-contrast literary serif** for headings and emotion with a **crisp geometric humanist sans-serif** for interface controls and microcopy.

### The Type Pairing
1. **Display & Editorial Font:** `Newsreader` (Fallback: `Georgia, "Times New Roman", serif`)
   - High editorial contrast, elegant italic glyphs, tight tracking (`letter-spacing: -0.02em`).
   - Line-height is kept ultra-compact on large headlines (`leading-[1.0]` to `leading-[1.05]`).
2. **UI & Functional Sans:** `Public Sans` (Fallback: `ui-sans-serif, system-ui, -apple-system, sans-serif`)
   - Clean, open counters, highly legible at small sizes (11px–16px).
3. **Monospace & Metadata:** `ui-monospace, SFMono-Regular, Menlo, Monaco, monospace`

### Typography Hierarchy Table

| Level | Font Family | Size (Mobile → Desktop) | Weight | Line Height & Tracking | Sample Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Eyebrow Tag** | UI Sans | `11px` → `13px` | 700 (Bold) | `tracking-[0.18em]` uppercase | `"THE TRANSFORMATION"`, `"HOW IT WORKS"` |
| **Hero H1** | Newsreader | `44px` → `76px` / `82px` | 500 (Medium) | `leading-[1.02] tracking-[-0.02em]` | `"See them smile, breathe, and live again."` |
| **Section H2** | Newsreader | `32px` → `52px` | 500 (Medium) | `leading-[1.05] text-balance` | `"From a frozen photo to a living memory"` |
| **Card / Step H3** | Newsreader | `22px` → `28px` | 500 (Medium) | `leading-snug` | `"Add your photo"`, `"We bring it to life"` |
| **Hero Lede** | UI Sans | `17px` → `22px` | 400 (Normal) | `leading-normal text-ink-soft` | Subtitle under the main H1 |
| **Body Paragraph** | UI Sans | `15px` → `17px` | 400 (Normal) | `leading-[1.6] text-ink-soft` | Descriptions, FAQ answers, feature lists |
| **Primary CTA** | UI Sans | `18px` → `19px` | 700 (Bold) | `leading-none` | `"Bring my photo to life"` |

---

## 3. Structural Cadence & Layout Rhythm

Incarn avoids visual monotony through an intentional **Light / Dark Inversion Cadence**.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Nav (Fixed, Glassmorphic Paper/90, Hairline Border)      │
├─────────────────────────────────────────────────────────────┤
│ 2. Hero (Light Paper #F3ECDF: Headline + Tactile Dropzone)  │
├─────────────────────────────────────────────────────────────┤
│ 3. Metrics Strip (Light Paper, Hairline Borders, 4 Stats)   │
├─────────────────────────────────────────────────────────────┤
│ 4. BEFORE/AFTER SLIDER (Dark Ink #241C15 Inversion)         │ <── Inversion 1
├─────────────────────────────────────────────────────────────┤
│ 5. Famous Faces Showcase (Elevated Paper #FBF6EC Cards)     │
├─────────────────────────────────────────────────────────────┤
│ 6. Family Film Feature Card (Paper 2, Soft Hairline Shadow) │
├─────────────────────────────────────────────────────────────┤
│ 7. 3-Step Process (Light Paper, Amber Ring Number Badges)   │
├─────────────────────────────────────────────────────────────┤
│ 8. Testimonials (Paper 2, Big Newsreader Quote, Florida Vid)│
├─────────────────────────────────────────────────────────────┤
│ 9. Comparison Matrix (Light Paper with Ink Column Highlight)│
├─────────────────────────────────────────────────────────────┤
│ 10. PRICING SECTION (Dark Ink #241C15 Inversion)            │ <── Inversion 2
│     └── Center "Most Popular" Card INVERTS to Light Paper!  │
├─────────────────────────────────────────────────────────────┤
│ 11. FAQ Accordion & Support Query (Light Paper, Hairlines)  │
├─────────────────────────────────────────────────────────────┤
│ 12. Final Emotional Closing CTA (Light Paper, Centered)     │
├─────────────────────────────────────────────────────────────┤
│ 13. Footer (Paper 2, 5 Columns, Hairline Border)            │
└─────────────────────────────────────────────────────────────┘
```

### Layout Grid Rules
- **Container Max-Width:** `1240px` for standard layouts; `1100px` for focused narrative cards and comparison matrices; `820px` for single-column FAQ.
- **Horizontal Gutters:** `px-4 sm:px-8 lg:px-14`.
- **Vertical Spacing:** Generous breathing room (`py-16 sm:py-24` or `88px–100px`).
- **Dividers:** Fine hairline rules (`border-b border-line`) rather than thick divider blocks.

---

## 4. Signature Animations & Micro-Interactions

Every animation in the Incarn aesthetic has semantic meaning—it represents life, breath, optical scanning, or tactile invitations.

### 1. The "Breathe" Animation (`@keyframes breathe`)
Represents life and breathing in still portraits and the brand medallion.
```css
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.04); }
}
.animate-breathe {
  animation: breathe 4s ease-in-out infinite;
}
```

### 2. The Interactive Split Comparison Slider
A split-screen before-and-after slider comparing the vintage still photograph with the animated memory.
```html
<div class="relative aspect-[3/4] w-full overflow-hidden rounded-2xl cursor-col-resize select-none">
  <!-- Layer 1: Animated Video (Background) -->
  <video class="absolute inset-0 h-full w-full object-cover" autoplay loop muted playsinline src="video.mp4"></video>

  <!-- Layer 2: Static Original Photo (Clipped Top Layer) -->
  <div class="absolute inset-0 overflow-hidden" style="clip-path: inset(0 50% 0 0);">
    <img class="absolute inset-0 h-full w-full object-cover filter sepia grayscale" src="photo.jpg" alt="Original" />
  </div>

  <!-- Divider & Handle with Wiggle Nudge -->
  <div class="absolute top-0 bottom-0 z-10 w-0.5 bg-white shadow-lg" style="left: 50%; transform: translateX(-50%);">
    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
      <div class="relative h-10 w-10 animate-wiggle-x">
        <span class="absolute inset-0 rounded-full bg-white opacity-75 animate-ping"></span>
        <div class="relative flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg text-ink font-bold">
          ⇄
        </div>
      </div>
    </div>
  </div>
</div>
```

### 3. The "Wiggle-X" Invitation (`@keyframes wiggle-x`)
Gently nudges interactive handles left-and-right to invite user dragging.
```css
@keyframes wiggle-x {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
```

### 4. The Optical Diode Pulse (`@keyframes diode-pulse`)
Hardware-inspired status indicator with multi-ring optical diffusion.
```css
@keyframes diode-pulse {
  0%, 100% {
    box-shadow: 0 0 0 3px color-mix(in srgb, #3E5B52 20%, transparent),
                0 0 6px 1px color-mix(in srgb, #3E5B52 55%, transparent);
  }
  50% {
    box-shadow: 0 0 0 4px color-mix(in srgb, #3E5B52 28%, transparent),
                0 0 12px 3px color-mix(in srgb, #3E5B52 82%, transparent);
  }
}
```

### 5. Hover-to-Animate Media Cards
In the Famous Faces gallery, still archive photos instantly spring to life on hover:
- Base state: Still image `opacity-100 group-hover:opacity-0 transition-opacity duration-300`.
- Hover state: Looping video `opacity-0 group-hover:opacity-100 transition-opacity duration-300`.

---

## 5. Core Component Blueprints

### A. The Tactile Dropzone
A card that feels like opening a vintage archival envelope.
- Outer container: `rounded-[20px] border border-line bg-paper-2 p-3.5 shadow-[0_30px_70px_-30px_rgba(36,28,21,0.35)]`.
- Inner box: `rounded-[14px] border-2 border-dashed border-sepia-soft bg-[rgba(142,115,85,0.04)] px-5 py-8 text-center transition-all hover:border-ember hover:bg-[rgba(196,112,58,0.08)]`.
- Center Cameo / Medallion icon with `animate-breathe`.
- Ember Pill CTA Button with warm terracotta drop-glow.

### B. The Glowing Ember Pill Button
The primary action button across the site.
```css
.btn-ember {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background-color: #C4703A;
  color: #FBF6EC;
  font-family: 'Public Sans', sans-serif;
  font-weight: 700;
  font-size: 1.125rem;
  padding: 0.95rem 2.25rem;
  box-shadow: 0 12px 28px -10px rgba(196, 112, 58, 0.6);
  transition: background-color 0.15s ease, transform 0.15s ease;
}
.btn-ember:hover {
  background-color: #A2542A;
  transform: translateY(-1px);
}
```

### C. Numbered Process Circles
Step-by-step instructions (1, 2, 3) framed with delicate amber ring outlines:
```html
<div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-ember font-display text-3xl text-ember-deep">
  1
</div>
```

### D. Pricing Architecture (Dark Mode with Center Inversion)
- Section container is in Dark Ink (`bg-ink text-paper`).
- Basic and Archive tiers are dark transparent cards (`border border-line-ink bg-white/5`).
- The **"Most Popular" center tier INVERTS** into bright, tactile paper (`bg-paper text-ink shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]`), instantly capturing visual focus.

---

## 6. Copywriting Voice & Emotional Persona

The tone of voice is **poetic, respectful, clear, and reassuring**:
- **Short, evocative verbs:** *"See them smile, breathe, and live again."*
- **No tech jargon:** Avoid "latent diffusion models" or "neural interpolation"; say *"We bring it to life as a living memory"*.
- **Transparent economics:** *"Pay for what you animate. No subscription, no surprise renewals. Your credits never expire."*
- **Reassurance on privacy:** *"Your photos stay private. Designed in France, hosted in Europe."*

---

## 7. Common Mistakes & Anti-Patterns

| Mistake | Why It Breaks the Design | How to Fix |
| :--- | :--- | :--- |
| **Using Pure `#FFFFFF` Backgrounds** | Creates a cold, clinical, generic SaaS look. | Always use `--color-paper: #F3ECDF` or `--color-paper-2: #FBF6EC`. |
| **Using Pure `#000000` Text** | Harsh contrast vibrates against warm parchment. | Use deep espresso charcoal `--color-ink: #241C15`. |
| **Using Standard Modern Sans for Headings** | Strips the site of literary warmth and history. | Use high-contrast serif `Newsreader` for all H1/H2 headlines. |
| **Using Neon Blue / Purple Accents** | Breaks historical analog immersion. | Use terracotta `--color-ember: #C4703A` and antique gold `--color-gold: #B8863B`. |
| **All-Light or All-Dark Monotony** | Long pages lose rhythm and reader interest. | Invert key sections (Slider, Pricing) into `--color-ink` dark mode. |
| **Missing Tactile Drop Shadow on Ember Buttons** | Buttons look flat and digital rather than physical. | Apply colored warm glow: `shadow-[0_12px_28px_-10px_rgba(196,112,58,0.6)]`. |

---

## 8. Skill Resources & Files

In this skill directory, you will find ready-to-use assets:
- `tokens.css`: Standalone CSS custom properties, utility classes, and keyframes.
- `tailwind.config.js`: Complete Tailwind configuration extending colors, fonts, shadows, and animations.
- `templates/landing-page-template.html`: Fully functional, responsive reference implementation of the entire Incarn-style landing page.

