# Barbu Feature Map

This document controls product growth. It is a place to decide what belongs in the app now, what comes next, what is deliberately later, and what should not be built yet.

## Product North Star

Barbu is an iPhone-first learning app for classic card games. The player sits at Barbu's table against the King of Cards, learns one decision at a time, and gradually moves from guided tricks to confident play.

The app should feel like a real tutor:

- Short sessions.
- Clear next step.
- Immediate feedback.
- Rules explained through decisions.
- Reference material available when needed, not used as the main experience.

## Current Feature Set

- Game catalog with Barbu as the first playable table.
- Barbu table with contract entry points.
- Five-step training path: concept, example, guided trick, practice, review.
- Local course progress for the playable Barbu path.
- Continue action for the next unfinished step.
- Completed-course state with review and reset actions.
- No Hearts course content with concept, example, guided play, and review screens.
- Guided trick table for authored Barbu lessons.
- Authored lessons for No Hearts, No Queens, and King of Hearts.
- Compact outcome labels for guided decisions.
- Generated No Hearts follow-suit drill via Rust/Tauri.
- Browser fallback for generated drills when Tauri is unavailable.
- Playwright smoke tests for catalog, Barbu table, lesson flow, generated fallback, and course-complete behavior.

## Near-Term Roadmap

These are the next product increments that keep the app coherent.

1. Course Content v1
   - Expand real lesson nodes beyond the first No Hearts course.
   - Add one concept screen before each guided trick.
   - Add one review screen after each contract.
   - Keep copy short and original.

2. Outcome Model in Core
   - Move decision grading out of string matching in Svelte.
   - Return structured outcomes from lesson data or Rust: correct, safe, risky, illegal, penalty.
   - Use the same model for authored and generated practice.

3. Generated Practice Expansion
   - Add generated drills for No Queens and King of Hearts.
   - Keep commands thin and deterministic.
   - Add Rust tests for every drill generator.

4. Progress Model v2
   - Store completion by lesson node, not only path step.
   - Track attempts, last result, and review due state.
   - Keep it local until the app needs sync or accounts.

5. Reference Layer v1
   - Add Parlett-style structured reference pages from `content/`.
   - Include object, players, cards, deal, play, scoring, variants, and tactical ideas.
   - Link reference sections from lessons without making rules pages the main flow.

## Later Roadmap

- Full Barbu hand practice.
- Barbu opponent behavior and table persona.
- More Barbu contracts.
- Hearts-family expansion.
- Whist-family expansion.
- Bridge-family expansion.
- Entitlements and paid packs.
- iOS simulator smoke tests.
- StoreKit sandbox tests.

## Explicit Non-Goals For Now

- No full multiplayer.
- No account system.
- No cloud sync.
- No subscription plumbing.
- No large decorative redesign.
- No AI opponent until rules, scoring, and lesson progression are stable.
- No copying wording, characters, art direction, or lesson content from Duolingo, chess apps, or books.

## Design Rules

- The first screen is always the learning experience, not marketing.
- Every new feature should answer: what is the next useful card decision?
- Add game logic to Rust when it affects legality, scoring, outcomes, generation, or reusable lesson state.
- Keep Svelte focused on presentation and interaction.
- Keep Barbu's voice concise. Personality should clarify, not distract.
- Prefer one strong path over many disconnected screens.

## Feature Intake Checklist

Before adding a feature, answer:

1. Does this help a beginner learn a card game faster?
2. Does it fit the concept, example, guided play, practice, review loop?
3. Does it belong in Rust, content, Tauri, or Svelte?
4. Can it be tested with Rust tests or Playwright?
5. Is it needed before full Barbu hand practice?

If the answer is unclear, put the idea in the parking lot.

## Parking Lot

- Streaks and daily goals.
- Achievements.
- Cosmetic card backs.
- Animated Barbu avatar.
- Sound effects and haptics.
- Leaderboards.
- Social sharing.
- Adaptive difficulty.
- Spaced repetition scheduling.
- Monetized expansion packs.
