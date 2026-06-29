# Part 2b — CI & Alerting Design

No code required here — we want your reasoning.

## 1. Running this suite in GitHub Actions on every PR

Describe the workflow: what triggers it, the job/steps, how you start the API
before the tests, and how a test failure fails the build. A YAML sketch is
welcome but optional.

Trigger

Run on pull_request and push to branches (PRs get feedback before merge).
Jobs / steps

Job: e2e
runs-on: ubuntu-latest
concurrency: cancel-in-progress for same branch (reduce noise)
steps:
checkout action
setup-node@v4 with node-version: 24
npm ci
npx cypress install
start API in background: npm run api & (or use start-server-and-test)
wait for API readiness: npx wait-on http://localhost:3001/api/portfolios --timeout 10000
run Cypress headless: npx cypress run
on failure: upload screenshots/videos as artifacts
optional: persist test results (JUnit) for triage
How the API is started

Start the same local server used in dev (npm run api) in the workflow background.
Use wait-on or start-server-and-test to ensure the HTTP endpoint responds before running Cypress.
Failure semantics

The job exits non-zero if cypress run returns non-zero; GitHub Actions marks the workflow failed and the PR shows failing status.
Upload artifacts (screenshots/videos) and JUnit output so reviewers can inspect failures quickly.

```yaml
# (optional) sketch your workflow here
name: e2e
on: [pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
      - run: npm ci
      - run: npx cypress install
      - run: npm run api &>/dev/null &    # start server in background
      - run: npx wait-on http://localhost:3001/api/portfolios --timeout 10000
      - run: npx cypress run --reporter junit --reporter-options "mochaFile=results/junit-[hash].xml"
      - if: failure()
        run: |
          mkdir -p artifacts
          mv cypress/screenshots artifacts/ || true
          mv cypress/videos artifacts/ || true
      - if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: cypress-artifacts
          path: artifacts

```

Notes:
-

## 2. Failure summary to Slack (or structured JSON for alerting)

On a failed run, what would you post, and how do you keep it signal (not noise)?

- **What goes in the message:** (which fields — failing specs? counts? a link to
  the run? first error? )
    Short header: [E2E FAILURE] repo:branch #PR
    One-line summary: first failing spec and first failing test name
    Metrics: total specs, failing count, duration
    Link: GitHub Actions run URL and artifacts (screenshots/video)
    Small context: first stack/ error snippet (<= 300 chars) and whether retries triggered
- **How it's triggered:** (only on failure? on flaky retries? on `main` only?)
    Trigger on workflow failure only (do not post on success).
    If retries are configured, post only after final failure (i.e., after retries exhausted).
    Optionally suppress alerts for non-PR branches or only post for protected branches (e.g., main) plus PRs that modify critical areas.
- **Keeping it useful:** (dedup, thresholds, grouping, who gets pinged, etc.)
    Aggregate similar failures: if same test fails repeatedly across N runs in a time window, raise a higher-severity alert to the on-call vs. a transient message to CI channel.
    Deduplicate by test identifier + error hash: avoid re-posting identical messages for the same failure within a short window.
    Rate-limit: collapse multiple failures from a single run into one message, with counts and links to artifacts.
    Destination channels:
    Quiet CI channel (ci-e2e) for single failures with concise info + link.
    Pager/alerts channel for sustained/flaky failures (e.g., same failure 3 times in 24 hours).
    Include actionable links only (run, artifacts, failing spec) so triage is fast.
