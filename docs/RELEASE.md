# Release Guide

Mina AI Router publishes to npm through GitHub Actions and npm Trusted Publishing.

## One-Time npm Setup

In npm, configure Trusted Publishing for:

- package: `@minasoft/mina-ai-router`
- repository owner: `stevennana`
- repository name: `mina-ai-router`
- workflow file: `npm-publish.yml`
- environment: leave blank

The workflow uses GitHub OIDC and does not require `NPM_TOKEN`.

## Publish a New Version

1. Update `package.json`, `package-lock.json`, and the CLI version in `apps/cli/src/index.ts`.
2. Run verification:

```sh
npm run verify
npm pack --dry-run
```

3. Commit and push to `main`.
4. Create and push a matching version tag:

```sh
git tag v0.1.2
git push origin v0.1.2
```

The GitHub Actions workflow publishes only when the tag version matches `package.json`.

## Workflow

The release workflow is:

```text
tag push -> npm ci -> npm run verify -> version check -> npm publish --provenance
```

## Why Tags

Tag-based publishing keeps normal `main` pushes from publishing accidentally and gives npm a stable release event to attest through Trusted Publishing.
