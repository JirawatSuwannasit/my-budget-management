# Private Personal Finance Control Dashboard

A private, mobile-first personal finance web app for tracking real available money after unpaid obligations, reserved budgets, credit card payable, planned debt payments, and monthly sinking fund reserves.

This repository has completed deployment preparation and is now in **Phase 6: Budgets, Subscriptions, and Sinking Funds**. Earlier local verification passed. This phase adds private planning screens so budgets, subscriptions, and annual sinking funds can be managed from the app and reflected in the dashboard.

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
## 27. Accounts + Transactions CRUD Phase

This phase adds the first real data-entry screens after deployment:

- Account list
- Add account
- Edit account
- Activate/deactivate account
- Transaction list
- Add transaction
- Edit transaction
- Safe delete for transactions created by the app
- Balance effects for normal cash/bank transactions, transfers, investment transfers, card payments, and debt payments
- Side records for credit card expenses, credit card payments, and debt payments

No new deployment was performed by Codex in this phase.

## 28. New Database Migrations for This Phase

New migrations were added:

```text
supabase/migrations/002_link_side_records_to_transactions.sql
supabase/migrations/003_add_transactions_destination_account_id.sql
supabase/migrations/004_add_planning_category_links.sql
```

Run these migrations in Supabase before browser testing the Accounts + Transactions CRUD and Phase 6 planning screens.

Run them in this order:

1. `supabase/migrations/002_link_side_records_to_transactions.sql`
2. `supabase/migrations/003_add_transactions_destination_account_id.sql`
3. `supabase/migrations/004_add_planning_category_links.sql`

The `003` migration fixes this browser error:

```text
column transactions.destination_account_id does not exist
Could not find the 'destination_account_id' column of 'transactions' in the schema cache.
```

The `004` migration fixes these browser errors:

```text
column subscriptions.category_id does not exist
Could not find category_id column of subscriptions in schema cache
Could not find category_id column of annual_expenses in schema cache
```

Beginner-friendly SQL Editor method:

1. Open your Supabase project.
2. Click **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Open the first migration file in VS Code:

```text
D:\AI project\My_budget_project\supabase\migrations\002_link_side_records_to_transactions.sql
```

5. Copy all SQL from the file.
6. Paste it into Supabase SQL Editor.
7. Click **Run**.
8. Wait for Supabase to finish.
9. Click **New query** again.
10. Open the second migration file in VS Code:

```text
D:\AI project\My_budget_project\supabase\migrations\003_add_transactions_destination_account_id.sql
```

11. Copy all SQL from the file.
12. Paste it into Supabase SQL Editor.
13. Confirm the SQL includes this final line:

```sql
notify pgrst, 'reload schema';
```

14. Click **Run**.
15. Wait for Supabase to finish, then refresh the app.
16. Click **New query** again.
17. Open the third migration file in VS Code:

```text
D:\AI project\My_budget_project\supabase\migrations\004_add_planning_category_links.sql
```

18. Copy all SQL from the file.
19. Paste it into Supabase SQL Editor.
20. Confirm the SQL includes this final line:

```sql
notify pgrst, 'reload schema';
```

21. Click **Run**.
22. Wait for Supabase to finish, then refresh the app.

The `002` migration adds `transaction_id` links to `card_transactions`, `card_payments`, and `debt_payments`. Those links let the app safely reverse side effects when you edit or delete a transaction.

The `003` migration adds nullable `transactions.destination_account_id`, adds a foreign key to `public.accounts(id)` with `on delete set null`, adds an index, and reloads the Supabase/PostgREST schema cache.

The `004` migration adds nullable `category_id` columns to `subscriptions` and `annual_expenses`, adds foreign keys to `public.categories(id)` with `on delete set null`, adds indexes, and reloads the Supabase/PostgREST schema cache. Existing subscription and annual expense rows are preserved.

Phase 6 does **not** require an `annual_expenses.reserved_this_cycle` column. Sinking fund reserve status is derived from current-cycle `sinking_fund_reserve` transactions linked to the annual expense.

## 29. How to Add Accounts

Start the local app, log in, then open **Accounts** from the bottom navigation or left sidebar.

Add these account types as needed:

- `main_bank`: your main salary/current account. Counts toward real available money.
- `other_bank`: another bank account. Counts toward real available money.
- `cash`: physical cash. Counts toward real available money.
- `wallet`: app wallet or stored balance. Counts toward real available money.
- `investment`: investment account. Does not count toward real available money.

To add an account:

1. Open **Accounts**.
2. Enter the account name, for example `KBank Salary`.
3. Choose the account type.
4. Enter the current balance.
5. Keep **active** checked.
6. Click **Add account**.

To edit an account:

1. Open **Accounts**.
2. Find the account card.
3. Click **Edit account**.
4. Change the name, type, balance, or active status.
5. Click **Save account**.

Use activate/deactivate when an account should stay in history but should no longer be used for current calculations.

## 30. How to Add Each Transaction Type

Open **Transactions** after you have at least one account.

### Income

Use for salary or other money received.

Effect:

- Increases the selected account balance.
- Counts as current-cycle income.
- Uses the 25th-to-24th financial cycle.

### Expense

Use for normal spending paid from cash, bank, or wallet.

Effect:

- Decreases the selected cash-like account balance immediately.
- Counts as normal spending for budgets.
- Does not get subtracted again from real available money because the account balance already went down.

### Transfer

Use for moving money between your own accounts.

Effect:

- Decreases the source account.
- Increases the destination account.
- Does not count as an expense.

### Credit Card Expense

Use when you spend on a credit card.

Effect:

- Creates a card transaction.
- Increases credit card liability/tracking.
- Does not decrease cash immediately.

You need at least one credit card record in Supabase before this appears as a useful option. Full credit card management screens are planned for a later phase.

### Credit Card Payment

Use when you pay a card statement from a bank/cash-like account.

Effect:

- Decreases the selected cash-like account.
- Creates a card payment record.
- Increases the statement paid amount.
- Reduces remaining card payable.

You need an unpaid or partially paid `credit_card_statements` row in Supabase before this can be tested fully.

### Debt Payment

Use when paying a loan or personal debt.

Effect:

- Decreases the selected cash-like account.
- Creates a debt payment record.
- Reduces the debt remaining balance.

You need a debt record in Supabase before this can be tested fully.

### Investment Transfer

Use when moving money from a cash-like account to an investment account.

Effect:

- Decreases the source cash-like account.
- Increases the investment account.
- Tracks investment movement separately.
- Does not mix investment transfer with normal expenses.

### Sinking Fund Reserve

Use when marking money as reserved for annual or irregular costs.

Effect in v1:

- Creates a transaction marker.
- Does not change account balances because sinking fund reserve is virtual first.
- Helps avoid double counting in real available money logic.

## 31. Finance Rules Preserved in CRUD

The account and transaction screens follow the approved finance logic:

- Cash-like accounts count toward real available money.
- Investment accounts do not count toward real available money.
- Transfers between accounts are not expenses.
- Investment transfers are separate from daily spending.
- Credit card expenses increase card liability first and reduce cash only when paid.
- Cash/bank expenses reduce cash immediately.
- Paid expenses are not subtracted again from real available money.
- The financial cycle remains 25th-to-24th.
- Salary paid early before a weekend still belongs to the cycle starting on the 25th.

## 32. Local Verification Workflow for This Phase

Codex did not run these commands because you asked Codex not to run npm test/typecheck/lint/build in this sandbox.

Please run these in Windows PowerShell from the project folder:

```powershell
cd "D:\AI project\My_budget_project"
npm test
npm run typecheck
npm run lint
npm run build
```

All four should pass before approving this phase or pushing/deploying later.

## 33. Browser Checks for Accounts + Transactions

Before browser testing, make sure both phase migrations have been run in Supabase:

```text
supabase/migrations/002_link_side_records_to_transactions.sql
supabase/migrations/003_add_transactions_destination_account_id.sql
supabase/migrations/004_add_planning_category_links.sql
```

The `003` migration is required before opening **Transactions**, because the transaction list reads `transactions.destination_account_id` for transfer and investment transfer rows.
The `004` migration is required before opening **Plan / แผนเงิน**, because Phase 6 reads `subscriptions.category_id` and `annual_expenses.category_id`.

Start the app locally:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

Then open:

```text
http://localhost:3000
```

Manual browser checks:

1. Log in with your Supabase user.
2. Confirm logged-out users cannot see `/accounts` or `/transactions`.
3. Open **Accounts**.
4. Add a main bank account.
5. Add a cash or wallet account.
6. Add an investment account.
7. Confirm the cash-like total excludes the investment account.
8. Edit an account balance and confirm it saves.
9. Deactivate an account and confirm it appears inactive.
10. Open **Transactions**.
11. Add income into the main bank account and confirm the account balance increases.
12. Add a normal expense and confirm the cash-like account balance decreases.
13. Add a transfer between cash-like accounts and confirm total cash-like money does not change.
14. Add an investment transfer and confirm the investment account increases while normal spending stays separate.
15. Go back to the dashboard and confirm real available money updates without double-counting paid expenses.

Optional browser checks if you already have Supabase rows for debts and credit cards:

1. Add a credit card expense and confirm cash does not decrease immediately.
2. Add a credit card payment and confirm cash decreases and remaining payable changes.
3. Add a debt payment and confirm cash decreases and remaining debt changes.
4. Edit a transaction created by the app and confirm balances reverse/reapply correctly.
5. Delete a transaction created by the app and confirm balances reverse safely.

## 34. Accounts + Transactions CRUD Files Created or Modified

Important files in this phase:

- Account route: `src/app/(private)/accounts/page.tsx`
- Account server actions: `src/app/(private)/accounts/actions.ts`
- Account form: `src/components/accounts/account-form.tsx`
- Transaction route: `src/app/(private)/transactions/page.tsx`
- Transaction server actions: `src/app/(private)/transactions/actions.ts`
- Transaction form: `src/components/transactions/transaction-form.tsx`
- Account balance effect helper: `src/lib/finance/transaction-effects.ts`
- Finance logic tests: `src/lib/finance/dashboard.test.ts`
- App navigation: `src/components/layout/app-shell.tsx`
- Supabase migration: `supabase/migrations/002_link_side_records_to_transactions.sql`
- Supabase schema repair migration: `supabase/migrations/003_add_transactions_destination_account_id.sql`
- Supabase Phase 6 schema repair migration: `supabase/migrations/004_add_planning_category_links.sql`
- Documentation: `README.md`

## 35. Not Included Yet

Still planned for later phases:

- Full category CRUD UI
- Budget CRUD UI
- Subscription CRUD UI
- Debt CRUD UI
- Credit card CRUD UI
- Credit card statement closing workflow
- Annual expense and sinking fund management UI
- Full Thai/English language switcher UI
- GitHub/Vercel redeploy automation

## 36. Phase 6: Budgets, Subscriptions, and Sinking Funds

Phase 6 adds a new private page:

```text
http://localhost:3000/planning
```

Use the **Plan / แผนเงิน** navigation item to open it.

Before using this page, run this migration in Supabase SQL Editor if you have not already:

```text
supabase/migrations/004_add_planning_category_links.sql
```

This page includes:

- Monthly budget management for the 25th-to-24th cycle
- Subscription management for monthly and yearly subscriptions
- Annual expense / sinking fund management
- Progress bars for budgets and sinking fund reserves
- Empty, loading, and error states
- Thai-first labels with English finance terms where useful

No deployment was performed by Codex in this phase.

## 37. How to Create Budgets

Open **Plan / แผนเงิน**, then use **เพิ่มงบรายเดือน**.

Recommended budget examples:

- `Daily living expenses`
- `Transportation`
- `Miscellaneous shopping`
- `Luxury / non-essential spending`

Budget fields:

- **Budget name**: the name shown in the app.
- **Amount per cycle**: the money reserved for the current 25th-to-24th cycle.
- **Expense category**: used to match expense transactions to this budget.
- **Active**: keep checked if this budget should count in dashboard calculations.

How budget progress works:

- Only active budgets for the current financial cycle are used.
- Expenses count toward a budget when the transaction category matches the budget category.
- Remaining budget = budget amount minus used amount.
- Dashboard real available money subtracts only the unspent reserved budget.
- Paid expenses are not subtracted again because they already reduced cash/bank balance.
- Overspending is shown with warning color.

## 38. How to Create Subscriptions

Open **Plan / แผนเงิน**, then use **เพิ่ม subscription**.

Subscription categories:

- `AI`
- `Sports / football`
- `Entertainment`
- `Productivity`
- `Other`

Monthly subscriptions:

- Choose `รายเดือน - fixed obligation`.
- Example: monthly AI subscription.
- These count as monthly fixed obligations.
- They reduce real available money until paid in the current cycle.
- When you pay one, add an `expense` transaction and select the subscription in **Link to subscription / annual cost** so the dashboard does not count it twice.

Yearly subscriptions:

- Choose `รายปี - sinking fund`.
- Example: Premier League football streaming app.
- The app divides the yearly price by 12.
- That monthly reserve reduces real available money.
- Use a `sinking_fund_reserve` transaction when you set aside that month’s reserve.

## 39. How to Create Annual Expenses / Sinking Funds

Open **Plan / แผนเงิน**, then use **เพิ่ม sinking fund**.

Recommended examples:

- `Condo common fee`
- `Condo insurance`
- `Annual football app subscription`

Annual expense fields:

- **Name**: the annual cost name.
- **Category**: housing, insurance, sports/football, or other.
- **Annual amount**: the full yearly amount.
- **Due date**: when the bill is due.
- **Active**: keep checked if this sinking fund should count.

Sinking fund logic:

- Monthly reserve = annual amount divided by 12.
- Monthly reserve reduces real available money.
- If you create a `sinking_fund_reserve` transaction linked to the annual expense, the dashboard treats this cycle’s reserve as already done.
- The app derives this from transactions; it does not require `annual_expenses.reserved_this_cycle`.
- The actual payment should still be tracked separately when paid, usually as a normal expense or the later dedicated payment workflow.

## 40. Phase 6 Dashboard Integration

The dashboard now receives live budget and sinking fund details, not static placeholder progress bars.

Dashboard behavior:

- Active current-cycle budgets reduce real available money only by the remaining unspent amount.
- Monthly subscriptions reduce real available money as unpaid obligations.
- Yearly subscriptions reduce real available money as monthly sinking fund reserves.
- Annual expenses reduce real available money as monthly sinking fund reserves.
- Current-cycle transactions linked to subscriptions or annual expenses prevent double counting.
- Annual expense reserve status is derived from current-cycle `sinking_fund_reserve` transactions.
- The 25th-to-24th financial cycle logic stays unchanged.

## 41. Local Verification Commands for Phase 6

Codex did not run these commands because you asked Codex not to run npm test/typecheck/lint/build.

Please run these in Windows PowerShell:

```powershell
cd "D:\AI project\My_budget_project"
npm test
npm run typecheck
npm run lint
npm run build
```

All four should pass before approving Phase 6.

## 42. Browser Checks for Phase 6

Start the app locally:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

Then open:

```text
http://localhost:3000
```

Manual browser checks:

1. Log in.
2. Open **Plan / แผนเงิน**.
3. Add a monthly budget, for example `Daily living expenses`.
4. Add a monthly AI subscription.
5. Add a yearly football app subscription.
6. Add `Condo common fee` as an annual expense.
7. Confirm budget progress displays used, remaining, percent used, and average daily available.
8. Confirm overspending uses warning color if used amount is over budget.
9. Open **Transactions** and add an `expense` linked to the monthly AI subscription.
10. Open **Dashboard**.
11. Confirm real available money changes after adding active budgets, monthly subscriptions, and sinking funds.
12. Confirm the paid monthly AI subscription is no longer double counted after the linked expense.
13. Confirm yearly costs show monthly reserve.
14. Add a matching `sinking_fund_reserve` transaction from **Transactions**.
15. Confirm the related sinking fund no longer reduces real available money for the current cycle.

## 43. Phase 6 Files Created or Modified

Important Phase 6 files:

- Planning route: `src/app/(private)/planning/page.tsx`
- Planning loading state: `src/app/(private)/planning/loading.tsx`
- Planning server actions: `src/app/(private)/planning/actions.ts`
- Budget form: `src/components/planning/budget-form.tsx`
- Subscription form: `src/components/planning/subscription-form.tsx`
- Annual expense form: `src/components/planning/annual-expense-form.tsx`
- Dashboard route: `src/app/(private)/dashboard/page.tsx`
- Dashboard UI: `src/components/dashboard/dashboard-shell.tsx`
- App navigation: `src/components/layout/app-shell.tsx`
- Finance tests: `src/lib/finance/dashboard.test.ts`
- Documentation: `README.md`

## 44. Still Not Included After Phase 6

Still planned for later phases:

- Full category management UI
- Dedicated subscription payment workflow
- Dedicated annual bill payment workflow
- Full Thai/English language switcher UI

## 45. Phase 7: Debts and Credit Cards

Phase 7 adds private app screens for:

- Debt list and debt progress
- Add/edit/deactivate debt
- Debt payment workflow
- Credit card list
- Add/edit/deactivate credit card
- Credit card statement tracking
- Credit card expense workflow
- Credit card payment workflow

No deployment was performed by Codex in this phase.

## 46. Phase 7 Database Migration

A new migration was added:

```text
supabase/migrations/005_add_debt_bonus_payment_amount.sql
```

Run this migration in Supabase before testing Phase 7 in the browser. It adds:

- `debts.bonus_payment_amount`
- A useful `debts(user_id, type)` index
- `notify pgrst, 'reload schema';`

Beginner-friendly SQL Editor method:

1. Open your Supabase project.
2. Click **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Open this local file:

```text
D:\AI project\My_budget_project\supabase\migrations\005_add_debt_bonus_payment_amount.sql
```

5. Copy all SQL from the file.
6. Paste it into Supabase SQL Editor.
7. Click **Run**.
8. Wait for Supabase to finish.

If Supabase still reports a schema cache error, wait a few seconds, refresh the app, and run this SQL once:

```sql
notify pgrst, 'reload schema';
```

## 47. How to Add a Debt

Open **Debt** from the bottom navigation or desktop sidebar.

Use **Add debt**.

Recommended first example:

- Debt name: `Interest-free debt 500,000`
- Debt type: `Interest-free debt`
- Original amount: `500000`
- Remaining balance: `500000`
- Interest: `0`
- Monthly payment: `9000`
- Bonus payment: `50000`
- Target payoff date: choose a date within about 3 years
- Active debt: checked

The debt card shows original amount, remaining balance, monthly payment, bonus payment, estimated months remaining, payoff progress, and payment history.

## 48. How to Record a Debt Payment

Before recording a debt payment, you need:

- At least one active debt
- At least one active cash-like account, such as `main_bank`, `other_bank`, `cash`, or `wallet`

Use **Record debt payment**.

Effect:

- Creates a `debt_payment` transaction
- Reduces the selected cash-like account balance
- Reduces the debt remaining balance
- Reduces the remaining planned debt payment for the current 25th-to-24th cycle
- Prevents the dashboard from reserving the paid amount again

## 49. How to Add a Credit Card

Open **Debt**, then use **Add credit card**.

Fields:

- Card name
- Billing cut day
- Payment due day
- Active card

The card section shows current cycle spending, statement amount due, paid amount, remaining payable, and statement status.

## 50. Credit Card Expenses vs Cash Expenses

A cash or bank expense reduces the account balance immediately.

A credit card expense works differently:

- It creates a `credit_card_expense` transaction.
- It increases card liability/current card spending.
- It does not reduce cash immediately.
- Cash decreases later only when you record a credit card payment.

This prevents double counting in real available money.

## 51. How to Add and Pay a Credit Card Statement

Use **Add statement** to create the card statement amount that is due.

Statement fields:

- Credit card
- Cycle start
- Cycle end
- Due date
- Statement amount due
- Paid amount

Use **Pay credit card statement** when you actually pay from a cash-like account.

Effect:

- Creates a `credit_card_payment` transaction
- Reduces the selected cash-like account balance
- Increases the statement paid amount
- Reduces remaining card payable
- Updates statement status to unpaid, partial, or paid
- Prevents the dashboard from reserving the paid amount again

## 52. Phase 7 Dashboard Integration

The dashboard continues to use the approved no-double-counting rules:

- Real available money subtracts only remaining planned debt payments.
- Real available money subtracts only remaining credit card payable.
- Paid debt payments are not reserved again in the same financial cycle.
- Paid credit card payments are not reserved again after cash has already decreased.
- Credit card expenses do not reduce cash until paid.
- Investment accounts remain excluded from real available money.
- The 25th-to-24th financial cycle still applies.

## 53. Local Verification Commands for Phase 7

Codex did not run these commands because you asked Codex not to run npm test/typecheck/lint/build.

Please run these in Windows PowerShell:

```powershell
cd "D:\AI project\My_budget_project"
npm test
npm run typecheck
npm run lint
npm run build
```

All four should pass before approving Phase 7.

## 54. Browser Checks for Phase 7

Start the app locally:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

Then open:

```text
http://localhost:3000
```

Manual browser checks:

1. Log in.
2. Open **Debt**.
3. Add the 500,000 THB interest-free debt.
4. Add a debt payment.
5. Confirm debt remaining balance decreases.
6. Open **Dashboard** and confirm planned debt payment/remaining debt updates.
7. Add a credit card.
8. Add a credit card expense.
9. Confirm cash balance does not decrease immediately.
10. Confirm card liability/current cycle spending increases.
11. Add a credit card statement if one does not exist yet.
12. Pay a credit card statement.
13. Confirm cash balance decreases and remaining payable decreases.
14. Confirm dashboard real available money avoids double counting.

## 55. Phase 7 Files Created or Modified

Important Phase 7 files:

- Debt/card route: `src/app/(private)/debts-cards/page.tsx`
- Debt/card loading state: `src/app/(private)/debts-cards/loading.tsx`
- Debt/card server actions: `src/app/(private)/debts-cards/actions.ts`
- Debt form: `src/components/debts-cards/debt-form.tsx`
- Credit card form: `src/components/debts-cards/card-form.tsx`
- Statement form: `src/components/debts-cards/statement-form.tsx`
- Debt/card payment forms: `src/components/debts-cards/payment-forms.tsx`
- Transaction revalidation: `src/app/(private)/transactions/actions.ts`
- App navigation: `src/components/layout/app-shell.tsx`
- Initial schema draft: `supabase/migrations/001_initial_schema.sql`
- Phase 7 upgrade migration: `supabase/migrations/005_add_debt_bonus_payment_amount.sql`
- Documentation: `README.md`

## 56. Phase 8: Category Management and Payment Workflow Polish

Phase 8 was approved after local tests passed and the changes were pushed to GitHub.

Phase 8 adds safer day-to-day management for categories, subscriptions, and annual expenses:

- Category management page
- Add/edit/deactivate categories
- Expanded category types
- Dedicated subscription payment action
- Dedicated annual subscription reserve action
- Dedicated annual expense reserve action
- Dedicated annual bill payment action
- Dashboard safeguards for inactive categories

No deployment was performed by Codex in this phase.

## 57. Phase 8 Database Migration

A new migration was added:

```text
supabase/migrations/006_expand_category_kinds.sql
```

Run this migration in Supabase before testing Phase 8 in the browser. It expands category types to:

- `income`
- `expense`
- `transfer`
- `debt`
- `subscription`
- `sinking_fund`
- `investment`
- `other`

Beginner-friendly SQL Editor method:

1. Open your Supabase project.
2. Click **SQL Editor** in the left sidebar.
3. Click **New query**.
4. Open this local file:

```text
D:\AI project\My_budget_project\supabase\migrations\006_expand_category_kinds.sql
```

5. Copy all SQL from the file.
6. Paste it into Supabase SQL Editor.
7. Click **Run**.
8. Wait for Supabase to finish.

If Supabase still reports an old schema error, run:

```sql
notify pgrst, 'reload schema';
```

## 58. How to Create and Manage Categories

Open **Cat** from the bottom navigation or desktop sidebar.

To add a category:

1. Enter a category name, for example `Daily food`.
2. Choose the type, for example `Expense`.
3. Choose a color.
4. Choose an icon.
5. Keep **Active category** checked.
6. Click **Add category**.

To edit a category:

1. Open **Cat**.
2. Find the category.
3. Click **Edit category**.
4. Change the name, type, color, icon, or active status.
5. Click **Save category**.

The app does not hard-delete categories from this screen. If a category already has transactions, budgets, subscriptions, or annual expenses linked to it, deactivate it instead so old history remains understandable.

## 59. Subscription Payment vs Annual Subscription Reserve

Open **Plan / แผนเงิน**.

For a monthly subscription:

- Use **Pay subscription**.
- This creates an `expense` transaction linked to the subscription.
- The cash-like account balance decreases.
- The dashboard treats the subscription as paid for the current 25th-to-24th cycle, so it is not double counted as an unpaid obligation.

For a yearly subscription:

- Use **Reserve monthly amount** if you are only setting aside this month’s reserve.
- This creates a `sinking_fund_reserve` transaction linked to the yearly subscription.
- It does not reduce a bank/cash balance in v1 because the reserve is virtual.
- Use **Pay annual subscription** when you actually pay the full yearly bill.
- The full yearly payment creates an `expense` transaction linked to the subscription and reduces the selected cash-like account.

## 60. Sinking Fund Reserve vs Actual Annual Bill Payment

For annual expenses such as condo common fee or insurance:

- Use **Reserve this month** when you only want to mark this month’s reserve as done.
- This creates a `sinking_fund_reserve` transaction linked to the annual expense.
- The dashboard no longer subtracts that month’s reserve again.

Use **Pay annual bill** when you actually pay the real annual bill:

- This creates an `expense` transaction linked to the annual expense.
- The selected cash-like account balance decreases.
- The dashboard treats the current-cycle reserve as completed because the bill is already paid.

## 61. Phase 8 Dashboard Safeguards

The dashboard now protects these rules:

- Linked monthly subscription payments prevent unpaid-obligation double counting.
- Linked yearly subscription reserves prevent sinking-fund double counting.
- Linked annual expense reserves prevent sinking-fund double counting.
- Linked actual annual bill payments also prevent reserve double counting for the current cycle.
- Inactive subscriptions and annual expenses do not affect the dashboard.
- Inactive categories are ignored by dashboard mapping when category rows are available.
- The 25th-to-24th financial cycle still applies.

## 62. Local Verification Commands for Phase 8

Codex did not run these commands because you asked Codex not to run npm test/typecheck/lint/build.

Please run these in Windows PowerShell:

```powershell
cd "D:\AI project\My_budget_project"
npm test
npm run typecheck
npm run lint
npm run build
```

All four should pass before approving Phase 8.

## 63. Browser Checks for Phase 8

Start the app locally:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

Then open:

```text
http://localhost:3000
```

Manual browser checks:

1. Log in.
2. Open **Cat**.
3. Add a new expense category.
4. Edit the category.
5. Deactivate the category.
6. Open **Plan / แผนเงิน**.
7. Add a monthly subscription and pay it using **Pay subscription**.
8. Confirm Dashboard no longer double counts the paid subscription.
9. Add an annual expense and use **Reserve this month**.
10. Confirm Dashboard no longer double counts that month’s reserve.
11. Use **Pay annual bill** and confirm the transaction is created correctly.
12. Confirm inactive categories, subscriptions, and annual expenses do not affect Dashboard totals.

## 64. Phase 8 Files Created or Modified

Important Phase 8 files:

- Category route: `src/app/(private)/categories/page.tsx`
- Category loading state: `src/app/(private)/categories/loading.tsx`
- Category server actions: `src/app/(private)/categories/actions.ts`
- Category form: `src/components/categories/category-form.tsx`
- Planning server actions: `src/app/(private)/planning/actions.ts`
- Planning workflow forms: `src/components/planning/payment-workflow-forms.tsx`
- Planning page workflow integration: `src/app/(private)/planning/page.tsx`
- Dashboard data mapper: `src/lib/finance/dashboard-data.ts`
- Finance tests: `src/lib/finance/dashboard.test.ts`
- App navigation: `src/components/layout/app-shell.tsx`
- Initial schema draft: `supabase/migrations/001_initial_schema.sql`
- Phase 8 migration: `supabase/migrations/006_expand_category_kinds.sql`
- Documentation: `README.md`

## 65. Phase 9: Settings, Language Switcher, and PWA/Mobile Polish

Phase 9 adds daily-use polish:

- Settings page
- Thai/English language switcher
- Saved language preference in `profiles.locale`
- Currency and financial cycle preference controls
- Bonus month configuration
- Default account selection
- Android PWA install guidance
- Improved manifest/offline fallback
- Navigation and Dashboard key-label translation

No deployment was performed by Codex in this phase.

## 66. Phase 9 Database Notes

No new database migration is required for Phase 9.

The existing schema already includes:

- `profiles.locale`
- `profiles.currency`
- `profiles.financial_cycle_start_day`
- `app_settings.bonus_months`
- `app_settings.default_account_id`

The Settings page writes to those existing tables using the logged-in user only.

## 67. How to Change Language

Open **Settings / ตั้งค่า** from the bottom navigation or desktop sidebar.

To switch from Thai to English:

1. Open **Settings**.
2. Find **Language / ภาษา**.
3. Choose **English**.
4. Click **Save settings**.
5. Open Dashboard or refresh the page if needed.

To switch back to Thai:

1. Open **Settings**.
2. Choose **Thai / ไทย**.
3. Click **Save settings**.

Translated areas in Phase 9:

- Main navigation
- Logout label
- Dashboard key labels
- Settings page labels

Not every older detailed form message is fully translated yet. The priority in Phase 9 is the daily navigation and main finance summary.

## 68. Android PWA Install Steps

If the app is deployed to Vercel or opened from a secure HTTPS address:

1. Open the site in Chrome on Android.
2. Log in.
3. Tap the three-dot menu in Chrome.
4. Tap **Install app** or **Add to Home screen** if shown.
5. Confirm the install.
6. Open **My Budget** from the Android home screen.

PWA settings now use:

- App name: `My Budget Management`
- Short name: `My Budget`
- Theme color: `#087f8c`
- Display mode: `standalone`
- Orientation: `portrait-primary`
- Offline fallback page: `public/offline.html`

## 69. Local Verification Commands for Phase 9

Codex did not run these commands because you asked Codex not to run npm test/typecheck/lint/build.

Please run these in Windows PowerShell:

```powershell
cd "D:\AI project\My_budget_project"
npm test
npm run typecheck
npm run lint
npm run build
```

All four should pass before approving Phase 9.

## 70. Browser and Mobile Checks for Phase 9

Start the app locally:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

Then open:

```text
http://localhost:3000
```

Manual checks:

1. Log in.
2. Open **Settings**.
3. Switch language from Thai to English.
4. Save settings.
5. Confirm navigation labels update.
6. Confirm Dashboard key labels update.
7. Switch language back from English to Thai.
8. Confirm forms still work after switching language.
9. Open the app at an Android-sized browser width.
10. Confirm no horizontal scrolling or clipped bottom navigation buttons.
11. Confirm logout still works.
12. Confirm protected pages still require login after logout.
13. If deployed to Vercel later, confirm the production site still works after pushing.

## 71. Phase 9 Files Created or Modified

Important Phase 9 files:

- Settings route: `src/app/(private)/settings/page.tsx`
- Settings loading state: `src/app/(private)/settings/loading.tsx`
- Settings server actions: `src/app/(private)/settings/actions.ts`
- Settings form: `src/components/settings/settings-form.tsx`
- Settings logout button: `src/components/settings/logout-button.tsx`
- Transaction delete confirmation: `src/components/transactions/delete-transaction-form.tsx`
- Transactions page delete wiring: `src/app/(private)/transactions/page.tsx`
- App shell/navigation: `src/components/layout/app-shell.tsx`
- Private layout settings load: `src/app/(private)/layout.tsx`
- Dashboard route: `src/app/(private)/dashboard/page.tsx`
- Dashboard UI labels: `src/components/dashboard/dashboard-shell.tsx`
- i18n dictionary: `src/lib/i18n/dictionaries.ts`
- PWA manifest: `public/manifest.webmanifest`
- Service worker: `public/sw.js`
- Offline fallback: `public/offline.html`
- Root metadata/viewport: `src/app/layout.tsx`
- Documentation: `README.md`

## 72. Phase 9.1: Configurable Cycle, Default Account, and Settings i18n

Phase 9.1 repairs two settings that were saved but not yet wired into behavior, and finishes Settings localization:

- **Financial cycle start day now drives the cycle.** Previously the financial cycle was hardcoded to the 25th-to-24th window. The `profiles.financial_cycle_start_day` value now genuinely controls the cycle everywhere (dashboard, planning, transactions, debts/cards).
- **Default account is now used.** `app_settings.default_account_id` now pre-selects the account in the transaction form and in the planning/debts-cards payment forms, when that account is present and active. The selection can still be changed.
- **Settings page is fully localized** in Thai and English (private-access card, daily-use polish card, the three PWA info boxes, and the load-error prefix).
- **Currency control** is rendered as fixed/read-only `THB`. Multi-currency formatting is intentionally out of scope until a later phase; the control no longer pretends to offer a switch.

No new database migration is required. All columns (`profiles.financial_cycle_start_day`, `app_settings.default_account_id`) already exist.

## 73. How the Configurable Financial Cycle Works

Set the start day in **Settings / ตั้งค่า** → **Financial cycle start day / วันเริ่มรอบการเงิน** (allowed range 1–28, kept narrow to avoid short-month bugs in February).

For a start day `D`:

- The current cycle **starts** on day `D` of this month once today is on or after `D`; before `D`, it started on day `D` of the previous month.
- The current cycle **ends** on day `(D - 1)` of the following month, at local noon.
- Example, `D = 25` (the original behavior, unchanged): 25 Jul → 24 Aug.
- Example, `D = 1`: a full calendar month, e.g. 1 Aug → 31 Aug.
- Example, `D = 15`: 15 Aug → 14 Sep.

Salary weekend handling is now relative to the configured start day, not a hardcoded 25th: if the start day lands on a Saturday it is treated as paid the Friday before, and on a Sunday the Friday two days before — even when that early payment falls in the previous month (which can happen for a start day of 1).

The user's start day is read once per page/action from `profiles.financial_cycle_start_day` via the `getUserCycleStartDay` helper, which defaults to 25 and clamps to 1–28.

## 74. Important: Changing the Start Day Is Not Retroactive

Changing the financial cycle start day affects **new cycles going forward only**. It does **not** re-bucket historical records.

- Existing transactions keep the `cycle_start_date` that was stored when they were created.
- Existing budgets keep their stored `cycle_start_date`.
- After changing the start day, new transactions and the dashboard/planning/debts-cards cycle windows use the new boundary, while past records remain in their original cycle buckets.

If you want past records to match a new start day, edit those records directly; the app will not move them automatically.

## 75. Local Verification Commands for Phase 9.1

```powershell
cd "D:\AI project\My_budget_project"
npm test
npm run typecheck
npm run lint
npm run build
```

All four pass for Phase 9.1.

## 76. Browser Checks for Phase 9.1

Start the app locally:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

Then open `http://localhost:3000` and check:

1. Log in.
2. Open **Settings**. Confirm the Currency control shows `THB` as fixed/read-only with the "THB only" note.
3. Confirm the **Private access** card, **Daily-use polish** card, and the three PWA info boxes are localized; switch language and confirm they translate.
4. Set **Financial cycle start day** to `1` and save.
5. Open **Dashboard**. Confirm the cycle date-range label shows the 1st through the end of the month.
6. Open **Planning**. Confirm the budget cycle label/help text matches the 1st-to-end-of-month window, and that new budgets are created against that cycle.
7. Add a new transaction dated inside the current month. Confirm it buckets into the 1st-start cycle (it appears in the planning/dashboard current cycle).
8. Change the start day back to `25` and save. Confirm the dashboard/planning cycle returns exactly to the 25th–24th window.
9. Confirm older transactions/budgets created under a different start day keep their original cycle bucket (not retroactively moved).
10. In **Settings**, set a **Default account** and save.
11. Open the **Transactions** form (new transaction). Confirm the source account is pre-selected to the default account, and that you can still change it.
12. Open **Planning** payment forms (pay subscription / pay annual bill) and **Debts/Cards** payment forms (debt payment / card payment). Confirm the "Pay from" account is pre-selected to the default account when it is active and cash-like.

## 77. Phase 9.1 Files Modified

- Cycle logic + helper: `src/lib/finance/cycle.ts`
- Cycle tests: `src/lib/finance/dashboard.test.ts`
- Dashboard route: `src/app/(private)/dashboard/page.tsx`
- Planning route: `src/app/(private)/planning/page.tsx`
- Planning actions: `src/app/(private)/planning/actions.ts`
- Transactions route: `src/app/(private)/transactions/page.tsx`
- Transactions actions: `src/app/(private)/transactions/actions.ts`
- Debts/Cards route: `src/app/(private)/debts-cards/page.tsx`
- Transaction form (default account): `src/components/transactions/transaction-form.tsx`
- Planning payment forms (default account): `src/components/planning/payment-workflow-forms.tsx`
- Debts/Cards payment forms (default account): `src/components/debts-cards/payment-forms.tsx`
- Settings page (i18n): `src/app/(private)/settings/page.tsx`
- Settings form (fixed currency): `src/components/settings/settings-form.tsx`
- i18n dictionary: `src/lib/i18n/dictionaries.ts`
- Documentation: `README.md`

## 78. Phase 10: Reports & History

Phase 10 adds a new **read-only** route, `/reports`, so the app answers "how have my finances trended over time", not just "how much can I use right now".

- New private, RLS-scoped, locale-aware route at `/reports` (server components).
- Added to navigation (sidebar + bottom bar) with a line-chart icon.
- Fully localized in Thai and English (a new `reports` dictionary section).
- **Read-only by design:** Reports never write data or change balances. No new database migration was needed, and **no chart library was added** — all charts are lightweight inline SVG / CSS bars to keep the bundle small and stay server-rendered.

## 79. What /reports Shows

1. **Cycle history** — for the most recent ~12 financial cycles (derived by grouping transactions on their stored `cycle_start_date`), each cycle shows income, normal expenses, investment transfers, debt paid, sinking-fund reserved, and net (income − expenses). The current cycle is always shown and highlighted.
2. **Income vs expense trend** — a compact grouped-bar chart across the recent cycles.
3. **Spending by category** — for a selected cycle (default = current), the top expense categories with each category's share of the cycle's total. Only active categories are counted (matching dashboard behavior); overflow categories are grouped into "Other". Switch cycles with the cycle chips (a `?cycle=YYYY-MM-DD` query param; no client JS required).
4. **Debt payoff trajectory** — remaining balance over time, reconstructed from `debts` plus `debt_payments` (current remaining + payments made after each cycle), drawn as an inline SVG line chart.
5. **Empty / loading / error states** consistent with the rest of the app.

Each cycle's date window is derived from the cycle's own start date — end = (that start day − 1) of the following month — so historical cycles stay correct even if you changed the cycle start day later (Phase 9.1 is not retroactive).

## 80. Data Sources and Reuse

`/reports` reuses existing finance helpers rather than duplicating calculation logic:

- `getUserCycleStartDay` / `getFinancialCycle` from `src/lib/finance/cycle.ts` for the configured cycle.
- `loadDashboardRows` / `hasRealDashboardRows` from `src/lib/finance/dashboard-data.ts` for the same RLS-scoped Supabase rows the dashboard already loads.
- A pure `buildReportsData` aggregator in `src/lib/finance/reports.ts`.

For the current cycle, the reports figures match the dashboard: income and investment transfers use the same per-cycle grouping and the same active-category filter as `mapDashboardRowsToInput`, verified by a unit test.

## 81. Local Verification Commands for Phase 10

```powershell
cd "D:\AI project\My_budget_project"
npm test
npm run typecheck
npm run lint
npm run build
```

All four pass for Phase 10 (37 unit tests, including 8 new `reports` tests).

## 82. Browser Checks for Phase 10

Start the app locally:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

Then open `http://localhost:3000` and check:

1. Log in.
2. Open **Reports** from the sidebar (desktop) and the bottom navigation (mobile). Confirm the icon and label appear and the route loads.
3. Confirm the page shows the read-only badge and note, and never offers any edit/save controls.
4. Confirm the current cycle's income matches the Dashboard's "Cycle income" for the same cycle.
5. Confirm the cycle history lists recent cycles with income, expenses, investment transfers, debt paid, sinking reserved, and net.
6. Confirm the income-vs-expense trend bars render and scale sensibly.
7. In **Spending by category**, click a different cycle chip and confirm the breakdown and total update (URL gains `?cycle=...`).
8. Confirm only active categories appear and shares are shown as percentages.
9. Confirm the debt payoff trajectory renders (or shows "No debt data yet" when there are no debts).
10. Switch language between Thai and English and confirm every label on the page translates (no hardcoded English/Thai).
11. With little or no data, confirm a clear empty state appears.
12. At an Android-sized width, confirm there is no horizontal scrolling and the bottom navigation (now 8 items) is not clipped.

## 83. Phase 10 Files Created or Modified

- Reports route: `src/app/(private)/reports/page.tsx`
- Reports loading state: `src/app/(private)/reports/loading.tsx`
- Reports view (charts/UI): `src/components/reports/reports-view.tsx`
- Reports aggregation logic: `src/lib/finance/reports.ts`
- Reports tests: `src/lib/finance/reports.test.ts`
- Navigation (added Reports item, 8-column mobile grid): `src/components/layout/app-shell.tsx`
- i18n dictionary (nav + `reports` section, th/en): `src/lib/i18n/dictionaries.ts`
- Documentation: `README.md`

## 84. Phase 11: Due & To-do Reminders (in-app, read-only)

Phase 11 surfaces what is **due or not-yet-done this cycle** so you stop having to remember it manually. It is **read-only**: it never makes payments or changes balances — it only points you to the page where you can act.

What it surfaces (for the current cycle, respecting your configured start day and locale):

- **Credit card statements** still owed (status unpaid/partial, remaining > 0), classified by due date.
- **Annual bills** whose `annual_expenses.due_date` is overdue or approaching, not yet handled this cycle.
- **Active monthly subscriptions** not yet paid this cycle (due date derived from the billing day within the cycle window).
- **Active sinking funds / yearly subscriptions** not yet reserved this cycle (the monthly reserve to-do).
- **Active debts** whose monthly payment has not been fully recorded this cycle (shows the remaining planned amount).

Each item has a title, type, amount, optional due date, and an **urgency** computed from today vs the due date:

- `overdue` — due date is before today.
- `due-soon` — due within the next **`DUE_SOON_DAYS`** days.
- `pending` — outstanding this cycle but not date-urgent (or has no due date).

Where it appears:

- **Dashboard** — a compact "Due & to-do" panel at the top (above the breakdown) showing the most urgent items with a count, or "All caught up this cycle" when nothing is outstanding.
- **`/upcoming`** — a dedicated page listing all items grouped by urgency, each linking to Planning or Debts/Cards to act.
- **Navigation badges** — Upcoming, Planning, and Debts/Cards show a count of urgent (overdue + due-soon) items.

### Tuning the "due soon" window

The window is a single named constant in `src/lib/finance/upcoming.ts`:

```ts
export const DUE_SOON_DAYS = 7;
```

Change that one value to make "due soon" wider or narrower.

### Reuse and constraints

- Reuses `getUserCycleStartDay` / `getFinancialCycle` and the same RLS-scoped `loadDashboardRows` the dashboard uses; the "handled this cycle" check mirrors the dashboard's per-cycle linkage so the panel clears in step with the dashboard.
- Read-only; RLS only; no service-role key in frontend code. **No new database migration** — all needed fields already exist (`credit_card_statements.due_date`/`status`/`remaining_payable`, `annual_expenses.due_date`, `subscriptions.billing_day`, `debts.monthly_payment`, `debt_payments.paid_date`, and the `transactions.related_entity_id` + `cycle_start_date` links).

### Future work (NOT built in Phase 11): real push notifications

This phase is **in-app only**. Real web push / background notifications are intentionally out of scope because they require additional infrastructure:

- a service worker `push` event handler (the current `public/sw.js` only does offline caching),
- VAPID keys and a `PushSubscription` stored per device,
- a server endpoint to save subscriptions and a scheduled function (e.g. a cron/Edge Function) to evaluate "due soon" items and send notifications,
- user permission prompting and per-user notification preferences.

If we enable it later, propose the infra (VAPID keys, a `push_subscriptions` table, a scheduled sender) before implementing — it would be the first feature in this app that needs a background job and a new table.

## 85. Local Verification Commands for Phase 11

```powershell
cd "D:\AI project\My_budget_project"
npm test
npm run typecheck
npm run lint
npm run build
```

All four pass for Phase 11 (47 unit tests, including 10 new `upcoming` tests covering overdue vs due-soon vs pending and "all caught up").

## 86. Browser Checks for Phase 11

Start the app locally:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

Then open `http://localhost:3000` and check:

1. Log in.
2. On the **Dashboard**, confirm the "Due & to-do" panel appears at the top with a count and the most urgent items.
3. With everything for the cycle paid/reserved, confirm the panel shows "All caught up this cycle".
4. Add an unpaid monthly subscription / an unreserved sinking fund / an unpaid debt this cycle and confirm matching items appear; record the payment/reserve and confirm they disappear.
5. Confirm an unpaid credit card statement with a past due date shows as "Overdue", one due within 7 days as "Due soon", and one due later as "Pending".
6. Open **Upcoming** from the navigation; confirm items are grouped by urgency and each links to Planning or Debts/Cards.
7. Confirm the Upcoming / Planning / Debts/Cards nav items show a red badge with the urgent count, and that it clears as you handle items.
8. Switch language between Thai and English and confirm the panel, page, urgency labels, and type labels are all translated (no hardcoded strings).
9. Change the financial cycle start day in Settings and confirm the due/to-do items recompute for the new cycle window.
10. At an Android-sized width, confirm no horizontal scrolling and the bottom navigation (now 9 items) is not clipped.

## 87. Phase 11 Files Created or Modified

- Upcoming logic (pure): `src/lib/finance/upcoming.ts`
- Upcoming tests: `src/lib/finance/upcoming.test.ts`
- Upcoming server loader: `src/lib/finance/upcoming-data.ts`
- Upcoming UI (dashboard panel + full list): `src/components/upcoming/upcoming-ui.tsx`
- Upcoming route + loading: `src/app/(private)/upcoming/page.tsx`, `src/app/(private)/upcoming/loading.tsx`
- Dashboard panel wiring: `src/components/dashboard/dashboard-shell.tsx`, `src/app/(private)/dashboard/page.tsx`
- Navigation badges + Upcoming item (9-column mobile grid): `src/components/layout/app-shell.tsx`
- Private layout (badge counts): `src/app/(private)/layout.tsx`
- Annual expense row `due_date` exposed: `src/lib/finance/dashboard-data.ts`
- i18n dictionary (nav + `upcoming` section, th/en): `src/lib/i18n/dictionaries.ts`
- Documentation: `README.md`

## 88. v1.0 Hardening: Backup, Robustness, Accessibility, i18n

The final v1 pass added no new finance features. It focused on data safety, robustness, accessibility, and finishing localization.

### Personal data backup (read-only export)

- **Settings → Personal data backup** offers two downloads:
  - **Full JSON** (`/settings/export`): accounts, transactions, budgets, subscriptions, annual_expenses, debts, debt_payments, credit_cards, credit_card_statements, card_transactions, categories, plus your profile and app_settings — wrapped with `exportedAt`, `schemaVersion`, and your user id/email.
  - **Transactions CSV** (`/settings/export?format=csv`).
- The export route is a server **Route Handler** scoped to the logged-in user by RLS (and `user_id` filters for profile/app_settings). It is **read-only** — it never writes data. Unauthenticated requests get `401`.
- **Import is intentionally out of scope for v1** (see future work). The UI says so.

### Robustness

- Every `save*` server action runs in try/catch and returns a **localized** `{ status, message }` — never an unhandled throw — covering not-logged-in, invalid input, and Supabase errors. `accounts/actions.ts` was brought in line with the rest (previously English-only).
- Negative balances remain impossible through transactions: `adjustAccountBalance` rejects any update that would drop an account below zero, and transaction edit/delete reverses linked card/debt/statement side-records before re-applying.
- Known minor: the small `setXActive` toggle actions (account/category/debt/card active switches) surface a Supabase/RLS failure via the Next error boundary rather than an inline message. This is a rare path; converting them to inline status is a candidate for a future pass.

### Accessibility & mobile

- Global, visible keyboard **focus ring** (`:focus-visible`) on links, buttons, inputs, selects, textareas, and summaries.
- Icon-only controls have localized `aria-label`s; decorative icons are `aria-hidden`.
- Primary buttons and toggle controls use ≥44px tap targets (`min-h-11`/`min-h-12`).
- Layouts use wrapping/grids and avoid fixed wide content; no horizontal scroll at 360–414px (bottom nav is a 9-column grid).

### i18n completeness

- The **Accounts** area (page + form + actions) and the **Transactions** area (page + form + delete confirm) were fully moved into the dictionary; account-type and transaction-type labels/helpers now come from `th`/`en`.
- Remaining Thai literals are intentional: dictionary values, locale-keyed example/datalist suggestions, inline `locale === "th" ? … : …` strings, and the pre-login screen (no locale preference exists before login — documented).

## 89. v1.0 Release Checklist

- [x] `.gitignore` excludes `.env`, `.env.local`, `.env.*.local`, `.vercel/`; only `.env.example` is committed.
- [x] No `service_role` / service key anywhere under `src` (verified by grep). The browser and server clients use the anon key; all access is RLS-scoped to the logged-in user.
- [x] RLS assumption: every finance table is protected by row-level security keyed on `auth.uid()` / `user_id`; the app never bypasses it. Keep RLS enabled in Supabase.
- [x] PWA: `public/manifest.webmanifest`, icons, and a service worker (`public/sw.js`) are present and the app is installable; `public/offline.html` is the offline fallback for navigations.
- [x] `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` all pass.
- [ ] **You run the release:** commit, tag (e.g. `v1.0.0`), push, and deploy. (This pass intentionally does not push, tag, or deploy.)

### Final manual QA checklist

1. Log in; confirm protected routes redirect to `/login` when logged out.
2. Settings → download the **Full JSON** backup; open it and confirm all tables, profile, and app_settings are present and contain only your data.
3. Settings → download the **Transactions CSV**; confirm it opens in a spreadsheet.
4. Switch language to English, then Thai; spot-check Dashboard, Accounts, Transactions, Planning, Debts/Cards, Categories, Reports, Upcoming, Settings — no stray untranslated labels.
5. Add/edit/deactivate an account and a transaction; confirm localized success/error messages.
6. Try to overspend an account (expense larger than balance); confirm it is blocked with a localized message.
7. Edit and delete a credit-card-payment / debt-payment transaction; confirm balances and the linked statement/debt reverse correctly.
8. Tab through a form with the keyboard; confirm a visible focus ring on every control and that icon-only buttons are announced.
9. At 360–414px width, confirm no horizontal scrolling and the bottom nav (9 items) is fully visible.
10. Install the PWA and confirm the offline fallback page appears when offline.

## 90. v1.0 Complete — Feature Summary & Out of Scope

**v1.0 delivers (Phases 1–11 + hardening):**

- Private, single-user finance app on Next.js 15 + Supabase Auth/Postgres/RLS.
- Accounts (cash-like vs investment), transactions (income, expense, transfer, investment transfer, credit-card expense/payment, debt payment, sinking-fund reserve) with balance side-effects and safe edit/delete reversal.
- Configurable financial cycle start day (1–28); the cycle drives the dashboard, planning, transactions, and debts/cards (not retroactive).
- Dashboard "real available money" model that reserves obligations once and never double-counts.
- Planning (budgets, subscriptions, annual expenses / sinking funds), Debts & credit cards (statements, payments).
- Categories management.
- Reports & history (cycle history, income-vs-expense trend, spending by category, debt payoff trajectory).
- Due & to-do reminders (in-app, read-only) with dashboard panel and nav badges.
- Read-only personal data export (JSON + transactions CSV).
- Thai/English localization, Settings, and Android PWA with offline fallback.

**Out of scope / future work (honest list):**

- **Data import / restore** — export only in v1; a validated importer that re-inserts under the current user with RLS is future work.
- **Real web push / background notifications** — needs a service-worker `push` handler, VAPID keys, a `push_subscriptions` table, and a scheduled sender (see §84).
- **Multi-currency** — the app is THB-only; the currency control is fixed/read-only. Multi-currency storage + formatting is future work.
- **Multi-user / sharing** — the app assumes one private user; no roles or shared budgets.
- **Inline error UI for the small active/inactive toggle actions** (currently surfaced via the error boundary).

## 91. Phase 9.5: Dark-Mode Fintech Redesign (Design System)

Phase 9.5 is a **visual-only** reskin: a dark-first, modern-fintech look (Mercury/Revolut clarity). No data flow, finance calculations, server actions, RLS, or i18n keys/behavior changed — all money figures and flows are byte-for-byte identical. The dashboard "real available money" figure is the deliberate hero of the app (largest, most confident type).

### Design tokens (single source of truth — `tailwind.config.ts`)

`darkMode: "class"`. Dark is the default (no class on `<html>`); a `light` class opts into the light palette. Token **names are stable**, so existing utilities flip to dark automatically.

- **Layered backgrounds:** `canvas` `#0a0e16` (app), `surface` `#121826` (cards), `elevated` `#1b2333` (insets/inputs/tracks), `line` `#283449` (borders).
- **Text:** `ink` `#e7ecf4` (primary), `muted` `#94a3b8`, `faint` `#64748b`.
- **Brand:** `primary` `#2dd4bf` (bright teal — used for text/icons/borders/fills; fills pair with dark `text-canvas`), `primary-strong` `#14b8a6`.
- **Semantic finance:** `income` `#34d399`, `expense`/`danger` `#fb7185`, `debt` `#a5b4fc`, `warning`/`cardpay` `#fbbf24`, `investment` `#60a5fa`, `neutral`/`success`. Tints use the `token/10`–`/15` background + solid token text pattern. All foreground tokens clear **WCAG AA** on `surface`/`elevated`.
- **Type scale:** `caption`, `stat`, `display`, `display-lg` (hero numbers) layered on Tailwind defaults; money/numerics use `tabular-nums` (set globally on `body`).
- **Elevation/radius:** `shadow-card`, `shadow-soft`, and `shadow-glow` (accent glow for the hero); `rounded-panel` (20px).

### Reusable primitives (`src/components/ui/index.tsx`)

Presentational, server-safe (no hooks), so usable from server and client components: `Card`, `Surface`, `StatBlock` (label + big tabular number + tone + optional delta), `Button` (`primary`/`ghost`/`danger` + `buttonClass()` helper), `Input`, `Select`, `Badge`, `StatusPill` (paid/partial/unpaid/reserved/active/inactive/overdue/due-soon/pending → semantic colors), `SectionHeader`, `EmptyState`, plus the shared `fieldClass` constant. The dashboard hero stats use `StatBlock`; `account-form` is the reference form built entirely on `Input`/`Select`/`Button`.

### Theme toggle (cookie, no DB migration)

Dark by default. Settings → **Appearance** offers a Light/Dark switch. The choice is stored in a `theme` cookie; the root layout reads it server-side (`src/lib/theme.ts`) and applies the `light` class during SSR, so the correct palette paints with **no flash**. The switch is a plain server-action form (`setTheme`) — no client JS — preserving the server-component structure. Light mode reuses the same token names via `:root.light` overrides in `globals.css`.

### Manual visual checks per page

Verify on a narrow viewport (360–414px) for no horizontal scroll, ≥44px tap targets, and AA contrast:

- **Login** — dark card, teal gradient brand panel, readable form, error pill in `danger`.
- **Dashboard** — hero "real available money" is the largest figure (glowing elevated card); stat tiles use semantic tones (cash=primary, income, investment, expense, debt, warning); budget/sinking progress bars; upcoming panel.
- **Accounts** — cash-like vs investment totals; account cards; add/edit form (primitives); active/inactive pills.
- **Transactions** — type-driven form fields; recent list; delete confirm; empty state.
- **Planning** — budgets/subscriptions/sinking funds; reserve/pay action forms; over-budget pill.
- **Categories** — colored icon chips; kind/usage badges; edit form.
- **Debts & cards** — debt progress + payment history; card statements with paid/partial/unpaid pills; card-expense/payment/statement forms.
- **Upcoming** — overdue/due-soon/pending groups with semantic urgency pills; all-caught-up state; nav badges.
- **Reports** — income-vs-expense bars, cycle history, spending-by-category, debt trajectory chart.
- **Settings** — Appearance toggle (dark↔light persists, no flash), preferences, PWA/backup/version cards, logout.
- **States** — loading skeletons, empty states, and error banners on every page read dark and cohesive.

### Changelog

- `darkMode: "class"`; dark-first palette + semantic finance tokens + type/elevation scale in `tailwind.config.ts`.
- Dark base, glow background, tabular numerics, dark scrollbar/focus ring, and `:root.light` overrides in `globals.css`.
- New `src/components/ui/index.tsx` primitives; `src/lib/theme.ts`; `src/components/settings/theme-toggle.tsx`; `setTheme` server action.
- Root layout renders the cookie-selected theme (no flash); manifest/viewport theme color set to `#0a0e16`.
- App-wide className migration from hardcoded light utilities (`bg-white`, `bg-slate-*`, light tint pairs, hero gradients) to dark tokens across all pages, forms, nav, loading/empty/error states.
- Dashboard hero refactored to the `StatBlock` primitive with semantic tones; `account-form` refactored to `Input`/`Select`/`Button`.
- Added `settings.appearance/themeDark/themeLight/themeHint` i18n keys (th + en).
