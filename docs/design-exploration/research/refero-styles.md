# MANNA — Style Reference
> Earthy Gallery Canvas

**Theme:** light

Manna Architects employs a subdued, earthy aesthetic that evokes natural materials and warm, muted tones. Text is primarily black against subtly tinted, soft backgrounds, giving a feeling of quiet elegance. Typography is precise and airy, favoring lighter weights and generous readability. The design system prioritizes large, impactful imagery and minimal, deliberate UI elements, suggesting a focus on visual content over interactive complexity.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Earthy Ochre | `#af6446` | `--color-earthy-ochre` | Dominant background for visual sections and footers, creating a warm canvas for large imagery |
| Pale Linen | `#f2edde` | `--color-pale-linen` | Secondary background for footer elements or subtle surface variations, providing a softer contrast to text |
| Charcoal Ink | `#000000` | `--color-charcoal-ink` | Primary text color for all content, headings, and links. Also used for hairline borders and content dividers |

## Tokens — Typography

### Scto Grotesk A — Headlines and prominent display text (60px, 500 weight) for brand impact, body text (14px, 300 weight) for spacious readability. The light 300 weight for body text gives a delicate, refined feel. · `--font-scto-grotesk-a`
- **Substitute:** Inter
- **Weights:** 300, 500
- **Sizes:** 14px, 60px
- **Line height:** 1.29
- **Letter spacing:** normal
- **Role:** Headlines and prominent display text (60px, 500 weight) for brand impact, body text (14px, 300 weight) for spacious readability. The light 300 weight for body text gives a delicate, refined feel.

### Merlo — Body copy and informational text, particularly for image captions and detailed descriptions. The consistent 400 weight maintains a straightforward, unobtrusive presence. · `--font-merlo`
- **Substitute:** Georgia
- **Weights:** 400
- **Sizes:** 16px, 26px
- **Line height:** 1.23, 1.50
- **Letter spacing:** normal
- **Role:** Body copy and informational text, particularly for image captions and detailed descriptions. The consistent 400 weight maintains a straightforward, unobtrusive presence.

## Tokens — Spacing & Shapes

**Density:** comfortable

### Border Radius

| Element | Value |
|---------|-------|
| images | 0px |

### Layout

- **Section gap:** 40px
- **Card padding:** 20px
- **Element gap:** 10-20px

## Components

### Image Card with Caption
**Role:** Primary content display for portfolio pieces or architectural photography.

Images are presented without rounded corners, relying on the 'Earthy Ochre' background as their implied container. A 'Merlo' 16px caption in 'Charcoal Ink' with 1.5 lineHeight is set with 10px `marginBottom` below the image. Padding around the image and caption is 20px, framing the visual content.

### Footer Section
**Role:** Global brand and contact information.

The footer uses a 'Pale Linen' background with 20px padding on all sides. Text links like 'About' and 'info@mannaarchitects.com' are in 'Charcoal Ink' using 'Scto Grotesk A' at 14px, 300 weight.

### Prominent Brand Heading
**Role:** Major section titles and brand identity.

Utilizes 'Scto Grotesk A' at 60px, weight 500, in 'Charcoal Ink'. This large, bold typography anchors content sections despite the overall light touch of the design.

## Do's and Don'ts

### Do
- Prioritize large, uncropped imagery as primary content, allowing them to fill available width and define sections.
- Use 'Earthy Ochre' (#af6446) as the primary background for content blocks and distinct page sections.
- Render all text, including headings, body, and links, in 'Charcoal Ink' (#000000).
- Apply 'Scto Grotesk A' (60px, 500 weight) for dominant headings and 'Merlo' (16px, 400 weight) for detailed captions and informational text.
- Maintain minimal spacing around images by using 10px `marginBottom` for captions, creating a tight visual grouping.
- Structure layouts with ample clear space, using 20px padding for content blocks to prevent visual clutter.

### Don't
- Avoid using highly saturated, vivid colors; stick to the muted, earthy palette provided.
- Do not introduce rounded corners for images or cards; maintain sharp, crisp edges for visual elements.
- Refrain from using strong drop shadows or complex elevation; the design relies on flat presentation and color contrast.
- Do not deviate from the specified font families or weights, as the typographic precision is a core brand element.
- Avoid excessive interactive elements or buttons; interaction should be secondary to content display.
- Do not use letter-spacing other than 'normal' for any text elements.

## Imagery

This system relies heavily on high-quality, full-bleed architectural photography and natural landscape imagery. Images are presented without borders or significant contained treatment, creating an immersive, gallery-like experience. The focus is on the object or scene, often with descriptive captions below. There are no apparent abstract graphics, illustrations, or complex icon systems; simplicity and realism dominate the visual language.

## Layout

The page primarily uses a full-bleed layout for imagery, with content sections appearing as large blocks or canvases. Text is typically centered or left-aligned beneath images. There is a strong vertical rhythm, with sections clearly delineated by shifts in background color (often 'Earthy Ochre'). The overall layout feels spacious and unconstrained, allowing visual content to breathe. Navigation is minimal, likely a simple header or footer with key links.

## Agent Prompt Guide

Quick Color Reference: 
text: #000000
background: #af6446
border: #000000
accent: no distinct accent color
primary action: no distinct CTA color

Example Component Prompts:
1. Create an image display: an image with 0px radius, 10px `marginBottom`. Below it, add a caption: 'Merlo', 16px, 400 weight, #000000, 1.5 lineHeight.
2. Design a footer section: background is #f2edde, with 20px padding on all sides. It contains 'Scto Grotesk A', 14px, 300 weight, #000000 links separated by 20px `elementGap`.
3. Implement a page heading: 'Scto Grotesk A', 60px, 500 weight, #000000.

---

# Norgram — Style Reference
> monochromatic architectural blueprint

**Theme:** mixed

Norgram operates with a stark, high-contrast aesthetic, juxtaposing deep black and pristine white with minimal interruption. The system leans on precise typography and a grid-based rhythm, creating a sense of quiet authority rather than overt design flourishes. Color is used sparingly, primarily for functional accents, ensuring that content and structure remain the focal point. Components emphasize lightweight clarity: flat surfaces, crisp text, and subtle interactions.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Obsidian | `#000000` | `--color-obsidian` | Primary text, critical borders, main canvas backgrounds in dark sections, player controls |
| Canvas White | `#ffffff` | `--color-canvas-white` | Page backgrounds, subtle card surfaces, primary text on dark backgrounds |
| Deep Graphite | `#141414` | `--color-deep-graphite` | Card backgrounds, secondary dark surface elements |
| Powder Gray | `#efefef` | `--color-powder-gray` | Subtle background accents, muted borders, placeholder text |
| Ash Mist | `#777777` | `--color-ash-mist` | Muted helper text, secondary information text, subtle decorative strokes |
| Soft Stone | `#cecece` | `--color-soft-stone` | Subordinate body text, descriptive labels |
| Whisper Gray | `#b2b2b2` | `--color-whisper-gray` | Ghost button backgrounds and default link backgrounds, indicating non-primary actions |
| Smoked Glass | `#3f3f3f` | `--color-smoked-glass` | Supporting palette color for small decorative accents when the core palette needs contrast. Do not promote it to the primary CTA color |

## Tokens — Typography

### Helvetica Now Display — Primary display text, headlines, main body content, and navigation elements. Its precise tracking at larger sizes maintains clarity and strong visual presence. · `--font-helvetica-now-display`
- **Substitute:** Inter
- **Weights:** 400, 500
- **Sizes:** 10px, 12px, 36px, 87px
- **Line height:** 1.00, 1.10, 1.17, 1.67
- **Letter spacing:** -0.0200em at 87px, -0.0080em at 36px, -0.0050em at 12px
- **Role:** Primary display text, headlines, main body content, and navigation elements. Its precise tracking at larger sizes maintains clarity and strong visual presence.

### Times — Long-form editorial body text, detailed descriptions, and footer content. The serif choice adds a touch of classic sophistication against the clean sans-serif displays. · `--font-times`
- **Substitute:** Times New Roman
- **Weights:** 400
- **Sizes:** 14px, 16px
- **Line height:** 1.43, 1.50
- **Letter spacing:** normal
- **Role:** Long-form editorial body text, detailed descriptions, and footer content. The serif choice adds a touch of classic sophistication against the clean sans-serif displays.

### Helvetica Now Display — Interactive link text, small labels, and button text when a slightly bolder or more compact presentation is needed than the regular weight. · `--font-helvetica-now-display`
- **Substitute:** Inter
- **Letter spacing:** -0.0060em
- **Role:** Interactive link text, small labels, and button text when a slightly bolder or more compact presentation is needed than the regular weight.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| caption | 10px | 1.17 |  | `--text-caption` |
| body-sm | 12px | 1.17 |  | `--text-body-sm` |
| body | 36px | 1.17 |  | `--text-body` |
| body-lg | 87px | 1.17 |  | `--text-body-lg` |

## Tokens — Spacing & Shapes

**Density:** compact

### Border Radius

| Element | Value |
|---------|-------|
| cards | 4.0678px |
| forms | 10px |
| links | 26px |
| buttons | 7px |

### Layout

- **Section gap:** 68px
- **Card padding:** 0px
- **Element gap:** 8px

## Components

### Ghost Player Button
**Role:** Interactive control for media playback or navigation within content blocks.

Transparent background with Obsidian text and border. Radius 0px. No padding, focusing purely on the icon or minimal text label. Uses 'Helvetica Now Display - Regular' at 10px.

### Toast Notification Button
**Role:** Close button for ephemeral notifications or alerts.

Background is 'Smoked Glass' (rgba(63, 63, 63, 0.4)) with 'Canvas White' text. Has 7px border-radius and 5px vertical / 7px horizontal padding. Uses 'Helvetica Now Display - Medium' at 12px.

### Basic Content Card
**Role:** Container for showcasing work, images, or small content snippets.

Background is 'Deep Graphite' (#141414) with a minimal border-radius of 4.0678px. No explicit padding, content is flush to edges. Font is 'Helvetica Now Display - Regular'.

### Interactive Link Button
**Role:** Actionable text links in notifications or informational areas.

Background is 'Whisper Gray' (#999999) with 10px border-radius. Padding is 3px for all sides. Text is 'Canvas White' using 'Helvetica Now Display - Medium' at 12px.

### Image Player Controls
**Role:** Controls for navigating through image galleries or project details.

Uses 'Obsidian' for active states against light backgrounds. Icons and text appear with 0px padding and 0px radius.

### Meta Information Text
**Role:** Small, secondary textual information like dates or categories.

Body text using 'Ash Mist' (#777777) or 'Soft Stone' (#cecece), typically 12px 'Helvetica Now Display - Regular'.

## Do's and Don'ts

### Do
- Maintain a stark, high-contrast palette using 'Obsidian' (#000000) for text and 'Canvas White' (#ffffff) for backgrounds, and 'Deep Graphite' (#141414) for dark surfaces.
- Apply 'Helvetica Now Display - Regular' for headlines and main content, utilizing aggressive negative letter-spacing for large titles (-0.0200em at 87px).
- Use geometric, minimal border radii: 4.0678px for cards and larger containers, and 7px for interactive elements like buttons.
- Space elements using a compact rhythm, leveraging 8px for most element gaps and 68px for section separation.
- Convey interaction through subtle background fills like 'Smoked Glass' (rgba(63, 63, 63, 0.4)) or 'Whisper Gray' (#b2b2b2) rather than strongly chromatic accents.
- Prioritize functional clarity over decorative elements; every visual choice must serve to organize or highlight content precisely.

### Don't
- Avoid decorative shadows or complex elevation schemes; surfaces should remain flat or subtly transparent.
- Do not introduce vibrant accent colors; the system relies on a strictly achromatic palette with functional gray tints.
- Refrain from using organic or hand-drawn graphic elements; visuals should be precise, geometric, and structured.
- Avoid excessive padding within containers; content often sits flush with card edges or uses minimal, proportional spacing.
- Do not use generic system fonts for display text; 'Helvetica Now Display' is critical for maintaining the brand's sharp, modern edge.
- Do not apply large, soft rounded corners unless explicitly denoted; default radii are small and precise.

## Surfaces

| Level | Name | Value | Purpose |
|-------|------|-------|---------|
| 0 | Canvas White | `#ffffff` | Primary page background and default content areas. |
| 1 | Powder Gray | `#efefef` | Slightly elevated backgrounds, subtle containers, or section dividers. |
| 2 | Deep Graphite | `#141414` | Darker card surfaces and distinct content blocks within a lighter theme. |
| 3 | Obsidian | `#000000` | Dominant background for full-bleed dark sections, showcasing high-contrast content. |
| 4 | Smoked Glass | `#3f3f3f` | Transparent overlay for interactive elements like toast notifications, providing context without obscuring. |

## Imagery

This design system uses a blend of high-fidelity product photography, often showcasing technological devices or industrial designs in controlled, studio-like lighting against monochromatic backgrounds. These are integrated full-bleed or as large content blocks, serving as primary visual content rather than decorative elements. Abstract, minimalist graphics featuring clean lines and geometric structures are also present, often used subtly as background textures or brand elements. Icons are typically monochrome, outlined or filled, with a very fine stroke weight or solid, reflecting the system's overall precision.

## Layout

The layout is primarily a max-width contained grid, but projects and hero sections can expand to full-bleed. The hero pattern prominently features a full-bleed dark background with stark white, centered headlines. Content sections often alternate between light and dark thematic bands, utilizing consistent vertical spacing of 68px between major sections. Within sections, content is arranged in two-column text+image layouts or stacked centered blocks for more focused messages. There's an underlying compact density, with minimal internal padding on elements like cards, allowing imagery and text to command space. Navigation is a minimal top-bar, often ghosted or subtly present.

## Agent Prompt Guide

### Quick Color Reference
text: #000000
background: #ffffff
border: #000000
accent: #777777
primary action: no distinct CTA color

### 3-5 Example Component Prompts
1. Create a dark hero section: 'Obsidian' (#000000) background. Headline 'Forming Essentials' in 'Canvas White' (#ffffff) at 87px 'Helvetica Now Display - Regular', letter-spacing -0.0200em. Subtext 'We collaborate closely...' in 'Soft Stone' (#cecece) at 16px 'Times - Regular', normal letter-spacing.
2. Create a notification toast: 'Smoked Glass' (rgba(63, 63, 63, 0.4)) background, 7px border-radius. Text '2 weeks ago...' in 'Canvas White' (#ffffff) at 12px 'Helvetica Now Display - Medium', letter-spacing -0.0060em. 'Close' button with 'Whisper Gray' (#b2b2b2) background, 7px border-radius, 5px vertical / 7px horizontal padding, 'Canvas White' text at 12px 'Helvetica Now Display - Medium'.
3. Create a content card: 'Deep Graphite' (#141414) background, 4.0678px border-radius, 0px padding. Content title 'Even Realities' in 'Obsidian' (#000000) at 12px 'Helvetica Now Display - Regular', letter-spacing -0.0050em. Subtitle 'Undisturbed Connections' in 'Ash Mist' (#777777) at 10px 'Helvetica Now Display - Regular'.

---

# Studio Emmerer — Style Reference
> Architectural Blueprint, Night Mode

**Theme:** dark

Studio Emmerer employs a minimalist, almost stark aesthetic, prioritizing content through a high-contrast dark theme. Visual hierarchy is achieved primarily through typography and subtle spacing. Surfaces are uniformly dark, with distinction created by thin hairline borders rather than depth or shadows. The overall impression is one of restrained precision, reminiscent of architectural blueprints presented on a night-mode screen.

## Tokens — Colors

| Name | Value | Token | Role |
|------|-------|-------|------|
| Pitch Black | `#000000` | `--color-pitch-black` | Dark borders and separators for elevated surfaces and inverted UI. Do not promote it to the primary CTA color |
| Steel Gray | `#999999` | `--color-steel-gray` | Muted text for secondary information like table headers or metadata. Provides a subtle visual separation from primary text |
| Preview White | `#ffffff` | `--color-preview-white` | Color used for text that appears over preview images, ensuring readability against varied photographic backgrounds |

## Tokens — Typography

### NHaasGrotesk — The sole typeface for all text content, from body to headlines and interactive elements. Its consistent weight and precise tracking maintain a disciplined, uniform voice across the interface. · `--font-nhaas-grotesk`
- **Substitute:** Helvetica Neue
- **Weights:** 400
- **Sizes:** 15px, 16px, 20px, 30px
- **Line height:** 0.90, 1.16
- **Letter spacing:** -0.165, -0.16, -0.16, -0.15
- **Role:** The sole typeface for all text content, from body to headlines and interactive elements. Its consistent weight and precise tracking maintain a disciplined, uniform voice across the interface.

### Type Scale

| Role | Size | Line Height | Letter Spacing | Token |
|------|------|-------------|----------------|-------|
| body-sm | 15px | 1.16 | -0.165px | `--text-body-sm` |
| subheading | 20px | 0.9 | -0.16px | `--text-subheading` |
| heading | 30px | 0.9 | -0.15px | `--text-heading` |

## Tokens — Spacing & Shapes

**Density:** comfortable

### Border Radius

| Element | Value |
|---------|-------|
| none | 0px |

### Layout

- **Section gap:** 32px
- **Card padding:** 12px
- **Element gap:** 5px

## Components

### Navigation Link
**Role:** Interactive text link for site navigation.

Uses NHaasGrotesk, 16px, 400 weight, Pitch Black text. On hover, the Pitch Black text remains, the underline appears. No background or padding. The spacing between nav items is 30px.

### Read More Link
**Role:** Text link for expanding content.

Uses NHaasGrotesk, 16px, 400 weight, Pitch Black text, with a Pitch Black border-bottom. No padding.

### Project Table Row
**Role:** A single row within the tabular project listing.

Text uses NHaasGrotesk, 16px, 400 weight, Pitch Black. The row has a bottom border of 1px solid Pitch Black. Padding of 12px top/bottom and 4px left/right. The labels like 'PROJECT', 'TYPE', 'LOCATION', 'YEAR' use Steel Gray text.

### Project List Item
**Role:** A single project entry in the main list. Behaves like a link.

Displaying 'PAZ Graz Official Graz 2025' like a block link, using 'NHaasGrotesk', 16px, 400 weight, Pitch Black text, with a 1px solid Pitch Black border underneath the entire listing. The `Open Project` text within uses the same styling but with an arrow icon.

## Do's and Don'ts

### Do
- Always use 'NHaasGrotesk' as the primary typeface for all text elements.
- Maintain a high-contrast dark theme using Pitch Black (#000000) for backgrounds and primary text.
- Implement borders using 1px solid Pitch Black (#000000) to delineate sections and interactive elements.
- Utilize 0px border-radius for all elements, maintaining sharp, angular forms.
- Apply Steel Gray (#999999) for secondary text such as table headers or metadata.
- Ensure consistent spacing with a base unit derived from 5px for element gaps and 32px for section gaps.
- Use Preview White (#ffffff) for any text appearing directly over photographic or illustrative content.

### Don't
- Do not introduce any background colors other than Pitch Black (#000000) for primary surfaces.
- Avoid using shadows or elevation effects; elements should remain flat against the dark background.
- Do not deviate from the 'NHaasGrotesk' typeface or introduce additional font families.
- Refrain from using any color accents; the palette is strictly achromatic with specific allowances for text over media.
- Do not use rounded corners or any non-zero border-radius on any UI elements.
- Avoid decorative gradients; surfaces should be solid colors.
- Do not introduce unnecessary padding or margin, adhere to the established spacing units.

## Imagery

This site features product/architectural photography exclusively. Images are full-bleed within their sections, presenting stark, uncropped views of built environments. There are no illustrations, icons are minimal and functional (arrows), and there's no lifestyle photography. The imagery serves as direct project showcase rather than decorative atmosphere, often occupying significant visual space.

## Layout

The page primarily uses a full-bleed layout, particularly for hero sections and image showcases. Content sections alternate between full-width black backgrounds and a max-width centered container for text-heavy content or tabular data. Vertical rhythm is maintained by consistent section gaps. Navigation is minimalist, typically a horizontal inline list. The overall arrangement is straightforward and linear, prioritizing content presentation with a clear, functional aesthetic.

## Agent Prompt Guide

Quick Color Reference: text: #000000, background: #000000, border: #000000, accent: no distinct accent color, primary action: no distinct CTA color

Example Component Prompts:
Create a primary navigation link titled 'about': NHaasGrotesk, 16px, 400 weight, Pitch Black text (#000000). No background, no padding, 0px border-radius.
Create a 'read more' text link: NHaasGrotesk, 16px, 400 weight, Pitch Black text (#000000) with a 1px solid Pitch Black (#000000) bottom border.
Create a project table row for 'PAZ Graz Official Graz 2025': NHaasGrotesk, 16px, 400 weight, Pitch Black text (#000000). 12px vertical padding, 4px horizontal padding. A 1px solid Pitch Black (#000000) border-bottom.
