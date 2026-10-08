# FITGREEN Growth System

A full-stack gym CRM and growth platform built for FITGREEN, a strength & conditioning club.

FITGREEN connects the public marketing website with an internal CRM to manage the complete customer journey:

```text
Lead → CRM → Follow-up → Trial → Attendance → Membership → Revenue → Analytics
```

## 🚀 Overview

FITGREEN is designed to bring lead generation and gym operations into one system.

The platform includes a public-facing website for capturing potential customers and an admin application for managing leads, follow-ups, appointments, members, campaigns, tasks, notifications, and business analytics.

The project focuses on building practical software around real-world business workflows rather than a simple CRUD application.

## ✨ Core Features

### Public Website

- Gym landing page
- Programs
- Trainers
- Memberships
- Testimonials
- Contact page
- Lead/signup form
- Responsive customer-facing experience

### CRM & Sales

- Lead management
- Lead details
- Sales pipeline
- Follow-up management
- Appointment tracking
- Lead scoring
- Trial and conversion workflows

### Gym Management

- Member management
- Team management
- Tasks
- Notifications
- Campaign management
- Operational workflows

### Analytics

- Dashboard
- Sales pipeline visibility
- Conversion-oriented metrics
- Campaign analytics
- Revenue reporting
- Charts and business insights

### Demo Roles

The admin interface includes a role switcher for:

- Owner
- Sales Manager
- Sales Executive

The role switcher changes visibility within the demo without mutating the underlying dataset.

## 🧠 System Flow

The application is designed around the complete gym growth workflow:

```text
Public Website
      ↓
Lead Capture
      ↓
Lead Management
      ↓
Follow-up
      ↓
Trial / Appointment
      ↓
Attendance
      ↓
Membership
      ↓
Revenue
      ↓
Analytics
```

This structure allows the application to represent both customer-facing interactions and internal business operations.

## 🛠️ Tech Stack

### Frontend

- React 18
- TypeScript
- Vite
- Tailwind CSS v4
- React Router

### UI & Visualization

- Recharts
- lucide-react

### Forms & Validation

- Zod
- react-hook-form

### Data & Storage

- LocalStorage
- Optional Supabase / PostgreSQL integration

### Development & Testing

- Vitest
- oxlint

## 💻 What I Built

The project was built as a practical full-stack business application rather than a static interface.

Key areas include:

- Public and admin application flows
- CRM-style lead and pipeline management
- Gym member and appointment workflows
- Business dashboards and analytics
- Reusable UI components
- Seeded demo data
- Local persistence
- Optional Supabase integration
- Role-based demo visibility
- Workflow and metric services
- Responsive web interfaces

## 🏗️ Project Structure

```text
src/
├── components/
│   ├── admin/
│   │   └── charts/
│   ├── layout/
│   └── ui/
│
├── constants/
│
├── context/
│   └── AppContext.tsx
│
├── lib/
│   ├── seed
│   ├── storage
│   ├── data services
│   └── Supabase integration
│
├── pages/
│   ├── public/
│   └── admin/
│
├── services/
│   ├── metrics
│   ├── lead scoring
│   ├── notifications
│   └── business workflows
│
└── types/
    └── index.ts
```

The shared data model is maintained through:

```text
src/types/index.ts
```

## 📊 Data & Architecture

LocalStorage is the default storage layer, allowing the application to run without external configuration.

The application starts with a deterministic seeded dataset so the different CRM and analytics screens can be explored immediately.

### Supabase

The project also includes an optional Supabase/PostgreSQL setup.

To use Supabase:

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Copy `.env.example` to `.env`.
3. Configure the required environment variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The project uses the Supabase anon key on the client. The included RLS configuration is intended for the seeded demo environment and should be tightened before using real member/customer data in production.

## 🧪 Testing

The project includes a Vitest test suite.

Run:

```bash
npm test
```

For continuous development:

```bash
npm run test:watch
```

## ⚙️ Getting Started

Clone the repository:

```bash
git clone https://github.com/dharaneswarsai/fitgreen.git
cd fitgreen
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite.

### Main Routes

#### Public

```text
/
 /programs
 /trainers
 /memberships
 /testimonials
 /contact
 /join
```

#### Admin

```text
/admin
/admin/leads
/admin/pipeline
/admin/follow-ups
/admin/appointments
/admin/members
/admin/campaigns
/admin/analytics
/admin/team
/admin/notifications
/admin/settings
```

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Type-check and create production build |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | Run TypeScript checking |
| `npm run lint` | Run oxlint |
| `npm test` | Run Vitest tests |
| `npm run test:watch` | Run Vitest in watch mode |

## 🔄 Demo Data

The application starts with seeded demo data.

From the admin settings, demo data can be reset to the initial state.

This makes the project easy to evaluate without requiring an external database.

## 🚀 Deployment

The repository includes a `vercel.json` configuration for SPA routing.

Build the application:

```bash
npm run build
```

The production output is generated in:

```text
dist/
```

The application can be deployed to Vercel or another static hosting provider that supports SPA rewrites.

## 🎯 Project Focus

FITGREEN was built to explore how software can support a real business workflow from the first customer interaction through sales and ongoing operations.

The main focus areas were:

- Full-stack web development
- Business workflow design
- CRM systems
- Data management
- Dashboard development
- Responsive interfaces
- Practical software architecture

## 🔮 Future Improvements

Potential future improvements include:

- Authentication and authorization
- Production-grade database security
- More granular user permissions
- Real-time notifications
- WhatsApp/email integrations
- Advanced reporting
- Production analytics
- Automated deployment and monitoring

---

Built as a practical full-stack software project by **Nagineni Dharaneswar Sai Chowdary**.
