PRODUCT REQUIREMENTS DOCUMENT (PRD)
Product Name (Working Title)

BillMint (Temporary – can be changed)

1️⃣ Product Overview
1.1 Vision

To build a mobile-first, simple, and fast GST billing SaaS delivered as a Progressive Web App (PWA) for Indian retail businesses, starting with furniture stores and later expanding to hardware, electronics, and other retail sectors.

1.2 Mission

Enable small and medium retailers in India to:

Create GST-compliant invoices in under 60 seconds

Manage customers and products easily

Operate from mobile devices without complex software

Avoid expensive ERP systems

1.3 Product Type

Multi-tenant SaaS

Fully Web-based PWA

Subscription-based model

2️⃣ Target Users
Primary Users

Furniture store owners

Hardware shop owners

Electronics retailers

Small retail businesses in India

User Characteristics

Uses Android phone primarily

Basic technical knowledge

Wants simple system

Needs GST-compliant billing

Does not want complex accounting tools

3️⃣ Business Goals

Launch MVP within 4–6 weeks

Acquire first 50 paying customers

Keep infrastructure cost near zero

Achieve ₹3–5 lakh ARR within first year

4️⃣ Scope Definition
5️⃣ Core Features (MVP)
5.1 Authentication & Onboarding
Requirements

Email + Password Signup

Login

Forgot Password

Store setup during onboarding

Store Setup Fields

Store Name

Business Type (Furniture / Hardware / Electronics / Other)

GSTIN

State

Address

Phone Number

Acceptance Criteria

User cannot access dashboard without completing store setup

Each store has unique store_id

Data isolation enforced

5.2 Dashboard
Components

Total Sales (Today)

Total Sales (This Month)

Invoice Count

Quick Action Buttons:

Create Invoice

Add Product

Add Customer

UX Requirements

Mobile-first layout

Large tap-friendly buttons

Clean typography

Fast loading (<2 seconds)

5.3 Invoice Management
5.3.1 Create Invoice
Fields

Header:

Invoice Number (Auto Increment)

Date (Default Today)

Customer

Customer:

Name

Phone

GSTIN

Address

Items:

Product Name (Searchable)

HSN

Quantity

Rate

Tax %

Amount (Auto Calculated)

Additional:

Transportation Charges

Discount

Round Off (Auto Toggle)

Notes

Summary:

Subtotal

CGST / SGST or IGST (Auto Logic)

Total

Amount in Words (Auto Generated)

5.3.2 Tax Logic

If Store State = Customer State
→ CGST + SGST

If Different
→ IGST

Tax % pulled from Product settings.

5.3.3 Invoice Actions

Save Invoice

Edit Invoice

Duplicate Invoice

Delete Invoice

Download PDF

Share via WhatsApp

5.4 Product Management

Fields:

Product Name

Category

HSN Code

Selling Price

GST %

Unit (pcs, box, kg, etc.)

Stock (Optional Phase 2)

Requirements:

Searchable list

Quick add option inside invoice screen

Edit / Delete product

5.5 Customer Management

Fields:

Name

Phone

GSTIN

Address

Requirements:

Search

Edit

Delete

View invoice history

5.6 PDF Generation

Requirements:

Clean GST invoice template

Store branding (logo optional)

GSTIN display

Proper tax breakdown

Amount in words

Signature section

PDF must:

Download in A4 format

Be shareable via WhatsApp

6️⃣ SaaS Requirements
6.1 Multi-Tenant Architecture

All tables must include:

store_id

Users can only access their own store’s data.

6.2 Subscription Model
Plans

Free:

20 invoices/month

Basic:

Unlimited invoices

Pro:

Reports + Staff roles

6.3 Subscription Logic

Track monthly invoice count

Block invoice creation after limit (Free plan)

Show upgrade prompt

7️⃣ PWA Requirements
7.1 Installable App

manifest.json

App icons (192px, 512px)

display: standalone

Theme color

7.2 Offline Support (Phase 2)

Cache static assets

Allow invoice creation offline

Sync when internet available

7.3 Performance

First load < 3 seconds

Navigation instant

Optimized bundle size

8️⃣ UX Requirements
8.1 Mobile-First Design

Bottom navigation bar

Sticky summary bar in invoice screen

Large input fields

Minimal typing required

8.2 Smart Input Behavior
Field	Behavior
Date	Default today + native calendar
Phone	Numeric keyboard
Qty	Numeric
Rate	Decimal numeric
GSTIN	Auto uppercase
Text	QWERTY
Invoice No	Auto increment
Amount	Real-time auto calculation
8.3 Invoice Speed Requirement

User must be able to:

Create and save invoice in under 60 seconds.

9️⃣ Non-Functional Requirements
9.1 Security

JWT Authentication

Row Level Security

HTTPS only

Secure API routes

9.2 Scalability

Support 1,000+ stores

Database optimized with indexing

Pagination for lists

9.3 Reliability

99% uptime

Auto backup (Supabase)

1️⃣0️⃣ Technical Stack

Frontend:

Next.js (App Router)

Tailwind CSS

ShadCN UI

Backend:

Supabase (Auth + PostgreSQL)

Hosting:

Vercel

Payments:

Razorpay

PDF:

React PDF or jsPDF

1️⃣1️⃣ Data Model Overview

Stores
Users
Products
Categories
Customers
Invoices
InvoiceItems
Subscriptions

All linked via store_id.

1️⃣2️⃣ Future Features (Phase 2+)

Inventory tracking

Payment status (Paid / Unpaid)

Reports dashboard

Staff roles

GST return summary

Industry-specific templates

Offline-first sync

Barcode scanning

Serial number tracking (Electronics)

1️⃣3️⃣ Success Metrics

Time to create invoice

Monthly active stores

Conversion rate from Free → Paid

Churn rate

Average invoices per store

1️⃣4️⃣ Risks
Risk	Mitigation
Too many features	Strict MVP control
Complex UX	Keep minimal screens
Low adoption	Niche targeting first
Free users overload	Usage limit enforcement
1️⃣5️⃣ MVP Timeline

Week 1:

Project setup

Auth + DB structure

Week 2:

Product & Customer modules

Week 3:

Invoice creation logic

Week 4:

PDF + PWA setup

Week 5:

Testing + deployment