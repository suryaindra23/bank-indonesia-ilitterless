# Antislop delivery check

Scope: email authentication, backend integration, and existing mobile/website resident layouts. Mode: during, explicitly selected by user. Direction: DESIGN.md and the user-requested iLitterless reference. This is a source and browser review, not an accessibility certification.

## Hard gate

- R-02 PASS: no em dash found in application text across src/, shared/, index.html, and warga/index.html.
- R-03 PASS: browser tests check horizontal overflow at 390, 899, 900, and 1440 px across the four resident tabs; voucher codes and resident IDs wrap.
- R-17 PASS: seeded pilot records removed; dashboard figures derive from authenticated server data. Reach target remains the prototype's explicit 60-resident program target.
- R-18 PASS: no testimonials or fabricated endorsements appear in the application.
- R-23 PASS: existing Bibu illustrations and user-authorized iLitterless logo reused; no new brand or profile assets generated.
- R-24 PASS: resident home link, real tab navigation, and authenticated CSV download resolve to implemented destinations; role switching cannot grant server access.
- R-25 PASS: measured core contrast ratios: teal/white 5.54, ink/white 17.93, secondary/white 4.83, teal/tint 4.89, verified 5.49, pending 5.01, rejected 4.58. Disabled controls are visibly distinguished.
- R-26 PASS: auth forms call API endpoints; staff actions, deposits, stock changes, redemption, and fulfillment have server handlers. Unsupported simulated scan/WhatsApp actions removed from the UI.
- R-27 PASS: connection loading, submit busy state, inline auth errors, upload failures, empty queue, empty action history, zero balance, and unavailable stock are implemented.
- R-28 PASS: help covers recording actions, review results, assisted recording, and reward collection.
- R-32 PASS: native form/submit/select controls; focus-visible outline; modal Tab handling and Escape close. Browser tests exercise Escape and labeled inputs.
- R-33 PASS: current changes are written directly in application source; no runtime or repository helper rewrites CSS/source to introduce a feature.
- R-34 PASS: app deliberately stays in the user-requested light palette; dark device preference was checked and does not recolor the app.
- R-35 PASS: npm test, browser end-to-end tests, and npm run build executed. Recorded flows cover registration, verification, login, recovery, photo upload, review, lessons, role restrictions, enrollment, stock, CSV, and cross-device persistence.
- R-36 PASS: no claimed compliance or invented performance figures. SMTP connection verification succeeded; documentation distinguishes this from actual inbox delivery.
- R-37 PASS: design direction written before final UI adjustments; ENERGY 2 / RHYTHM 2 / MOTION 1 derived from the supplied reference and established product flows.
- R-38 PASS: new production database starts empty. No random resident accounts, fake completed actions, fake stock, or invented activity feed is displayed.
- R-39 PASS: document language/title/landmarks retained; inputs labeled; password autocomplete provided; file upload has an accessible name; buttons expose busy/disabled state; reduced-motion rules remain active. Login dock adjusted to avoid covering form fields.
- R-40 PASS: raster logo has intrinsic dimensions; evidence photos have reserved display areas; Bibu uses existing inline SVG. No third-party blocking JavaScript was added and no unmeasured speed claim is made.

## Purpose gate

- R-01 PASS: white/teal identity follows the supplied reference; status tints communicate review states. No decorative background glow introduced.
- R-04 PASS: camera, book, gift, user, and review icons retain task-specific meaning from the prototype; no generic AI/sparkle icons added.
- R-06 PASS: Montserrat is the inspected reference typeface; numeric emphasis is reserved for balance and reporting.
- R-07 PASS: no decorative grid, blueprint, or dot background introduced.
- R-08 PASS: arrows are not attached to actions as repeated decoration.
- R-09 PASS: status labels communicate real review/stock/access state, not promotional claims.
- R-10 PASS: no glass effects added.
- R-12 PASS: lightweight login surface and temporary toast/modal elevation distinguish foreground tasks; no shadow treatment applied everywhere.
- R-13 PASS: no glowing components.
- R-14 PASS: repeated lists correspond to real lessons, rewards, actions, or program indicators; no fabricated feature-card section.
- R-19 PASS: no default mascot loop; celebration is triggered by earned points and respects reduced motion. Upload uses a real pending status rather than invented percentage progress.
- R-22 PASS: Bibu is the supplied application's character; no unrelated generated illustration added.

## Liveliness

- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 1 recorded in DESIGN.md.
- Consistency PASS: quiet reference typography, teal focal actions, and task-triggered feedback match those dials.
- Focal point PASS: login form, record-action button, pending reviews, and pilot readout each lead their respective screen.
- Spacing PASS: mobile stays single-column; desktop separates introduction/form and concurrent content.
- Accent PASS: teal leads primary actions; semantic state colors are reserved for outcomes.
- Identity PASS: Bibu and the iLitterless palette/typeface persist across authentication and application screens.
- Design read PASS: source and reasons recorded in DESIGN.md; no new aesthetic invented.

## Craftsmanship and consistency

- C-1 PASS: visual choices trace to the reference, existing prototype, or task state.
- C-2 PASS: visible application actions have API/navigation handlers; unavailable rewards use actual zero stock.
- C-3 PASS: screens support resident recording, education, rewards, assisted service, or program reporting; no marketing filler added.
- C-4 PASS: browser tests cover mobile/desktop, session restoration, API failures, and account separation; backend tests cover expired/replayed tokens and retry idempotency.
- C-5 PASS: records and balances come from SQLite; SMTP and test results reflect observed tool output.
- R-05 PASS: auth, resident home, staff queue, and BI report use compositions matching their tasks.
- R-11 PASS: pill actions, 12 px inputs, and 14 px content surfaces preserve shape hierarchy.
- R-15 PASS: actions name their outcome: login, register, send recovery link, save deposit, redeem, fulfill.
- R-16 PASS: no AI promotional claims introduced.
- R-20 PASS: existing Bibu identity and Lowokwaru program flows remain identifiable.
- R-21 PASS: fixed light theme follows the user's explicit visual reference.
- R-29 PASS: white, ink, and teal remain core; additional colors communicate review outcomes or existing educational categories.
- R-30 PASS: no unrelated product interface used as a template.
- R-31 PASS: implementation reasons are recorded here and in DESIGN.md.

## Limits

The service is running locally, not deployed for public access. Public use needs a persistent server, HTTPS origin, and internal staff/BI accounts provisioned by the operator. Automated emails in tests use a JSON transport; real SMTP credentials were connection-tested without sending test messages to residents. No broad security or accessibility certification is implied.

## Community extension, 25 November 2026

- R-03 / C-4 PASS: community screen and five-item navigation checked at 320, 390, 900, and 1440 px; browser assertions verify the content's scroll width as well as the document's width. Mobile and desktop screenshots inspected.
- R-17 / R-38 / C-5 PASS: shared/community.js sums the same server-authoritative earned points used by member accounts. Tests cover pending/rejected exclusions, mission points, reward spending, and points contributed by another account.
- R-23 / R-24 / R-26 PASS: the explicitly requested community feature has a real tab, profile link, and action-recording entry. Group icon names that destination; no unrelated assets added.
- R-25 PASS: new text uses the previously measured ink/white, secondary/white, and teal/tint pairs. Current community is identified with text as well as color.
- R-27 PASS: zero-point groups show no ranking; an empty-score message explains how to contribute. Equal positive totals share the same rank.
- R-35 PASS: 12 unit/API tests and 7 browser tests passed; production build succeeded. Community API rejects anonymous requests and exposes aggregate fields only.
- R-37 / Purpose / Liveliness PASS: existing white–teal identity and ENERGY 2 / RHYTHM 2 / MOTION 1 retained. Personal contribution summary and ranking list form two desktop columns and one mobile flow.
- R-39 PASS: five labeled native navigation buttons preserve active state, ranking list uses ordered-list semantics, headings identify sections, and existing focus styles remain. No new animation introduced.

## Daily points, curated articles, and team learning materials

- R-17 / R-38 / C-5 PASS: new daily rates are explicitly 1, 2, 3, 5, 5, and 10 points. Same-day duplicate types earn no extra points. Article points are 50 only after staff approval. Migration tests preserve earned legacy points and spent balances.
- R-24 / R-26 PASS: article entry, four-field submission, private photo, email retry, approval/rejection, material publication, authenticated download/playback, and completion all call implemented endpoints. Browser tests cover submission, curation, and publication of all four material types.
- R-27 PASS: article delivery failure remains visible/retryable without granting points. Upload validation, required field errors, busy buttons, empty article history, and completion-already-recorded responses are implemented.
- R-23 / Purpose PASS: no new decorative assets or invented media thumbnails. Team uploads and writes the real curriculum; Office files open/download natively and no slide preview is claimed.
- R-35 PASS: 16 unit/API tests and 9 browser tests passed. Coverage includes article privacy, actual four-part email payload and attachment, retry after SMTP failure, award-once curation, all material formats, private files, malicious video URL rejection, and idempotent completion. SMTP in automated tests is mocked/JSON; no test email was sent to the iLitterless inbox.
- R-03 / R-25 / R-39 PASS: mobile article form and desktop learning-management layout inspected; existing white–teal contrast pairs and native labels/controls retained. Video space has a fixed aspect ratio, controls are user initiated, manual text is escaped, and the file picker no longer triggers destructive focus refreshes while editing.
- R-36 / R-37 PASS: design direction retained in DESIGN.md. Learning completion is explicitly self-acknowledged for new materials, not proof that a video or PowerPoint was fully viewed. Real email recipient is documented from the inspected iLitterless Contact page; SMTP sender credentials remain server-only.

## Dedicated iLitterless and Bank Indonesia dashboards

- R-03 / R-35 PASS: dedicated-page browser test checks staff login, learning-management access, BI login, six indicators, active navigation, cross-role denial, and layout at 390/900/1440 px. Existing nine end-to-end cases also passed with canonical redirects from the root page.
- R-17 / R-38 / C-5 PASS: figures in the supplied screenshot were not copied into data; both dashboards use authenticated server records. Visual QA screenshots use isolated test accounts/data.
- R-24 / R-26 PASS: `/petugas/` and `/bank-indonesia/` are independent production build entries. Header links use real paths; legacy root sessions redirect to their role's entry. Cross-role pages show an access explanation and links to the user's own page or logout. No role impersonation toggle.
- R-25 / Purpose PASS: active-role control uses teal/white. BI charts match the requested teal/ink/grey hierarchy, with rejection red. Indicator delta labels no longer inherit the upload bar's clipping styles.
- R-27 / R-39 PASS: role-specific login identifies the required account; public privileged registration is not offered. Wrong-role state includes a concrete recovery action, labels remain readable, and navigation retains keyboard focus styling.
- R-37 / Liveliness PASS: existing brand direction retained; report structure follows the user's screenshot, while operational staff controls follow the actual workflows. No decorative dotted background or invented metric added.

## 25 November 2026 — KOBI palette, supplied mascot, multiple roles — PASS

Direction: latest user-supplied KOBI palette overrides earlier teal identity. Navy #0B2D6B, Ocean #2D8CFA, Sky #A9D6FF, Forest #15803D, white; secondary colors follow reference. Supplied mascot sheet preserved unchanged, poses selected by CSS. Finite greetings/content entrances; reduced-motion disables animation. Corrected sprite isolation after visual review to blend white background into aqua panels.

Contrast: navy/white 13.11:1, charcoal/sand 9.90:1, forest/white 5.02:1, forest/sand 4.79:1, navy/pink 6.13:1, navy/yellow 8.56:1. Ocean remains accent rather than small text. Responsive browser tests cover 320, 390, 899, 900, 1440px without horizontal overflow. Reviewed community mobile and desktop screenshots; supplied character, readable hierarchy, functional green CTA, actual test-fixture rankings.

Verification: 17 unit/API tests and 11 browser tests passed; production build passed. After final sprite blend correction, community browser test and build passed again. Multi-role test switches one account through resident, staff, BI with unchanged password/session; forged ungranted role still denied. Owner email grants read back from live database as peserta/admin/bi. Public signup remains resident only. No production test emails sent. DESIGN.md and README reflect final direction and provisioning workflow.

## 25 November 2026 — Supabase migration and Vercel preparation — PASS

Migrated the actual local SQLite source to the user-supplied Supabase project. Import copied 2 accounts, 1 original session, state, 7 audit records, 2 verified-account records, 3 role grants, and 1 email token; no referenced user-upload files existed in the source. Read-back matched IDs, account hashes, grants, and domain data. A consistent SQLite backup remains under ignored data/backups with mode 600. Migration repeat recognized its checksum and left the cloud target unchanged even after target sessions changed.

Backend uses asynchronous PostgreSQL queries, pooled connections, TLS CA verification, and transactional state row locks. Tables reside in private bibu schema with RLS enabled. Existing email/password authentication remains intact. Public bundle contains no configured backend secrets. SQLite remains only a local development option; cloud startup fails rather than using ephemeral local data. Vercel routing/build configuration is prepared; no Vercel deployment performed.

Supabase private bucket and direct signed uploads verified against the actual service: upload, header/size inspection, byte equality, and anonymous-read denial. Temporary smoke object/session removed. API read checks passed for all three owner roles; BI responses omit resident names/email. No real test email sent. Material cap is 50 MB to match the supplied project's current storage limit; UI and backend agree. Photo cap remains 6 MB. Existing visual palette/layout unchanged apart from the upload-limit label.

Validation: 18 local unit/API tests, 13 PostgreSQL-engine API tests (isolated PGlite), and 11 browser tests passed; production Vite build passed. New direct-upload tests cover unauthorized users, cross-owner references, staff-only materials, oversized/invalid files, publication and protected downloads. README documents Vercel environment, setup/import commands, JSON-state scalability limit, per-instance rate limiting, temporary download URLs, and orphan-upload cleanup limitation.

## 25 November 2026 — compact dashboard role navigation — PASS

User flagged full-width aqua role bar. Removed container fill/stretch, retained compact role links, navy active role and aria-current; operational menus remain separate. Mobile has a divider and three readable link targets. Reviewed staff login screenshots at 390px and 900px. Checked 320/390/900/1440px: no horizontal overflow; every role target at least 44px high. Existing keyboard focus and reduced-motion behavior preserved. Production build passed; no backend or permission behavior changed.

## 26 November 2026 — role switching inside profile — PASS

Removed global role links from resident header and staff/BI page templates. Resident profile retains authorized access links only for multi-role accounts; desktop header links directly to Saya. Staff/BI use native profile disclosure containing name/email, current role, and granted role links only when multiple roles exist. Single-role BI test confirms no role switching links; authentication and permission denial remain unchanged. Keyboard Escape closes disclosure and returns focus, outside click dismisses it. Reviewed resident profile desktop and staff profile mobile screenshots. Multi-role browser test verifies all three pages with the same session, disclosure visibility and no horizontal overflow at 320/390/1440px. Both focused role browser tests passed; production build passed.

## 26 November 2026 — public landing, complete profiles, weekly quiz — implementation PASS; live activation pending

Direction: inspected the supplied iLitterless homepage and adapted its headline/information/statistics pattern to the user's KOBI palette and supplied mascot. Landing at / now has three headline sections, four server-backed statistics, and recent verified actions. Root no longer doubles as a login page. Public feed and resident home show approved activities without names, email, WhatsApp, or private proof photos. Zero and unavailable remain distinct.

Profile onboarding requires all requested fields after email verification and for existing incomplete resident profiles. Origin choices: community, institution, event, other. Server validates and gates participant actions until complete. BI strips profile/contact details. Named communities group case-insensitively; legacy locality groups remain for profiles without community origin.

Weekly quiz: ten questions seeded, editable by staff for current/next week; no edits after any participant begins that period. Jakarta Sunday midnight period boundaries, one answer per question, ten answers lock completion. One point per correct answer, history retained. Active questions are frozen per period, answer keys stay private until answering. If staff do not publish another set, the last bank is reused. Prior mission bonuses freeze once; existing points remain. Learning displays modules without embedded quiz questions. Native radio groups, fieldsets, labeled inputs, error states, Escape-supported profile menu, and reduced-motion behavior retained.

Validation: 24 unit/API tests, 16 isolated PostgreSQL-engine API tests, 12 browser tests passed (52 total); Vite production build passed. Tests include concurrent duplicate quiz answers, 10-question completion, stale-week rejection, exact Saturday/Sunday Jakarta boundary, staff edit locks, profile mandatory fields, public aggregate definitions, privacy, and module completion. Visual review: landing mobile + fresh desktop, profile form mobile, quiz mobile, staff editor desktop. Browser widths 320/390/900/1440 checked without overflow. Test-only authentication rate allowance raised for the larger browser suite; production remains 30 per 15 minutes.

Live activation is pending Supabase database credentials. Both original and user-updated password were rejected by transaction/session poolers with 28P01; direct hostname was unavailable in this environment. Supabase REST credentials still returned HTTP 200. No live domain migration or profile/quiz mutation ran because database authentication failed before initialization. No fallback to stale SQLite was introduced. Latest password is only in ignored .env; a current full pooler URI has been requested. Tests and screenshots with populated statistics use isolated fixtures, not production data.

## 26 November 2026 — requested local database activation — PASS

At user request, explicitly switched local .env to SQLite/local object storage by clearing active DATABASE_URL and SUPABASE_URL; prior cloud values remain commented in ignored .env. Created consistent SQLite backup (mode 600) before startup. Backend listening on 3001; direct health and frontend-proxied public overview both HTTP 200. Verified 2 local accounts, 3 role grants, and unchanged local point balances after mission-to-quiz update. This uses the existing local snapshot, not an automatic reverse sync of cloud changes. Cloud authentication remains unresolved, while local operation is active. No UI or schema changes required.

## 26 November 2026 — community ranking on Beranda — PASS

Added up to five community rankings to resident home above recent activities, using the same row renderer, backend order/ranks, totals and current-community marker as Komunitas. Link opens the existing full ranking. Zero-score entries remain unranked with an explanatory empty-points message. Focused browser test verified live fixture totals against the API, navigation to the full community page, and no horizontal overflow at 390/1440px; existing 320/900px community checks also passed. Reviewed mobile ranking screenshot. Production build passed. No database or point-rule changes.

## 26 November 2026 — quiz accessed from its own home section — PASS

User explicitly selected removal of Kuis from navbar and access via Beranda. Main navigation returns to five items. Dedicated home quiz card opens the quiz section; a labeled return button goes back to Beranda. Fixed accidental simultaneous Beranda/quiz selection; no unrelated destination is marked active while viewing the standalone section. Reviewed desktop navbar screenshot. Two focused browser tests passed covering five navigation items, no quiz navbar entry, quiz entry/answer persistence, return navigation and responsive community layout. Build passed. No quiz rules, scores or database changes.

## 26 November 2026 — COBI identity, resident filters, video and community/profile polish — PASS

Latest approved identity is COBI with the exact subline “Community Base Of iLitterless Indonesia”. Header, login/home identity, exported CSV filename, default reward label, server copy and launcher follow it. CSS palette token names, mascot, account IDs, sessions and historical records are preserved. Local catalog migration renames only the old default Tumbler KOBI reward; local SQLite backed up before restart. API health is HTTP 200.

Staff Database warga now has combined labeled search/origin/name/city/district/locality controls, dependent option sets, case-insensitive name/location matches, result counts, reset and retained selection across tab changes. Added origin/district/city columns. Unknown profiles have an explicit Belum diisi category. Existing server role boundaries unchanged. Browser test exercises combinations, search/no-results, persistence/reset and 390/1440px layout.

YouTube 153 cause addressed by setting strict-origin-when-cross-origin specifically on provider iframes while keeping the document no-referrer policy. A real browser request intercepted at the external endpoint carried Referer http://127.0.0.1:5175/; provider direct-watch link is also verified. This checks transport identity, not availability/playback rights of arbitrary third-party videos. Guidance: https://support.google.com/youtube/answer/171780 .

Community uses the existing supplied mascot, a personal greeting, actual counts/rank/contribution, community-specific entries from recent approved activities, a real refresh action and fetch time in WIB. Finite entrance motion respects reduced-motion; no invented online counts or achievement targets. Profile now has explicit primary/secondary column groups and an action footer, readable pending badges, structured profile label/value rows and consistent role links. Mobile collapses to one column and keeps QR visible.

Validation: 24 unit/API tests passed; 13 browser cases passed across the suite and focused rerun. The suite exposed a toast intercepting quiz buttons; pointer events were disabled for noninteractive status toasts and the complete quiz workflow passed on rerun. Production build passed. Reviewed community mobile/desktop, filters mobile, profile mobile/900/1440 screenshots; no profile overflow at 390/900 and existing responsive checks cover 320/390/900/1440. All populated screenshots use isolated fixtures. No real test emails sent.

## 27 November 2026 — temporary iLitterless logo throughout — PASS

Replaced shared mascot renderer and landing illustration with the existing iLitterless logo; this covers resident login/home/learning/community/profile/rewards and staff/BI dashboards. Logo uses an image element with intrinsic dimensions, contain sizing and descriptive alt text; no sprite crop or mascot motion. Original sheet retained but no active image/style references to it. Reviewed mobile community screenshot. Three focused browser tests passed, including all-role navigation, no sticker image elements, static logo with either motion preference, community responsiveness and landing/quiz/profile flow. Production build passed. No data or authentication changes.

## 27 November 2026 — supplied whale-only symbol — PASS

Used the exact attached symbol without raster editing, replacing wordmark-logo references across all app illustration/header slots and landing. Header symbol is 52×52 with contain sizing; larger placements retain intrinsic aspect ratio. Descriptive alt text preserved. Reviewed community mobile screenshot with the symbol against aqua. Three focused browser tests and production build passed. Existing full-logo and mascot source assets retained for later reuse; active presentation uses only the symbol.

## 27 November 2026 — remove home community ranking — PASS

Removed ranking section from Beranda at user request. Community ranking renderer, totals, and full Komunitas page retained. Focused browser test asserts ranking absent on home then verifies community scores and responsive full ranking. Test and production build passed. No data changes.

## 27 November 2026 — Super Admin, live statistics and approved activity photos — PASS

Created dedicated /super-admin/ entry and backend role-management endpoints. Super Admin is distinct from Petugas. Search is paged (20 accounts), role forms require one or more known roles, and history captures actor/target/time/before/after. Role operations revalidate actor privileges inside the serialized transaction and protect the last Super Admin under concurrent demotion. Verified public signup cannot obtain this role; forged headers and ordinary Warga/Petugas/BI requests are rejected; password/token hashes are absent from user-list responses. Active Warga context cannot call management endpoints. Role changes are read on subsequent requests with existing sessions. Search preserves typed input/caret and discards stale async responses.

At explicit user request, provisioned suryaindra019@gmail.com once as the initial local Super Admin, preserving the three prior roles and password hash (read-back compared against pre-grant SQLite backup). Only Super Admin displays Akses akun Anda; removed switching links from resident profile, staff/BI profile menus and public footer. Local API restarted; health 200, unauthenticated management endpoint 401, public overview 200. No automatic email-based privilege grant on registration/startup.

Landing counts still use actual database aggregates and now refresh every 30 seconds while visible and on focus/visibility return, with a real fetch timestamp. Errors retain an explicit last-success indication rather than faking zeros. At explicit publication request, approved action photos now display in recent activity cards, through a status-gated endpoint. Pending/denied photos stay inaccessible; public feed omits private paths, names, email and WhatsApp. Uploaded action photo UI notes approved photos can appear in recent activities. Cards without photos remain text-only. Feed remains capped at six latest entries; no load-more control was added in response to the user's explanatory 20-activity question.

Validation: 26 unit/API tests and 18 isolated PostgreSQL API tests passed, including immediate role changes, no hash leaks, concurrent last-admin protection and photo visibility. Fifteen browser cases passed across the full run plus focused rerun: fixed an old photo assertion to target article-proof rather than both proof and the newly introduced logo image. New browser flows cover Super Admin user search/grant/audit, Warga denial, Super-Admin-only switcher, viewport overflow 390/900/1440, actual-stat changes on refresh, and successfully loaded approved photos. Reviewed desktop/mobile Super Admin and activity-photo card screenshots; fixture photos are intentionally synthetic black test images. Production build passed. No real emails sent by verification. Supabase migration SQL now includes private/RLS Super Admin and role history tables; live configuration remains SQLite/local storage.
