# Migrations

One-time data cleanup scripts. Each file is named with the date it was added
plus a short description, e.g. `2026-05-15-drop-solution-refs.js`.

## Running

From the backend directory:

```bash
npm run migrate:drop-solution-refs
```

…or call the file directly:

```bash
node src/migrations/2026-05-15-drop-solution-refs.js
```

Migrations read `MONGODB_URI` from the same `.env` the app uses, so set that
before running.

## Conventions

- **Idempotent.** Running the same migration twice should be a no-op. Most
  scripts here use `$unset` on schema-removed fields, which is naturally
  idempotent.
- **Logs counts.** Each script reports how many docs had the field before and
  how many were modified so you can confirm the change actually happened.
- **Native driver for schema cleanups.** When removing fields that no longer
  exist on the Mongoose model, use `Model.collection.updateMany(...)` (not
  `Model.updateMany`) so strict mode doesn't silently drop the `$unset`.

## Why keep these in the repo?

So that:
1. There's a record of what changed in the DB and when.
2. Anyone spinning up a fresh environment can replay the cleanup against their
   own database.
3. The cleanup commands are reviewable in git, not lost in someone's terminal
   history.
