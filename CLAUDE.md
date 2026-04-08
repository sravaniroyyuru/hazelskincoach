# Hazel — Claude Project Context

## What is Hazel?

Hazel is an AI receptionist and clinical assistant for private skin clinics, dermatology practices, and medspas in the UK. It automates patient-facing and back-office workflows for premium private clinics.

The name references witch hazel — the plant-based skin remedy. Brand identity: **"Aesop meets Harley Street."** Botanical, warm, premium.

---

## Founder Context

- **Founder:** Sravani — non-technical, building with no-code/low-code tools
- **Personal story:** Former patient who found private dermatology transformative after struggling with NHS access
- This narrative is central to any pitch, copy, or outreach — lead with it where relevant

---

## Product Layers (priority order)

### 1. Front-of-house AI receptionist ← lead product
- Handles patient enquiries 24/7
- Qualifies skin concerns
- Matches insurance
- Books appointments automatically
- **Framing: revenue generation (filling slots), not cost saving**

### 2. Patient intake layer
- Captures skin routines, symptoms, history pre-appointment
- Delivered via clinic-mandated forms

### 3. Clinical scribe
- Transcribes voice recordings into structured UK dermatology notes
- Generates GP referral letters

---

## Target Market

- Private dermatology clinics and medspas in the UK
- **NOT NHS. NOT US market (for now)**
- Premium end of the market only

---

## Competitive Landscape

- **Linda AI** is the key reference — dental AI receptionist, raised €2.6M, 50+ UK/Irish dental sites
- Used as proof the vertical-specific AI receptionist model works in adjacent healthcare
- Private dermatology is the uncrowded equivalent
- No direct competitor has Hazel's combination: premium private derm + UK focus + high-end brand

---

## Tech Stack

- **Framework:** Next.js 14 (App Router, TypeScript)
- **Database + Auth:** Supabase (RLS enabled, clinic-isolated)
- **Voice agents:** VAPI
- **SMS:** Twilio
- **Styling:** Tailwind CSS
- **Hosting:** Vercel
- **Pitch deck:** Lovable
- **Outreach research:** Tasklet
- **Preference:** No-code/low-code approaches where possible — avoid over-engineering

---

## Key Directories

```
app/(auth)/          ← login, register
app/(dashboard)/     ← all protected clinic-staff views
app/api/vapi/        ← VAPI webhook handlers
app/api/twilio/      ← Twilio webhook handlers
lib/supabase/        ← browser, server, and middleware clients
lib/vapi/            ← VAPI REST wrapper
lib/twilio/          ← Twilio SMS + signature validation
types/index.ts       ← all shared TypeScript types
supabase/migrations/ ← SQL migrations
```

---

## Database Schema

Five core tables, all RLS-enabled with clinic isolation via `auth_clinic_id()`:

- `clinics` — one row per clinic, holds VAPI assistant ID + Twilio number
- `clinic_users` — links auth users to a clinic (role: admin)
- `patients` — GDPR consent field required (UK law)
- `appointments` — status: scheduled / confirmed / cancelled / completed / no_show
- `call_logs` — VAPI call records with transcript + summary
- `sms_logs` — Twilio inbound/outbound message records

---

## Strategic Principles

- Front-of-house before clinical documentation
- Revenue framing beats cost-saving framing with clinic owners
- UK private pay market first
- Validate demand → build demo → get traction → approach investors
- **Investor to approach: Reece Chowdhury (Concept Ventures) — only after demo + early traction**

---

## Fellowships Being Applied To

- EWOR Ideation Fellowship
- Entrepreneurs First
- YC: hold for now

---

## Tone & Voice

For any copy, pitch, outreach, or UI:

- Premium and warm — not clinical, not corporate, not techy
- Botanical undertones — reference witch hazel origin where relevant
- Confident but not flashy
- Written for busy clinic owners, not tech audiences

---

## Key Assets Already Built

- Pitch deck (8 slides, botanical branding)
- Discovery call script (6 questions)
- Outreach list: 10 dermatology clinics + 10 medspas with contacts
- 20 personalised outreach emails
- Confirmed direct emails for 6 clinics
- Daily checklist for week 1 execution

---

## Things to Avoid

- Don't suggest NHS or US market pivots
- Don't push toward "OS/platform" framing — Hazel is a focused vertical product
- Don't recommend approaching Reece before there's a demo and traction
- Don't default to technical solutions when no-code options exist
- Don't add features, abstractions, or complexity beyond what's asked
