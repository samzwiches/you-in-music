# You In Music V3 business layer

This folder is designed for the current cinematic V3 GitHub site.

It does **not** replace `you-in-music.css`, `index.html`, `you-in-music-home.html`, `you-in-music-options.html`, `you-in-music-community.html`, `you-in-music-gift.html`, `you-in-music-process.html`, or `you-in-music-listen.js`.

## New files

- `src/index.js` — Worker API for Stripe, D1, intake, and admin
- `schema.sql` — orders database
- `you-in-music-state.js` — carries journey choices into checkout
- `you-in-music-business.css` — small additive stylesheet for intake/admin only
- `you-in-music-intake.html` — paid story room
- `you-in-music-admin.html` — private creator room
- `.dev.vars.example` — local secret template

## Replace these two V3 files

- `you-in-music-journey.html` — same V3 page, now remembers answers
- `you-in-music-checkout.html` — same V3 page, now opens real Stripe Checkout

## Safe test config

`wrangler.business-test.jsonc` intentionally deploys to a **different Worker** named `you-in-music-business-test` and a test D1 database named `you-in-music-orders-test`.

This avoids touching the live `you-in-music` Worker while we test.

`package.business.json` contains the matching test scripts. When you are ready to use it, either merge those scripts into your existing `package.json`, or temporarily rename it to `package.json` inside a separate test copy.

## Local test order

1. Keep this in a separate test copy of the repo.
2. Copy `.dev.vars.example` to `.dev.vars` and use Stripe test mode values.
3. Install Wrangler with `npm install`.
4. Create the local DB with the `db:local` script.
5. Start with the `dev:business` script.
6. Open `/you-in-music-journey.html`, continue to options and checkout.

Do not deploy the live Worker until the whole flow is working in Stripe test mode.
