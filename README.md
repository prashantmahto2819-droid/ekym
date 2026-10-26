# Ekatm Kalar Yuva Manch

Create a new project with Supabase enabled. PROJECT NAME:

CHAR AMETI FOUNDATION

Build PHASE 1 of a production-ready full-stack NGO website and NGO management foundation using:

React

TypeScript

Tailwind CSS

Supabase PostgreSQL

Supabase Authentication

Supabase Storage

Supabase Row Level Security

Supabase Edge Functions where required

IMPORTANT:

This is PHASE 1 of a larger two-phase application.

Do NOT attempt to build every advanced feature in Phase 1.

The architecture must, however, be designed so Phase 2 can be added without rebuilding the database or authentication system.

==================================================

BACKEND REQUIREMENT
==================================================

Use the CONNECTED SUPABASE PROJECT as the single source of truth.

Do not create mock backend data.

Do not use localStorage as the primary database.

Do not create fake JSON datasets for operational modules.

All major content must come from Supabase.

Use PostgreSQL relational tables.

Use UUID primary keys wherever appropriate.

Use created_at and updated_at timestamps.

Use created_by and updated_by wherever appropriate.

==================================================
2. AUTHENTICATION

Implement Supabase Authentication.

Initial authentication:

Email + Password

Create:

profiles
roles
user_roles

User profile fields:

id
full_name
email
mobile
whatsapp
photo_url
state
district
city
address
pincode
status
created_at
updated_at

Roles:

SUPER_ADMIN
ADMIN
CONTENT_MANAGER
STAFF
AUDITOR
USER

Prepare architecture for Phase 2 roles:

BLOOD_MANAGER
LIBRARY_MANAGER
VOLUNTEER_MANAGER
INTERNSHIP_MANAGER
HR_MANAGER
ACCOUNTANT
AMBULANCE_MANAGER
JOB_MANAGER
DONOR
VOLUNTEER
INTERN
STUDENT
JOB_SEEKER
EMPLOYER

Do not expose role-management controls to normal users.

==================================================
3. SECURITY

Implement Supabase RLS from the beginning.

Public users may only read content marked:

published = true
active = true

Authenticated users can access only their own profile.

Admin roles can manage content according to permissions.

SUPER_ADMIN has complete access.

Never expose Supabase service role key in frontend.

Never put private API credentials in client-side code.

==================================================
4. ORGANIZATION SETTINGS

Create organization_settings table.

Fields:

organization_name
tagline
logo
favicon
email
phone
whatsapp
address
state
district
city
pincode
website
instagram
facebook
youtube
linkedin
x
telegram
donation_text
about_short
footer_text

Admin can update all settings.

The website must read organization information dynamically from this table.

Do not hard-code organization information throughout the application.

==================================================
5. PUBLIC WEBSITE

Create responsive modern NGO website.

Pages:

/
/about
/seva
/seva/:slug
/blogs
/blogs/:slug
/news
/news/:slug
/campaigns
/gallery
/videos
/reels
/blood
/library
/volunteer
/internship
/donate
/contact
/privacy-policy
/terms
/refund-policy

Use mobile-first design.

==================================================
6. HOMEPAGE

Create dynamic homepage.

Sections:

Announcement bar

Main Hero Slider

Festival Wishes Slider

Seva Prakalp

Today's Service Activities

Blood Requirement

Bhojan Sewa

Daily Contributors Recognition

Daily Blogs

News Slider

Videos

Reels

Campaigns

Testimonials

Donation CTA

Volunteer CTA

Contact

Footer

Every major section must be database-driven.

Admin must be able to enable/disable sections.

Admin must be able to reorder homepage sections.

==================================================
7. MAIN HERO SLIDER

Create homepage_slides table.

Fields:

title
subtitle
description
image
button_text
button_url
display_order
active
start_date
end_date

Admin CRUD.

Support scheduled publishing.

==================================================
8. FESTIVAL SLIDER

Create festival_slides.

Fields:

festival_name
title
message
image
festival_date
active
display_order

Automatically show relevant festival content according to configured date.

Admin can manually enable/disable.

==================================================
9. 21 SEVA PRAKALP

Create seva_projects table.

Fields:

name
slug
short_description
description
featured_image
icon
location
state
city
coordinator
phone
active
display_order
seo_title
seo_description

Create admin CRUD.

Show current 21 seva projects.

Architecture must support more than 21 projects in future.

Each project gets a dedicated public page.

Project page:

overview

images

videos

daily activities

blogs

statistics

contribution CTA

==================================================
10. DAILY CONTRIBUTOR RECOGNITION

Create contributors/recognition table.

Fields:

name
photo
organization
contribution_type
description
location
recognition_message
contribution_date
display_publicly
active

Homepage should show public recognitions from the last 24 hours.

Older records remain available in admin history.

Do not delete historical records automatically.

==================================================
11. DAILY BLOG SYSTEM

Create blogs table.

Fields:

title
slug
excerpt
content
featured_image
author_id
seva_project_id
state
city
published_at
status
video_url
seo_title
seo_description
og_title
og_description
og_image

Statuses:

draft
review
published
archived

Admin/content manager can:

create
edit
preview
publish
schedule
archive

Blog page supports:

image gallery
video
related blogs
share buttons
WhatsApp
Facebook
LinkedIn
X
Telegram
copy link

==================================================
12. NEWS SYSTEM

Create news table.

Fields:

title
slug
thumbnail
description
source_name
external_url
published_at
status
display_homepage
seo_title
seo_description

Support:

internal news
external news links

Show thumbnail cards.

Homepage news slider.

==================================================
13. VIDEO AND REELS CMS

Create:

videos
reels

Admin can add:

title
thumbnail
platform
video_url
description
display_order
active

Supported platforms:

YouTube
Vimeo
Facebook
Instagram where technically embeddable

Do not scrape social platforms.

Allow these sections to be inserted into homepage and future pages.

==================================================
14. GALLERY

Create gallery system.

Tables:

galleries
gallery_items

Fields:

title
description
cover_image
category
date
location
active

Gallery item:

image
caption
display_order

Use Supabase Storage.

==================================================
15. TESTIMONIALS

Create testimonials.

Fields:

name
photo
city
role
message
active
approved
display_order

Only approved testimonials appear publicly.

==================================================
16. CONTACT SYSTEM

Create contact_messages.

Fields:

name
mobile
email
subject
message
state
city
status
created_at

Admin inbox.

Statuses:

new
contacted
resolved
closed

==================================================
17. BLOOD DONATION PHASE 1

Build the foundation of blood donor management.

Blood groups:

A+
A-
B+
B-
O+
O-
AB+
AB-
Bombay
Rare/Other

Blood components:

Whole Blood
RDP
SDP
Plasma
Other

Create blood_donors.

Fields:

user_id
donor_id
full_name
gender
date_of_birth
mobile
whatsapp
email
state
district
city
area
pincode
blood_group
preferred_component
last_donation_date
emergency_available
consent
status

Create public blood donor registration form.

Generate donor reference number.

Example:

CF-BD-2026-000001

Do not publicly expose donor personal data.

Create donor dashboard foundation.

Show:

blood group
last donation
registration status
profile

Prepare database fields for Phase 2 eligibility engine.

==================================================
18. BLOOD REQUIREMENT PHASE 1

Create blood_requirements.

Fields:

requirement_id
patient_name
hospital
hospital_contact
blood_group
component
units_required
state
district
city
required_date
urgency
requester_name
requester_mobile
requester_whatsapp
notes
verification_status
public_visibility
expires_at

Statuses:

pending
verified
active
fulfilled
expired
cancelled

Public blood requirement page.

Filters:

state
city
blood group
component
urgency

Show:

Call
WhatsApp
Donate Blood

Do not show unnecessary patient personal information publicly.

==================================================
19. LIBRARY PHASE 1

Build library foundation.

Create:

books
students
book_categories

Book fields:

book_id
isbn
title
subtitle
author
publisher
edition
language
category
subject
class_level
quantity
available_quantity
shelf
location
cover_image
status

Create public library page.

Search by:

title
author
category
subject
language
class
availability

Create student authentication architecture.

Prepare Phase 2 for:

book request
issue
return
student dashboard

==================================================
20. BOOK DONATION PHASE 1

Create book_donation_requests.

Fields:

request_id
donor_name
mobile
whatsapp
email
state
district
city
address
pincode
book_count
categories
condition
description
pickup_required
preferred_date
images
status

Statuses:

submitted
contacted
approved
pickup_scheduled
received
completed
rejected

Admin dashboard.

==================================================
21. MATERIAL / RATION DONATION

Create material_donation_requests.

Categories:

ration
rice
wheat
pulses
vegetables
clothes
education_material
medical_material
hygiene
other

Fields:

donor
mobile
whatsapp
email
state
district
city
address
material
quantity
unit
pickup_required
preferred_date
images
notes
status

==================================================
22. VOLUNTEER PHASE 1

Create volunteer registration foundation.

Fields:

application_id
name
photo
dob
gender
mobile
whatsapp
email
state
district
city
address
education
occupation
skills
areas_of_interest
availability
preferred_seva_projects
id_document
consent
status

Statuses:

submitted
under_review
approved
rejected

Create public registration page.

Create admin review screen.

Prepare architecture for Phase 2:

Razorpay payment
designation
volunteer login
ID card PDF
WhatsApp

==================================================
23. INTERNSHIP PHASE 1

Create:

internship_programs
intern_applications

Program:

name
department
description
duration
eligibility
seats
fee
start_date
end_date
active

Application:

name
photo
dob
mobile
whatsapp
email
state
district
city
college
course
year
skills
resume
preferred_department
duration
status

Create admin management.

Prepare Phase 2:

payment
approval
intern portal
attendance
certificate

==================================================
24. CAMPAIGN CMS

Create campaigns.

Fields:

title
slug
cover_image
description
target_amount
start_date
end_date
status
location
beneficiary
seo_title
seo_description

Create campaign public page.

Create donation CTA placeholder architecture.

Actual Razorpay integration will be implemented in Phase 2.

==================================================
25. SEO

Implement complete SEO foundation.

Every public page should support:

title
meta description
canonical
OG title
OG description
OG image
robots

Create dynamic sitemap.

Create robots.txt.

Create schema markup where appropriate:

Organization
Article
Event
BreadcrumbList

Blog pages must have Article schema.

==================================================
26. SOCIAL SHARING

Implement share buttons for:

Blog
News
Campaign
Seva project

Platforms:

WhatsApp
Facebook
LinkedIn
X
Telegram
Copy Link

Generate proper share URLs.

==================================================
27. ADMIN DASHBOARD

Create professional admin dashboard.

Cards:

Total Blogs
Published Blogs
Active Seva Projects
Blood Requirements
Blood Donors
Books
Book Donation Requests
Volunteer Applications
Intern Applications
Campaigns
Contact Messages

Recent activities.

Pending approvals.

Quick actions.

==================================================
28. ADMIN CMS

Admin menu:

Dashboard
Homepage
Seva Projects
Blogs
News
Festival Wishes
Sliders
Videos
Reels
Gallery
Testimonials
Blood
Library
Book Donations
Material Donations
Volunteers
Internships
Campaigns
Contact Messages
Media Library
SEO
Organization Settings
Users
Roles
Audit Logs

==================================================
29. MEDIA LIBRARY

Create central media management.

Features:

upload
preview
search
delete
alt text
caption
file type
file size

Use Supabase Storage.

Validate file type and file size.

==================================================
30. AUDIT LOG

Create audit_logs.

Track:

user
action
module
record_id
timestamp
old_data
new_data

Admin can view logs.

==================================================
31. DATABASE DESIGN

Create normalized tables with proper foreign keys.

Use indexes on:

slug
email
mobile
status
state
city
created_at
published_at

Avoid duplicated data.

Use database constraints where appropriate.

==================================================
32. RLS

Implement actual Supabase RLS policies.

Public:

published content only.

Authenticated users:

own profile.

Admins:

content management.

Content managers:

blogs
news
media
gallery
videos
reels

Blood managers should be prepared for Phase 2.

Never expose donor records publicly.

==================================================
33. ERROR HANDLING

Every form must have:

loading
validation
success
failure
retry

Display human-readable errors.

Do not expose technical errors or secrets.

==================================================
34. RESPONSIVE DESIGN

Must work properly on:

mobile
tablet
desktop

Test navigation and forms on mobile layouts.

Admin dashboard should also be responsive.

==================================================
35. PHASE 1 COMPLETION CHECK

Before declaring Phase 1 complete, verify:

Supabase connected
Auth working
Admin login working
RLS working
Homepage dynamic
Hero slider dynamic
Festival slider dynamic
21 seva projects dynamic
Blog CMS working
News working
Gallery working
Video/Reel CMS working
Testimonials working
Blood registration working
Blood requirement working
Library foundation working
Book donation working
Material donation working
Volunteer registration working
Internship registration working
Campaign CMS working
Media storage working
SEO working
Social sharing working
Audit logs working
Mobile responsive

Do not leave fake buttons.

Do not leave disconnected forms.

Do not use mock operational data.

At the end, show a concise list of:

database tables created

storage buckets created

RLS policies created

pages created

admin modules created

remaining Phase 2 dependencies

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://seva-heartbeat.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/05568b6b-0357-4c88-b2e5-d79f810b76bb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
