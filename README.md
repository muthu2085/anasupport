# ANA Office & Admin Consultant — website

Static site. No build step, no dependencies to install. Open `index.html`, or serve the
folder (`python -m http.server 5500`) and visit http://127.0.0.1:5500.

```
index.html  about.html  office-consulting.html  admin-consulting.html
services.html  pricing.html  quote.html  contact.html  404.html
assets/css/style.css   one stylesheet, sectioned 0–16
assets/js/main.js      the motion layer
assets/img/            logo.svg, favicon.svg, and your photos
```

GSAP, ScrollTrigger and Lenis load from CDN. The site needs a connection to animate and
renders correctly (just still) without one.

## Design system

Light corporate. White and a pale tint carry the page; dark is used only for the footer,
the full-bleed image bands and the featured pricing tier. Headlines are **Lexend**, body
copy is **Inter**. Colour, spacing and radii are custom properties at the top of
`style.css` under `:root` — change them there, not per component.

## Three things to do before launch

**1. Compress the photography.** The ten supplied images total 7.0 MB and the home page
alone carries 2.5 MB of them. Run them through Squoosh or TinyJPG at ~75% quality and
resize to the widths below; expect roughly an 80% reduction with no visible loss.

| File | Used on | Shown at |
|---|---|---|
| `office-admin-consulting-chennai.jpg` | home hero, services band | 1400 wide |
| `office-space-consulting-site-visit.jpg` | home, "the operational gap" | 900 wide |
| `workplace-operations-management.jpg` | home image band | 1920 wide |
| `workplace-operations-consultant.jpg` | home, leadership | 900 wide |
| `administrative-consulting-review.jpg` | about, background | 900 wide |
| `corporate-office-team-collaboration.jpg` | about image band | 1920 wide |
| `office-relocation-planning-meeting.jpg` | office consulting, engagement | 900 wide |
| `office-setup-project-coordination.jpg` | office consulting band | 1920 wide |
| `administrative-process-audit.jpg` | admin consulting, engagement | 900 wide |
| `back-office-administration-team.jpg` | admin consulting band | 1920 wide |

Filenames and alt text are already written for search. If you swap a photo, keep the
filename and update the `alt` to describe what the new image actually shows.

**2. Drop in the official logo.** Save the supplied artwork as `assets/img/logo.png` and it
replaces the vector version everywhere automatically. Delete the file to fall back.

**3. Wire the forms to a backend.** Both forms (`quote.html`, `contact.html`) currently
open the visitor's mail client pre-filled. To post them properly, add an endpoint:

```html
<form class="form" data-form data-endpoint="https://formspree.io/f/YOUR_ID" ...>
```

Any service accepting a `multipart/form-data` POST and returning 2xx works. File uploads
only reach a server through a real endpoint — the mailto fallback cannot carry attachments.

## Animation hooks

Add these attributes to any element; `main.js` picks them up.

| Hook | Effect |
|---|---|
| `data-words` on a heading | word-by-word masked reveal |
| `class="r-up"` / `class="r-fade"` | lifts in / fades in |
| `class="r-stagger"` on a parent | children reveal in sequence |
| `data-par="-0.2"` | parallax; negative moves against the scroll |
| `data-drift` on a `.ph` frame | slow image drift inside a fixed crop |
| `data-count="15" data-suffix="+"` | counts up when scrolled into view |

Everything switches off for visitors who set "reduce motion" in their OS. There is no
pinned or scroll-hijacked section — sections scroll normally.
