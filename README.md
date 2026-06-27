# Private Personal Finance Control Dashboard

A private, mobile-first personal finance web app for tracking real available money after unpaid obligations, reserved budgets, credit card payable, planned debt payments, and monthly sinking fund reserves.

This repository is in **Phase 4: GitHub + Vercel Deployment Preparation**. Phase 3 was locally verified and approved after `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build` passed in Windows PowerShell. Phase 4 prepares the project for safe GitHub upload and Vercel deployment. Do not add new finance features in this phase.

## 1. What Phase 3 Includes

- Private Supabase email/password login
- Login-required dashboard routes
- Supabase browser, server, and middleware clients using environment variables
- SQL migration for profiles, accounts, transactions, categories, budgets, subscriptions, annual expenses, debts, debt payments, credit cards, card transactions, credit card statements, card payments, and app settings
- Row Level Security on every user-owned table
- Policies that restrict user-owned rows to `user_id = auth.uid()`
- Finance calculation unit tests with Vitest
- Local setup instructions for Windows development


Phase 3 dashboard data flow:

1. The private dashboard route checks the authenticated Supabase session through the protected app layout.
2. `src/app/(private)/dashboard/page.tsx` creates a server Supabase client.
3. `loadDashboardRows` reads user-owned rows from Supabase tables. RLS ensures only the logged-in user can read their own records.
4. `mapDashboardRowsToInput` converts Supabase rows into the tested `DashboardInput` shape.
5. `calculateDashboardSnapshot` calculates real available money using the same tested finance logic.
6. `DashboardShell` renders live Supabase data, or a clearly labeled demo/empty/error state when real data is not available.

The dashboard shows real values after these records exist in Supabase:

- At least one active account, especially cash-like accounts: main bank, other bank, cash, or wallet.
- Transactions for income, expenses, transfers, investment transfers, debt payments, card payments, and sinking fund reserves.
- Budgets for the active 25th-to-24th cycle.
- Active monthly subscriptions for unpaid obligations.
- Active yearly subscriptions and annual expenses for sinking fund reserves.
- Active debts with monthly payment and remaining balance.
- Credit cards, credit card statements, and card transactions for current spending and remaining payable.

If no Supabase finance records exist yet, the dashboard shows a clear demo label instead of pretending sample numbers are private live data.

The app is designed to answer one question:

> How much money can I safely use right now?

Core finance rules covered by automated tests:

- Financial cycle runs from the 25th to the 24th.
- Salary may be paid early before a weekend, but still belongs to the cycle starting on the 25th.
- Real available money uses only cash-like accounts: main bank, other bank, cash, and wallet.
- Investment accounts are excluded from real available money.
- Paid expenses and paid obligations are not subtracted again.
- Unpaid obligations reduce real available money.
- Credit card expenses increase card liability first and reduce cash only when paid.
- Investment transfers are tracked separately from normal expenses.
- Monthly sinking fund reserves reduce real available money only as reserves.

## 2. Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- Vitest
- PWA manifest and service worker foundation

## 3. Required Installs

Install these on your Windows computer if you do not already have them:

1. Node.js LTS from https://nodejs.org
2. Visual Studio Code from https://code.visualstudio.com
3. A Supabase account from https://supabase.com

After installing Node.js, close and reopen PowerShell.

Check Node.js and npm:

```powershell
node --version
npm --version
```

If both commands show version numbers, the local JavaScript tooling is ready.

## 4. Install Project Dependencies

Open PowerShell and go to this project folder:

```powershell
cd "D:\AI project\My_budget_project"
```

Install packages:

```powershell
npm install
```

This creates the `node_modules` folder. That folder is normal and should not be uploaded to GitHub later.

## 5. Create a Supabase Project

This part must be done manually in the Supabase website because Codex cannot create a Supabase project inside your account.

1. Go to https://supabase.com and log in.
2. Click **New project**.
3. Choose your organization.
4. Enter a project name, for example `personal-finance-local`.
5. Create a strong database password and save it somewhere safe.
6. Choose a nearby region.
7. Click **Create new project**.
8. Wait until Supabase finishes creating the project.

## 6. Keep Signup Private

The app code has no signup page, but Supabase email signup should also be disabled or controlled in the Supabase dashboard.

1. Open your Supabase project.
2. In the left sidebar, click **Authentication**.
3. Click **Providers**.
4. Click **Email**.
5. Keep Email provider enabled.
6. Turn off public/self signup if your Supabase dashboard shows that option.
7. Save changes.

If your Supabase dashboard does not show a direct signup toggle, keep this app login-only and create users manually in Supabase.

## 7. Create Your First Private User

1. In Supabase, open your project.
2. Click **Authentication** in the left sidebar.
3. Click **Users**.
4. Click **Add user**.
5. Choose **Create new user**.
6. Enter your email address.
7. Enter a password.
8. Confirm the user if Supabase gives you that option.
9. Click **Create user**.

You will use this email and password to log in locally.

## 8. Find Supabase Project URL and Anon Key

1. In Supabase, open your project.
2. Click **Project Settings** in the left sidebar.
3. Click **API**.
4. Find **Project URL**.
5. Find the **anon public** key.

Use only the Project URL and anon public key in this app. Do not paste the service role key into this project.

## 9. Create .env.local

In PowerShell, from the project folder:

```powershell
copy .env.example .env.local
```

Open `.env.local` in VS Code and paste your own Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_APP_DEFAULT_LOCALE=th
```

Do not commit real secrets or real project keys to GitHub later.

## 10. Run the SQL Migration

Phase 2 has one migration file:

```text
supabase/migrations/001_initial_schema.sql
```

Beginner-friendly SQL Editor method:

1. Open your Supabase project.
2. In the left sidebar, click **SQL Editor**.
3. Click **New query**.
4. Open this local file in VS Code:

```text
D:\AI project\My_budget_project\supabase\migrations\001_initial_schema.sql
```

5. Copy all SQL from the file.
6. Paste it into the Supabase SQL Editor.
7. Click **Run**.
8. Wait for the query to finish.

The migration creates the database tables, transaction type enum, foreign keys, indexes, RLS policies, and automatic profile/app settings rows for newly created users.

Run this SQL once in a fresh Supabase project. If you already ran an older version of this migration in the same Supabase project, create a new fresh Supabase project for now or ask Codex to create a safe upgrade migration.

## 11. Run the App Locally

In PowerShell:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

When it starts, open:

```text
http://localhost:3000
```

You should be redirected to the private dashboard if logged in, or to the login page if not logged in.

## 12. Test Login and Private Access

This is a manual browser check because it uses your real Supabase project and user account.

1. Start the app with `npm run dev`.
2. Open http://localhost:3000.
3. Confirm you see the login page.
4. Enter the email and password of the Supabase user you created manually.
5. Click **Login**.
6. Confirm you land on the dashboard.
7. Click **Logout**.
8. Try opening http://localhost:3000/dashboard again.
9. Confirm you are sent back to the login page.

No financial dashboard route should be visible without login.

## 13. Automated Tests

Codex must run automated checks itself for code logic, finance calculations, typecheck, lint, build, and unit tests whenever it changes the project.

Run finance and unit tests:

```powershell
npm test
```

Other automated checks:

```powershell
npm run typecheck
npm run lint
npm run build
```

Manual testing is only for final visual checking, real Supabase dashboard settings, copying environment variables, or testing on your actual Android phone. Manual testing should not be used as the core check for finance calculation correctness.

## 14. Common Setup Errors and Fixes

### Missing Supabase environment variables

Fix:

1. Make sure `.env.local` exists.
2. Make sure it contains `NEXT_PUBLIC_SUPABASE_URL`.
3. Make sure it contains `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Stop the dev server with **Ctrl + C**.
5. Start it again with `npm run dev`.

### Invalid login credentials

Fix:

1. Go to Supabase **Authentication > Users**.
2. Confirm your user exists.
3. If needed, create a new user manually.
4. Try logging in again with that email and password.

### Relation does not exist

This means the SQL migration has not been run yet.

Fix:

1. Go to Supabase **SQL Editor**.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. Refresh the app.

### Something already exists when running SQL

This usually means the SQL was already run in that Supabase project.

For the local-first Phase 2 setup, the simplest beginner-friendly fix is to create a fresh Supabase project and run the migration once. If you need to preserve existing data, ask Codex to create a careful upgrade migration instead.

### PowerShell says npm is not recognized

Fix:

1. Install Node.js LTS from https://nodejs.org.
2. Close PowerShell.
3. Open PowerShell again.
4. Run `node --version` and `npm --version`.

### Port 3000 is already in use

Run the app on another port:

```powershell
npm run dev -- -p 3001
```

Then open:

```text
http://localhost:3001
```

## 15. Phase 2 Status

Phase 2 is approved and verified locally.

You confirmed these commands passed in Windows PowerShell:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

## 16. Phase 3 Files Created or Modified

Important Phase 3 files include:

- Supabase dashboard data loader and mapper: `src/lib/finance/dashboard-data.ts`
- Dashboard route connected to Supabase data: `src/app/(private)/dashboard/page.tsx`
- Dashboard UI states for live/demo/empty/error data: `src/components/dashboard/dashboard-shell.tsx`
- Route loading state: `src/app/(private)/dashboard/loading.tsx`
- Finance and Supabase mapping tests: `src/lib/finance/dashboard.test.ts`
- Documentation: `README.md`

Phase 3 also continues to use these Phase 2 foundations:

- Supabase migration draft: `supabase/migrations/001_initial_schema.sql`
- Supabase client and auth helpers: `src/lib/supabase/browser.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`, `middleware.ts`
- Finance logic: `src/lib/finance/dashboard.ts`, `src/lib/finance/cycle.ts`, `src/lib/finance/types.ts`
- Environment template: `.env.example`

## 17. How Dashboard Data Loads From Supabase

The dashboard now loads private Supabase data on the server side after login.

Data source mapping:

- `accounts` become dashboard accounts. Only `main_bank`, `other_bank`, `cash`, and `wallet` count toward real available money. `investment` accounts are shown separately.
- `transactions` provide cycle income, normal expenses used for budget progress, investment transfers, and links showing whether obligations/reserves were already paid or reserved.
- Active monthly `subscriptions` become unpaid obligations unless a current-cycle transaction with the subscription id exists.
- Active yearly `subscriptions` become monthly sinking fund reserves by dividing the yearly price by 12.
- Active `annual_expenses` become sinking fund reserves using `monthly_reserve`.
- Active `debts` become planned debt payments, reduced by debt payments inside the current 25th-to-24th cycle.
- `credit_card_statements` provide statement amount due, paid amount, and remaining payable.
- `card_transactions` provide current cycle credit card spending without reducing cash immediately.

Important finance rules preserved:

- Transfers between accounts are not expenses.
- Investment transfers are shown separately and are not mixed with normal spending.
- Paid expenses are not subtracted again from real available money.
- Credit card spending increases liability first; cash decreases only when a card payment is made.
- Salary weekend adjustment still belongs to the cycle starting on the 25th.

## 18. Data Needed Before The Dashboard Shows Real Values

For useful live dashboard values, add these records in Supabase or through future app forms:

1. One or more active accounts.
2. At least one cash-like account balance.
3. Current-cycle income transactions.
4. Budgets for the current financial cycle.
5. Active monthly subscriptions.
6. Annual expenses or yearly subscriptions for sinking funds.
7. Debts with monthly payment values.
8. Credit cards and open credit card statements.
9. Card transactions for current card spending.
10. Investment transfer transactions if you moved money to investment this cycle.

If these records are missing, the dashboard will show a clear empty/demo state.

## 19. Phase 3 Status

Phase 3 is approved and verified locally.

You confirmed these commands passed in Windows PowerShell:

```powershell
npm test
npm run typecheck
npm run lint
npm run build
```

## 20. Phase 4 Security Checklist

This is a private personal finance app. Before pushing to GitHub or deploying to Vercel, keep these rules:

- Recommended: keep the GitHub repository private.
- Never commit `.env.local`.
- Never commit real Supabase secrets.
- Never use the Supabase service role key in frontend code or Vercel frontend environment variables.
- Use only these public frontend environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `NEXT_PUBLIC_APP_DEFAULT_LOCALE`
  - `NEXT_PUBLIC_SITE_URL` if needed later

The project `.gitignore` excludes:

- `.env`
- `.env.local`
- `.env.*.local`
- `node_modules/`
- `.next/`
- `.vercel/`

## 21. Local Verification Workflow

Codex will not run these commands because the Codex sandbox blocks npm child processes. You should run them locally in Windows PowerShell before each push or deployment.

From the project folder:

```powershell
cd "D:\AI project\My_budget_project"
npm test
npm run typecheck
npm run lint
npm run build
```

Only continue to GitHub if all four commands pass.

## 22. Push to GitHub

Repository:

```text
https://github.com/JirawatSuwannasit/my-budget-management
```

Recommended GitHub setting: make the repository **Private** because this is a personal finance app.

### First-time push commands

Run these in PowerShell from the project folder:

```powershell
cd "D:\AI project\My_budget_project"
git init
git branch -M main
git remote add origin https://github.com/JirawatSuwannasit/my-budget-management.git
git status
```

Before adding files, confirm that `.env.local`, `node_modules/`, and `.next/` are not listed as files to be committed.

Then commit and push:

```powershell
git add .
git status
git commit -m "Phase 4 prepare GitHub and Vercel deployment"
git push -u origin main
```

### If the remote already exists

If PowerShell says `remote origin already exists`, run:

```powershell
git remote -v
git remote set-url origin https://github.com/JirawatSuwannasit/my-budget-management.git
```

Then run the commit and push commands again.

### If GitHub asks you to log in

Use one of these beginner-friendly options:

1. Install GitHub Desktop, sign in, then push the existing repository through the app.
2. Or use Git Credential Manager when PowerShell opens a browser sign-in window.
3. Or use a GitHub personal access token if Git asks for a password.

Do not paste Supabase keys into GitHub.

## 23. Deploy to Vercel

Do not deploy until the GitHub push is complete and local checks pass.

### Import the GitHub repository

1. Go to https://vercel.com and log in.
2. Click **Add New**.
3. Click **Project**.
4. Choose the GitHub repository: `JirawatSuwannasit/my-budget-management`.
5. Click **Import**.
6. Framework Preset should be **Next.js**.
7. Keep the default build command unless Vercel changes it:
   - Build Command: `npm run build`
   - Install Command: `npm install`
   - Output Directory: leave default

### Add Vercel environment variables

In Vercel project setup, open **Environment Variables** and add:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_APP_DEFAULT_LOCALE=th
```

Optional later, after you know the final Vercel URL:

```env
NEXT_PUBLIC_SITE_URL=https://your-vercel-project.vercel.app
```

Important:

- Do not add `.env.local` to Vercel.
- Do not add the Supabase service role key.
- The anon key is public/browser-safe when RLS policies are correct, but still do not commit it to GitHub.

### Deploy

1. Click **Deploy** in Vercel.
2. Wait for the build to finish.
3. Copy the Vercel production URL.
4. Continue to the Supabase Auth settings below before relying on production login.

## 24. Supabase Production Auth Settings

After Vercel gives you a production URL, update Supabase Auth settings.

Example production URL:

```text
https://your-vercel-project.vercel.app
```

In Supabase:

1. Open your Supabase project.
2. Go to **Authentication**.
3. Go to **URL Configuration**.
4. Set **Site URL** to your Vercel production URL.
5. Add these **Redirect URLs**:

```text
http://localhost:3000/**
https://your-vercel-project.vercel.app/**
```

If you later add a custom domain, also add:

```text
https://your-custom-domain.com/**
```

Then save the settings.

## 25. After Deployment Smoke Test

This is a manual browser check because it uses your real Vercel deployment and Supabase project.

1. Open the Vercel production URL.
2. Confirm the login page appears.
3. Log in with your manually created Supabase user.
4. Confirm the private dashboard appears.
5. Log out.
6. Try opening `/dashboard` directly.
7. Confirm you are redirected back to login.
8. Confirm no private dashboard data is visible while logged out.

## 26. What Is Not Included Yet

Not included in Phase 4:

- New finance features
- Real transaction CRUD forms
- Account balance reconciliation UI
- Budget creation/editing screens
- Subscription management screens
- Debt payment workflows
- Credit card statement closing workflow
- Sinking fund reserve workflow
- Full Thai/English language switcher UI

These are intentionally left for later phases after Phase 4 is complete.
