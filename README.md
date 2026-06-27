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
- Debt CRUD UI
- Credit card CRUD UI
- Credit card statement closing workflow
- Full Thai/English language switcher UI
