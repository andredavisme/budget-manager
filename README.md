# Budget Manager

A personal budget manager web app backed by [Supabase](https://supabase.com), hosted on GitHub Pages.

## Features
- **Dashboard** — income vs. budgeted vs. actual across all categories per period
- **10 Budget Categories** — Food, Hygiene, Medication, Communication, Transportation, Shelter, Assets, Investments, Entertainment, Events
- **Per-category** — add items, set budget lines, log transactions
- **Income tracking** — multiple income sources per period

## Live App
[https://andredavisme.github.io/budget-manager](https://andredavisme.github.io/budget-manager)

## Tech Stack
- Vanilla HTML/CSS/JS (no build step)
- [Supabase JS v2](https://supabase.com/docs/reference/javascript)
- GitHub Pages for hosting

## Setup
1. Fork this repo
2. Update `SB_URL` and `SB_KEY` in `app.js` with your own Supabase project credentials
3. Enable GitHub Pages on the `main` branch (`/root`)
4. Apply the database migration from the `/sql` folder to your Supabase project

## Database
Built on a modular schema with:
- `budget_profile` → `budget_period` → `*_budget_line` + `*_transaction`
- `income_source` → `monthly_income`
- `budget_period_summary` view for dashboard aggregates
