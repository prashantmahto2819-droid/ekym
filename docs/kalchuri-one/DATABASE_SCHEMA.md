# Database Schema — Kalchuri One (प्रस्तावित)

नियम:
- हर org-level टेबल में `organization_id uuid not null references core.organizations`, `created_at`, `updated_at`, `created_by`।
- पैसे `numeric(14,2)` में, फ़ोन `91XXXXXXXXXX` में (shokpatra नियम)।
- किसी मौजूदा टेबल को drop या rename नहीं किया जाएगा। मौजूदा टेबलों में सिर्फ़ nullable column जोड़े जाएँगे, फिर backfill होगा, फिर `NOT NULL` लगेगा।

## core — संगठन और पहचान
| टेबल | मुख्य कॉलम |
|---|---|
| `organizations` | id, slug (unique), name, name_hi, kind (samaj, foundation, trust, committee, association, business), level (national, state, district, tehsil, city, local), parent_id, state, district, tehsil, city, social_region_id → public.social_regions, status (pending, active, suspended), branding jsonb (logo, colors, fonts), registration jsonb (reg no, 12A/80G, PAN), share_with_parent bool |
| `org_tree` | ancestor_id, descendant_id, depth (trigger से बनता है) |
| `org_domains` | organization_id, hostname unique, kind (subdomain, custom), verified_at, cf_hostname_id |
| `people` | **कोई नई टेबल नहीं**: `public.profiles` (shokpatra) ही व्यक्ति का मुख्य रिकॉर्ड रहेगा; `site_profiles` के अतिरिक्त fields (whatsapp, photo_url, pincode…) `profiles` में जोड़कर merge होंगे |
| `memberships` | organization_id, user_id, member_no (series), category (साधारण, आजीवन, संरक्षक…), status (applied, active, lapsed, expelled), valid_from, valid_to, verified_by, card_document_id |
| `permissions` | key (जैसे `cms.post.publish`, `fin.voucher.approve`), module, label_hi |
| `roles` | organization_id (null = system template), key, name, permissions text[] |
| `role_assignments` | organization_id, user_id, role_id, department_id null, valid_from, valid_to |
| `departments` | organization_id, name, parent_id |
| `platform_admins` | user_id, level (super, support) |
| `audit_log` | organization_id, actor_id, table_name, row_id, action, old jsonb, new jsonb, at |

Helper functions: `core.can(org, perm) → bool`, `core.my_orgs()`, `core.is_platform_admin()`, `core.org_ancestors(org)`।

## gov — संगठन संचालन
`committees` (org, name, kind executive|advisory|…, tenure_from, tenure_to, status) · `committee_positions` (committee, user_id null, person_name, designation, rank, appointed_by election|nomination, from, to) · `meetings` (org, committee, title, at, venue, online_link, status) · `agenda_items` · `minutes` (meeting, body json, approved_at, document_id) · `resolutions` (org, meeting, number, text, proposer, seconder, result, votes jsonb) · `tasks` (org, title, assignee, due, status, source meeting/resolution) · `announcements` (org, audience, body, publish_at) · `elections` (org, post, nomination window, voting window, status) · `candidates` · `voter_tokens` (election, user, used_at) · `ballots` (election, choice, **user से जुड़ा नहीं** → गुप्त मतदान)

## cms — वेबसाइट और प्रकाशन सामग्री
`sites` (org, theme jsonb, header/footer config, seo defaults, adsense_enabled) · `pages` (org, slug, title, blocks jsonb, status draft|scheduled|published, publish_at, seo jsonb, is_home) · `page_revisions` (page, blocks, by, at) · `menus` (org, location header|footer, items jsonb) · `categories` (org null = global, kind blog|news, name, slug, parent_id) · `posts` (org, kind blog|news|press|activity, title, slug, excerpt, body json (TipTap), cover, author_id, category_id, tags text[], status draft|submitted|changes_requested|approved|published|archived, publish_at, featured, breaking, region, central_status none|nominated|approved, seo jsonb, views) · `post_reviews` (post, reviewer, decision, note) · `comments` (post, user, body, status pending|approved|spam) · `media` (org, path, kind, alt, size) · `galleries`/`gallery_items` · `videos` · `seva_projects` (ekym से)

## pub — पत्रिका
`publications` (org, title, frequency monthly|quarterly|annual|special, access public|members) · `issues` (publication, number, title, date, cover_document_id, pdf_path, status, views) · `issue_pages` (issue, page_no, image_path, width, height) · `issue_articles` (issue, post_id, page_from)

## docs — Design Engine और पत्र-व्यवहार
| टेबल | मुख्य कॉलम |
|---|---|
| `templates` | organization_id null = साझा, kind (letterhead, letter, notice, certificate, invitation, receipt, voucher, id_card, poster, shok_patra, magazine_cover…), name, design jsonb (Design Engine document), page_size, is_default, status |
| `number_series` | org, kind, fy, prefix, next_no, pattern (`EKYM/पत्र/2026-27/0001`) — unique, गैप-रहित |
| `documents` | org, kind, template_id, letterhead_id, ref_no, date, subject, recipient jsonb, body json, fields jsonb, signatories jsonb, status draft|pending_approval|approved|issued|cancelled, approved_by, issued_at, pdf_path, verify_code, source (meeting, voucher, event…) |
| `document_attachments` | document, path, name |
| `dispatches` | document, channel whatsapp|email|hand|post|courier, to, at, status, message_id |
| `register_entries` | org, direction inward|outward, ref_no, date, from_to, subject, document_id, file_path |

शोकपत्र की `letter_designs` → `docs.templates` (kind `shok_patra`) में **copy** होंगी। मूल टेबल वैसे ही रहेगी।

## fin — हिसाब-किताब (double entry)
`financial_years` (org, label 2026-27, from, to, locked) · `accounts` (org, code, name, type asset|liability|income|expense|equity, parent_id, is_bank, is_cash) · `parties` (org, name, phone, pan, gstin, address, kind donor|member|vendor|sponsor) · `vouchers` (org, fy, type receipt|payment|journal|contra|sales|purchase|refund, number (series), date, party_id, mode cash|upi|bank|cheque|online, instrument jsonb, narration, status draft|posted|cancelled, document_id, source donation|membership|event|ad, cancelled_reason, reversal_of) · `voucher_lines` (voucher, account, debit, credit) — post करते समय trigger: debit का जोड़ = credit का जोड़, और locked FY में बदलाव नहीं · `bills` (org, kind sales|purchase, party, items jsonb, tax jsonb, total, voucher_id)

मौजूदा `public.donations` + `donation_receipts`: payment PAID होते ही `fin.post_receipt()` receipt voucher बनाएगा।

## events
`events` (org, title, kind, starts_at, ends_at, venue, map_url, organizer, registration_open, capacity) · `invitations` (event, document_id/template) · `guests` (event, name, phone, group, invited_via, rsvp yes|no|maybe, rsvp_at, checkin_at, qr_code)

## comms — संवाद
`channels` (org, provider vivid_relay|meta_cloud|smtp, display, config jsonb, secret_ref (Vault), status, daily_limit) · `templates` (org, channel, name, category utility|marketing|authentication, language, body, variables, meta_status) · `consents` (org, phone/email, user_id, purpose, given_at, source, withdrawn_at) · `campaigns` (org, purpose, audience query jsonb, template, schedule_at, status) · `messages` (org, campaign, channel, to, payload jsonb, status queued|sending|sent|delivered|read|failed, attempts, next_attempt_at, provider_id, cost, error) · `opt_outs`

## community
`blood_*` (मौजूदा + org_id) · `matrimony_profiles` (user_id, created_for self|child|sibling, age (≥ कानूनी उम्र, check), gotra, education, profession, family_id → वंश, visibility, verified_at, status) · `matrimony_interests` (from, to, status) — संपर्क तभी दिखे जब दोनों तरफ़ से सहमति हो · `businesses` (org null, owner, name, category, address, geo, phone, featured_until) · `jobs`, `scholarships`, `applications` · library/volunteer/intern (मौजूदा + org_id)

## ads
`slots` (key homepage_banner, article_inline…) · `org_ad_settings` (org, adsense_client, slots enabled, blocked_categories (सिर्फ़ Google जितने controls देता है)) · `campaigns` (org null, sponsor party, slots, region, from, to, creative, amount, status) · `daily_stats` (campaign, date, impressions, clicks) · `revenue_entries` (source adsense|sponsor, period, amount, **is_estimate bool**)

## family / shok (मौजूदा `public` टेबल, बिना बदलाव)
`profiles, villages, families, members, family_links, member_suggestions, social_regions, region_categories, origin_villages, origin_requests, admin_villages, admin_regions, same_person_requests, letters, letter_recipients, letter_designs, app_settings`

सिर्फ़ जोड़ने वाले बदलाव:
- `families.organization_id` (nullable; कौन-से संगठन ने जोड़ा/संभालता है)
- `letters.organization_id` (nullable; किस संगठन की ओर से शोक संदेश गया)
- `core.organizations.social_region_id`, ताकि क्षेत्रीय संगठन अपने क्षेत्र के परिवार देख सकें (shokpatra के region-admin नियम जैसा)

## मौजूदा ekym वेबसाइट टेबल → multi-org
`organization_settings, homepage_*, festival_slides, seva_projects, contributors, blogs, news, videos, reels, galleries, gallery_items, testimonials, contact_messages, campaigns, media_library, blood_*, books, book_categories, students, *_donation_requests, volunteer_applications, internship_programs, intern_applications, donations, donation_receipts, payment_*`
1. हर टेबल में `organization_id uuid` (nullable) जोड़ना।
2. EKYM संगठन बनाकर सभी पंक्तियाँ उससे जोड़ना।
3. `NOT NULL` लगाना, unique keys को `(organization_id, slug)` बनाना, RLS में `core.can()` जोड़ना।
4. blogs/news, `cms.posts` में Phase 7 पर migrate होंगे (copy, फिर पुराना read-only view)।
