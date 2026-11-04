# Agent instructions — Site Tracker (Android app)

1. Read [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) first: what the project is, commands, rules, current state. Full reference: [DOCUMENTATION.md](DOCUMENTATION.md).
2. **Codebase Knowledge Graph:** If present, consult [graphify-out/GRAPH_REPORT.md](graphify-out/GRAPH_REPORT.md) (and `graphify-out/graph.json`) to trace dependencies, call chains, and core components before modifying code or diagnosing bugs.
3. Engineering rules are in [CLAUDE.md](CLAUDE.md) (note: the checked-out copy has merge-conflict markers; the clean one is on `origin/main`). If your tool only reads `CLAUDE.md`, add the line `@AGENTS.md` to it after resolving the conflict.
4. The checked-out branch is stale; the real app is `origin/main`. See PROJECT_CONTEXT.md.
5. **Standing instruction:** after any task that changes code, config, rules, schema, env vars or user-visible behaviour, end the reply with a one-line reminder to update
   `DOCUMENTATION.md` (name the section) and the changelog in `PROJECT_CONTEXT.md`. Remind about the admin dashboard repo (`../site-tracker-admin`) docs when shared Firebase data or rules change.
6. Never commit or push on the user's behalf. Never expose secrets.
