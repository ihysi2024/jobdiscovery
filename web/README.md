# aligned: web app

Next.js app built from the design mockup. Every screen from the mockup is here,
with the same layout and behavior; the job screens read from a data source
that is either built-in sample data or the jobs database.

```bash
cd web
npm install
cp .env.example .env.local   # then fill in the publishable key
npm run dev                  # http://localhost:3000
```

## Data

`NEXT_PUBLIC_DATA_SOURCE` picks where jobs come from:

* `sample` (default): the mockup's demo jobs. Works with no setup.
* `supabase`: the real jobs. Reads the `job_listings` view the poller creates
  (open NYC jobs plus their classification), using the publishable key. The
  raw tables are locked to the app; only that view is readable.

The screens never talk to a database directly. They get data from
`src/lib/data` (`listJobs`, `getJob`, `getCompany`), which both sources implement
with the types in `src/lib/types.ts`.

| Route | Screen | Data |
|---|---|---|
| `/onboarding` … `/onboarding/plan` | Six onboarding steps | Mockup content; answers not saved yet |
| `/matching` | Loading screen | Mockup |
| `/jobs` | Job list, filters, search, sort | **Data source**; filters built from the jobs |
| `/jobs/[id]` | Job detail | **Data source**; sections hide when data is missing |
| `/companies/[id]` | Company | Open roles from the **data source**; full dashboard only in sample mode |
| `/my-jobs` | Tracker | Mockup |
| `/profile` | Profile and plan | Mockup |
| `/email-preview` | Daily to-do email | Mockup |

Liked jobs are saved in the browser (`src/lib/user-store.js`) until sign-in exists.

## Not built yet

* **Sign-in and saved answers.** `supabase/migrations/0001_user_data.sql` has
  the per-user tables (profile, onboarding answers, feedback, tracker, plan),
  each private to its owner. Run it in the Supabase SQL editor when adding auth.
* **Matching.** The list is newest first; "why you might be interested" shows
  the job's one-line summary until ranking against a profile exists.
* **Contacts and company data** (headcount, funding, tenure). Those sections
  hide when there's no data.

## How the screens were made

`src/screens/*.jsx` were generated from the mockup's `.dc.html` files (each is
a small component class plus a template, which maps one-to-one onto a React
class component). They've since been edited to take data from props, so edit
them directly now rather than regenerating.

## Sign-in

Google sign-in through Supabase Auth. `/` is the landing page; every other
page needs a signed-in user (`src/proxy.ts` redirects to `/` and back after
sign-in). Google sends people to `/auth/callback`, which swaps the one-time
code for a session cookie. Without the Supabase env vars (sample mode) the app
runs signed out and nothing is protected.
