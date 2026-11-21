# DESIGN.md — YooNaiDee

Minimal design system for LINE-first AI neighborhood recommendations.

## Principles

1. **LINE-native, web-secondary.** Primary experience happens inside LINE LIFF. Web pages are thin wrappers: show identity, state, and one clear action.
2. **One card per idea.** No dashboards, no grids of panels. A single card holds the whole message.
3. **Neutral surfaces, one accent.** UI stays monochrome (`--primary`, `--muted`, `--border`). Accent color reserved for actions and scores.
4. **Honest states.** Loading, error, and empty states get their own layout — not a spinner over blank space.
5. **Mobile width.** Design target 390px (iPhone). Desktop centers content in a single column.

## Tokens

Reuse existing Tailwind v4 / shadcn tokens in `src/app/globals.css`. No new tokens unless listed here.

| Role | Token | Value |
|---|---|---|
| Page background | `bg-background` | `oklch(1 0 0)` |
| Text | `text-foreground` | `oklch(0.145 0 0)` |
| Subtle text | `text-muted-foreground` | `oklch(0.556 0 0)` |
| Surface | `bg-card` + `border-border` | white / `oklch(0.922 0 0)` |
| Accent (action, score) | `bg-primary` / `text-primary-foreground` | `oklch(0.205 0 0)` |
| Radius | `rounded-xl` | `0.625rem × 1.4` |

Spacing scale: Tailwind default (`p-4`, `p-6`, `gap-2`, `gap-4`). Type scale: `text-xl` title, `text-sm` label, `text-xs` metadata.

## Components

### Homepage

- Use a Bangkok hero image, a forest-green accent, and two clearly labeled navigation cards.
- Stack the image and navigation cards at phone widths. Pair the hero copy with the image on wider screens.
- Link **Profile** to `/profile` and **Current Lifestyle Optimization** to `/recommendations`.

### Recommendations page

- Direct people to the Yoo Nai Dee LINE chat to request recommendations or revisit results delivered there.


### Profile page

- Put the profile title and small LINE avatar at the top, with housing details below the priorities editor.
- Give lifestyle priorities the most prominent card. Show the total out of 100% in the header, then one row per saved category with its name, places, a proportional bar and a numeric percentage field.
- Use emerald for allocation and the primary action. Keep the inputs large enough for mobile touch and require whole percentages and cap the combined allocation at 100%.
- Keep the priority card visible when no categories are available. Put the category picker below the allocation bar and provide a remove action on each row.

### State blocks

Loading / error / waiting use same shell: centered column, `text-sm text-muted-foreground`, optional `text-destructive` for errors. Never blank screen.

## Voice

- Short, plain, no exclamation marks.
- Errors name the failing step: "LIFF init failed", "Profile Error: …".

## Scope

Covers `/`, `/profile`, and `/recommendations`. Flex Message templates live in LINE and follow their own spec.
