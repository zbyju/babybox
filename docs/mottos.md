# Mottos

How we decide when two options both work. Read this before you plan, implement
or review anything. When a decision here is challenged, record the outcome in
[decisions.md](decisions.md).

1. **Prefer simplicity.** Don't build for a future we don't have yet. A feature that
   is half working with simple code beats a full feature with complicated code.
2. **Safe changes, not perfect ones.** Nothing we ship may break a running babybox.
   But don't over-protect existing flows either; if an old path is wrong, fix it.
3. **Every babybox must be able to update to this version.** Boxes run `git pull`,
   `pnpm install` and `pnpm build` unattended, then restart. Anything that can fail
   in that path on an old box is a blocker.
4. **Type-safe and straightforward.** One shape, written once, checked by the
   compiler. No `any` escape hatches, no second hand-written copy of a type.
5. **Write it down.** Decisions go to [decisions.md](decisions.md), things we learned
   the hard way go to [learnings.md](learnings.md). Read both before starting work
   and use them to make the next decision better.
6. **Opus models do the implementation.** Reviews and mechanical steps may use other
   models; code that ships is written by an Opus agent.
7. **Push back.** Reviewers challenge, implementers may disagree with reasons.
   Agreement without a reason is worth nothing.
