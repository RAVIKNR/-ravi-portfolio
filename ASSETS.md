# Portfolio visual assets

Phase 2 asset inventory for the Vite portfolio project.

## Raster assets

| Asset | Path | Dimensions | Format | Purpose |
| --- | --- | --- | --- | --- |
| Original portrait | `public/assets/portrait.png` | 1152 × 768 px | PNG | Source portrait, preserved unchanged from the supplied image. It retains the cinematic monochrome treatment, dark background, right-side subject, and left negative space. |
| Depth map | `public/assets/portrait-depth-map.png` | 1152 × 768 px | 8-bit grayscale PNG | Genuine monocular relative-depth output from Depth Anything V2 Small, aligned to the portrait canvas for the future Three.js shader. |

The portrait source was copied without resizing, cropping, color adjustment, or recompression. Its SHA-256 hash is `C49229C921209428EE69CE9D1F0E7BD837236694A982534B964CB96235FFE542`.

### Depth-map requirements

`portrait-depth-map.png` was generated locally with `depth-anything/Depth-Anything-V2-Small-hf` using PyTorch and Transformers. The model was run on the original 1152 × 768 RGB portrait; its predicted depth tensor was bicubically resized to exactly 1152 × 768 and normalized to an 8-bit grayscale PNG. The portrait itself was not edited.

Depth Anything produces relative inverse depth, so larger values represent nearer objects. The saved map uses:

- Black (`0`) for the background/farthest areas.
- Mid-gray for shoulders, shirt, and neck/intermediate depth.
- Light gray to white (`255`) for the face and hair/foreground.
- Natural model-estimated facial structure, without manually painting facial details.

The output was technically checked for exact dimensions, grayscale mode, non-flat values, and valid PNG encoding. Visual inspection confirms the subject silhouette, face, hair, shoulders, and left negative-space background remain aligned with the source. As with all monocular depth estimates, fine facial relief is approximate rather than metric ground truth.

## Vector assets

| Asset | Path | Format | Purpose |
| --- | --- | --- | --- |
| Abstract geometric portfolio logo | `public/assets/logo.svg` | SVG | Original angular mark made from three balanced facets in warm beige and vermilion. It intentionally avoids initials, a bat silhouette, an enclosing oval, and existing superhero or brand identities. |
| Social icon sprite | `public/assets/social-icons.svg` | SVG | Minimal outline symbols for GitHub, LinkedIn, and Instagram. Use via SVG <use> with #github, #linkedin, or #instagram. |
Actual social profile URLs and usernames are intentionally not included. Add them when the real accounts are confirmed; do not infer them from these icon assets.

## Typography

No local font files were present, so `public/assets/fonts/` is intentionally empty.

Typography is loaded in `index.html` from Google Fonts with preconnect hints and one combined stylesheet request:

`https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap`

Recommended usage:

- **Space Grotesk**: display/headline typography; weights 500, 600, and 700.
- **Manrope**: navigation, metadata, and small readable text; weights 400, 500, and 600.

The current CSS family assignments remain unchanged by design; applying these families to the homepage belongs to Phase 3. If self-hosting becomes necessary, add licensed local files to `public/assets/fonts/` and replace the hosted stylesheet with `@font-face` rules.

## Color system

| Token | Hex | Intended use |
| --- | --- | --- |
| Near black | `#0B0B0B` | Page background and deepest negative space |
| Charcoal | `#121212` | Secondary surfaces and subtle panels |
| Warm beige | `#C1B3A1` | Primary editorial typography |
| Vermilion | `#E95134` | Accent details, active states, and emphasis |
| Dark portrait shadow | `#3B2E27` | Deep warm portrait grading/shadow reference |
| Portrait midtone | `#5F5249` | Midtone grading reference |
| Portrait highlight | `#84746A` | Highlight grading reference |

## Remaining manual requirements

1. Replace the abstract mark only if a personal identity or approved wordmark is later provided.
2. Add verified GitHub, LinkedIn, and Instagram profile URLs during homepage implementation.
3. Generate and validate the aligned depth map using a real local depth-estimation model before enabling WebGL displacement.
4. Assign the loaded font families to the relevant display and secondary text selectors during Phase 3.
