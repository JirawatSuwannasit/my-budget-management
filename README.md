# Private Personal Finance Control Dashboard

A private, mobile-first personal finance web app for tracking real available money after unpaid obligations, reserved budgets, credit card payable, planned debt payments, and monthly sinking fund reserves.

This repository is currently in **Phase 1 only**. It creates the local Next.js foundation, private auth shell, dashboard UI shell, Supabase client setup, database schema/RLS draft, and PWA basics. It does not upload to GitHub and does not deploy to Vercel yet.

## 1. Project overview

The app is designed to help answer one question:

> How much money can I safely use right now?

Important Phase 1 finance rules already represented in code:

- Financial cycle runs from the 25th to the 24th.
- Salary may be paid early before a weekend, but still belongs to the cycle starting on the 25th.
- Real available money uses only cash-like accounts: main bank, other bank, cash, and wallet.
- Investment accounts are excluded from real available money.
- Paid cash/bank expenses are not subtracted again because cash balances already changed.
- Credit card expenses increase card liability first and reduce cash only when paid.
- Investment transfers are tracked separately from normal expenses.
- Sinking fund reserve can be virtual in v1.
- Account balances can later support manual adjustment/reconciliation entries.

## 2. Tech stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Auth
- Supabase Row Level Security
- PWA manifest and service worker foundation
- Thai-first UI structure with English dictionary support

## 3. Local setup steps

You will develop locally first on your Windows computer.

Do not push to GitHub yet. Do not deploy to Vercel yet.

### Required installs

Install these if you do not already have them:

1. Node.js LTS from https://nodejs.org
2. Visual Studio Code from https://code.visualstudio.com
3. A Supabase account from https://supabase.com

After installing Node.js, close and reopen PowerShell.

Check Node.js is installed:

```powershell
node --version
npm --version
```

If both commands show version numbers, you are ready.

## 4. How to install dependencies

Open PowerShell and go to this project folder:

```powershell
cd "D:\AI project\My_budget_project"
```

Install packages:

```powershell
npm install
```

This creates a `node_modules` folder. That folder is normal and should not be uploaded to GitHub later.

## 5. How to create and configure Supabase

1. Go to https://supabase.com and log in.
2. Click **New project**.
3. Choose your organization.
4. Enter a project name, for example: `personal-finance-local`.
5. Create a strong database password and save it somewhere safe.
6. Choose a nearby region.
7. Click **Create new project**.
8. Wait until Supabase finishes creating the project.

### Disable public signup for privacy

For v1, the app should be private.

1. In Supabase, open your project.
2. In the left sidebar, click **Authentication**.
3. Click **Providers**.
4. Click **Email**.
5. Keep Email provider enabled.
6. Turn off public/self signup if your Supabase dashboard shows that option.
7. Save changes.

If Supabase does not show a direct signup toggle in your current UI, keep the app login-only and create your first user manually in the next step.

### Create your first private user

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

## 6. Required environment variables

Create a local environment file:

```powershell
copy .env.example .env.local
```

Now fill in the values.

1. In Supabase, open your project.
2. Click **Project Settings** in the left sidebar.
3. Click **API**.
4. Find **Project URL**.
5. Copy it into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`.
6. Find **anon public** key.
7. Copy it into `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Your `.env.local` should look like this:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_APP_DEFAULT_LOCALE=th
```

Do not paste the Supabase service role key into this app. Do not commit real keys to GitHub later.

## 7. How to run database migrations / SQL setup

Phase 1 includes one SQL file:

```text
supabase/migrations/001_initial_schema.sql
```

To run it manually in Supabase:

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

The SQL creates:

- Profiles and app settings
- Cash-like and investment accounts
- Transactions with the required transaction types
- Budgets
- Subscriptions
- Annual expenses / sinking funds
- Debts and debt payments
- Credit cards
- Credit card statements
- Card transactions and card payments
- Row Level Security policies for user-owned tables

If you get an error saying something already exists, it usually means you already ran part of the SQL. For a fresh project, it should run once cleanly.

## 8. How to start the local development server

In PowerShell:

```powershell
cd "D:\AI project\My_budget_project"
npm run dev
```

When it starts, open this in your browser:

```text
http://localhost:3000
```

You should be redirected to the private dashboard if logged in, or to the login page if not logged in.

## 9. How to test login and private access

1. Start the app with `npm run dev`.
2. Open http://localhost:3000.
3. You should see the login page.
4. Enter the email and password of the Supabase user you created manually.
5. Click **Login**.
6. You should land on the dashboard.
7. Click **Logout**.
8. Try opening http://localhost:3000/dashboard again.
9. You should be sent back to the login page.

That confirms the private route shell is working.

## 10. How to test the main finance logic

Phase 1 uses sample data in:

```text
src/lib/finance/sample-data.ts
```

The formula is in:

```text
src/lib/finance/dashboard.ts
```

The dashboard should show:

- Real available money
- Cash-like balance
- Cycle income
- Investment tracking separate from available cash
- Unpaid obligations
- Remaining credit card payable
- Planned debt payment
- Monthly sinking fund reserves
- Reserved budgets
- Current credit card cycle spending

To manually test the no-double-counting rule:

1. Open `src/lib/finance/sample-data.ts`.
2. Find an obligation with `paid: false`.
3. Change it to `paid: true`.
4. Save the file.
5. The dashboard real available money should increase because that unpaid obligation is no longer reserved.

To test investment exclusion:

1. In `sample-data.ts`, change the investment account balance.
2. Save the file.
3. The investment balance display should change.
4. Real available money should not change because investment accounts are excluded.

To test credit card payable:

1. In `sample-data.ts`, change `statementAmountDue` or `paidAmount` in `creditCardStatements`.
2. Save the file.
3. Remaining statement payable should change.
4. Real available money should change only by the remaining payable amount.

To test the 25th-to-24th cycle logic, review:

```text
src/lib/finance/cycle.ts
```

The dashboard shows the current financial cycle and the salary payment date rule.

## 11. Common errors and how to fix them

### Error: Missing Supabase environment variables

Fix:

1. Make sure `.env.local` exists.
2. Make sure it contains `NEXT_PUBLIC_SUPABASE_URL`.
3. Make sure it contains `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Stop the dev server with **Ctrl + C**.
5. Start it again with `npm run dev`.

### Error: Invalid login credentials

Fix:

1. Go to Supabase **Authentication > Users**.
2. Confirm your user exists.
3. If needed, create a new user manually.
4. Try logging in again with that email and password.

### Error: relation does not exist

This means the database SQL has not been run yet.

Fix:

1. Go to Supabase **SQL Editor**.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. Refresh the app.

### PowerShell says npm is not recognized

Fix:

1. Install Node.js LTS from https://nodejs.org.
2. Close PowerShell.
3. Open PowerShell again.
4. Run `node --version` and `npm --version`.

### Port 3000 is already in use

Fix:

Run the app on another port:

```powershell
npm run dev -- -p 3001
```

Then open:

```text
http://localhost:3001
```

## 12. What is not included yet

Not included in Phase 1:

- Real transaction CRUD forms
- Real dashboard data from Supabase tables
- Account balance reconciliation UI
- Budget creation/editing screens
- Subscription management screens
- Debt payment workflows
- Credit card statement closing workflow
- Sinking fund reserve workflow
- Full Thai/English language switcher UI
- Offline data sync
- GitHub upload
- Vercel deployment

These are intentionally left for later phases after you approve Phase 1.
