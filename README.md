# ANA Office & Admin Consultant — website

No build step, no dependencies to install. Open `index.html`, or serve the folder
(`python -m http.server 5500`) and visit http://127.0.0.1:5500.

**Hosting: the forms need PHP.** Everything else is static, but `form-handler.php` must be
executed by the server. Any normal shared host (cPanel, Hostinger, GoDaddy, Bluehost) runs
it as-is. **GitHub Pages does not** — it serves `.php` files as plain text and every form
will fail. If the site stays on Pages, remove `data-endpoint="form-handler.php"` from the
four forms and they fall back to opening the visitor's mail client instead.

```
index.html  about.html  team.html  career.html  partner.html
office-consulting.html  admin-consulting.html  services.html
pricing.html  quote.html  contact.html  404.html
form-handler.php       one endpoint for all four forms
assets/css/style.css   one stylesheet, sectioned 0–16
assets/js/main.js      the motion layer
assets/img/            logo.svg, favicon.svg, and your photos
```

`about.html` is "Who We Are" in the menu. `team.html` carries the operations team;
the founder profile lives on `about.html`.

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

**3. Check mail delivery on the host.** All four forms post to `form-handler.php`, which
mails `admin@anasupport.biz`. Send one test submission per form after deploying.

If mail does not arrive, it is almost always the `From:` address. `$CONFIG['from']` must be
a real mailbox **on the site's own domain** or the host's mail server will drop it — never
set it to the visitor's address. The visitor's address goes in `Reply-To:`, which the
handler already does, so you can reply straight from the notification email.

For higher deliverability, replace the `mail()` call with SMTP (PHPMailer) authenticating
as `admin@anasupport.biz`. Add an SPF record for your host either way.

## Forms

One endpoint, `form-handler.php`, serves every form. Each form declares which ruleset to
apply through a hidden `form_type` field:

| Page | `form_type` | Required fields | Attachments |
|---|---|---|---|
| `contact.html` | `contact` | name, email, message | no |
| `quote.html` | `quote` | full name, phone, email, requirement | yes |
| `partner.html` | `partner` | full name, company, phone, email, brief | yes |
| `career.html` | `career` | full name, phone, email, role, about you | yes (CV) |

Validation runs server-side and is authoritative — email format, phone digit count, URL
scheme, real calendar dates, min/max lengths, and `end_date` not preceding `start_date`.
Uploads are checked by extension **and** by sniffed MIME type, capped at 5 MB per file,
15 MB per submission, 5 files. Every field is stripped of control characters and CR/LF
before it reaches a mail header, so the form cannot be used to inject headers.

Two anti-spam measures: a `website` honeypot field (hidden by `.hp`, answers 200 so bots
do not retry) and a 30-second per-IP throttle kept in the system temp directory.

Responses are JSON. On `422` the body carries `{"errors": {"field": "reason"}}` and
`main.js` paints each message under its field and scrolls to the first one. To change the
recipient, edit `$CONFIG['to']` — it is the only place the address appears.

## Adding a form

1. Copy an existing `<form class="form" data-form data-endpoint="form-handler.php" ...>`,
   including the hidden `form_type`, `page` and `.hp` honeypot block.
2. Add a matching entry to `$FORMS` in `form-handler.php` with a `label`, `required` flag
   and `type` per field.
3. If it takes files, name the input `attachment[]` and set `'files' => true`.

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
