# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Local Waline Comments

The article comment area uses Waline. Start the local Waline service before opening article pages:

```bash
pnpm comments:build
pnpm comments:up
pnpm dev
```

Waline will run at `http://localhost:8360`.
PostgreSQL will run at `localhost:5432` by default and store data under `.data/waline-postgres`.
The local service is built as `chanko/waline:patched`, based on `lizheming/waline:latest` by default with guards for the `think-loader` `__filename` startup crash and Waline MathJax handler registration.
The Waline management UI is available at `/ui` on the deployed Waline server. Visit `/ui/register` for the first account registration.

Required local environment variables:

```bash
NUXT_PUBLIC_WALINE_SERVER_URL=http://localhost:8360
WALINE_JWT_TOKEN=replace-with-a-long-random-token
WALINE_SITE_NAME=ChankoBlog
WALINE_SITE_URL=http://localhost:3000
WALINE_SECURE_DOMAINS=localhost:3000,127.0.0.1:3000
WALINE_ADMIN_MODULE_ASSET_URL=https://unpkg.com/@waline/admin@latest
WALINE_POSTGRES_DB=waline
WALINE_POSTGRES_USER=waline
WALINE_POSTGRES_PASSWORD=replace-with-a-local-postgres-password
WALINE_POSTGRES_HOST=127.0.0.1
WALINE_POSTGRES_PORT=5432
```

To pin a specific Waline base image, set `WALINE_IMAGE` before building:

```bash
WALINE_IMAGE=lizheming/waline:latest pnpm comments:build
```

If Docker keeps the previous SQLite container in a restart loop, restart Docker Desktop and run `pnpm comments:up` again.

Stop the local comment service with:

```bash
pnpm comments:down
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
