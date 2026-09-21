---
name: next-toolchain-topic
description: >-
  Picks up the next open item in the legacy zbyju/babybox toolchain upgrade.
  Use when the user says to pick up the next topic, continue the upgrade,
  continue the toolchain jump, do the next phase, or work the next unchecked
  box in docs/plans/dependency-upgrade.md. Applies only to the legacy
  babybox.git repo, not babybox-mono.
---

# Next toolchain topic

The plan is the source of truth: `docs/plans/dependency-upgrade.md`.

This skill is for `zbyju/babybox` only. Do not edit `babybox-mono`.

## Find the topic

1. Check out `feat/toolchain-jump`. Pull that branch first if the remote has moved.
2. Read the plan from the top through "Safe release", then the "Phases" section.
3. Walk the phase headings in order: P0, then P1, then P2, and so on.
4. The next topic is the first `- [ ]` under the earliest phase that still has one.
5. Ignore checkboxes outside the phase sections. "Open questions" and "Decisions taken" are not topics.
6. If every phase box is `[x]`, stop. Say the plan is complete. Do not invent a next topic.

## Do one topic

Implement that one box. Do not start the next box in the same turn.

Before you edit, re-read the phase that contains the box and "Safe release". Obey both. The plan wins if this skill and the plan disagree.

Hard stops:

- Do not merge to `main`. Do not open a pull request into `main`.
- Do not `git checkout` another branch from a deployed box. Do not add a `legacy` branch switch.
- Do not land a lockfile change unless `bootstrap.js` is already in that same tip.
- Do not start phase N+1 while phase N still has an open box.
- If the box depends on an open question in the plan, stop and ask. Do not guess.
- A Windows 8 hold stays a hold. Exit non-zero. Do not swap `dist`. Do not change the git branch.

## Finish the topic

1. Mark that box `[x]` in the plan.
2. Add one line to the progress log: the date, and what moved.
3. Commit on `feat/toolchain-jump`. The message names the box. The body says why.
4. Do not push unless the user asks.
5. In the reply, name the topic you finished and the next open box. Do not start that next box.
