# Bottom Sheet Dynamic Sizing

Patterns for `@gorhom/bottom-sheet` with `enableDynamicSizing` — auto-sizing sheets that adapt to each step's content height.

## When to Use

Use `enableDynamicSizing` when:
- Multi-step wizard where each step has **different content height**
- Sheet should hug content (not use fixed snap points like `["50%", "85%"]`)
- Back navigation should resize the sheet to the previous step's height

## Core Principle: Conditional Rendering

`enableDynamicSizing` measures content's **natural height** to size the sheet. Only render the active step so gorhom measures one step at a time and re-measures on every transition.

```tsx
// ✅ GOOD: Conditional rendering — gorhom re-measures each step
<BottomSheet enableDynamicSizing maxDynamicContentSize={maxHeight}>
  {step === 0 && <StepOne />}
  {step === 1 && <StepTwo />}
  {step === 2 && <StepThree />}
</BottomSheet>

// ❌ BAD: Horizontal slider — gorhom measures ALL steps (tallest wins)
<BottomSheet enableDynamicSizing>
  <Animated.View style={{ flexDirection: "row", width: stepWidth * 3 }}>
    <View style={{ width: stepWidth }}><StepOne /></View>
    <View style={{ width: stepWidth }}><StepTwo /></View>
    <View style={{ width: stepWidth }}><StepThree /></View>
  </Animated.View>
</BottomSheet>
```

## BottomSheetView vs BottomSheetScrollView

| Content fits on screen? | Component | Behavior |
|--------------------------|-----------|----------|
| Yes (3 cards, short form) | `BottomSheetView` | Sheet sizes to natural content height |
| No (5+ cards, long list) | `BottomSheetScrollView` | Content scrolls, capped by `maxDynamicContentSize` |

```tsx
// Non-scrollable step — BottomSheetView
<BottomSheetView>
  <StepHeader />
  <View style={s.fitContent}>
    {THREE_OPTIONS.map(opt => <Card key={opt.id} />)}
  </View>
</BottomSheetView>

// Scrollable step — BottomSheetScrollView
<View style={{ flex: 1 }}>
  <StepHeader />
  <BottomSheetScrollView
    style={{ flex: 1 }}
    contentContainerStyle={s.scrollContent}
  >
    {MANY_CARDS.map(card => <Card key={card.id} />)}
  </BottomSheetScrollView>
</View>
```

## maxDynamicContentSize: Prevent Full-Screen Overlap

Always cap with actual layout boundaries, not percentages:

```tsx
const { height: screenHeight } = useWindowDimensions();
const insets = useSafeAreaInsets();

// ✅ Inset-aware — works on notch, no-notch, iPad, landscape
const maxSheetHeight = screenHeight - insets.top - 56 - 16;
//                     └─ screen     └─ status bar
//                                      └─ stack header
//                                            └─ breathing room

// ❌ Percentage-based — fragile across devices/orientations
const maxSheetHeight = screenHeight * 0.85;
```

## Critical Rule: No Fixed Footer + enableDynamicSizing

`flex: 1` has **no intrinsic height** — gorhom can't measure it. A footer outside the scroll view ends up floating in the middle of the sheet with empty space below.

```tsx
// ❌ BAD: flex:1 wrapper — footer floats in the middle
<View style={{ flex: 1 }}>
  <Header />
  <BottomSheetScrollView style={{ flex: 1 }}>
    {content}
  </BottomSheetScrollView>
  <Footer paddingBottom={100} />  {/* ← empty space below */}
</View>

// ✅ GOOD: Button inside scroll view — measurable content height
<View>
  <Header />
  <BottomSheetScrollView contentContainerStyle={{ paddingBottom: bottomPadding }}>
    {content}
    <SaveButton />  {/* ← naturally at end of scroll content */}
  </BottomSheetScrollView>
</View>
```

**Why?** `enableDynamicSizing` asks "how tall is your content?" to size the sheet. `flex: 1` answers "as tall as my parent gives me" — circular. So gorhom sums all children's natural heights (header + scroll content + footer padding), sizes the sheet to that, and `flex: 1` becomes a no-op. The footer sits right after content with padding below, not pinned to the bottom.

## Bottom Padding for Tab Bar Clearance

Scrollable steps need `bottomPadding` on `contentContainerStyle` (not `style`) so the last item clears the tab bar:

```tsx
const insets = useSafeAreaInsets();
const bottomPadding = 68 + insets.bottom; // tab bar + safe area

<BottomSheetScrollView
  contentContainerStyle={[s.scrollContent, { paddingBottom: bottomPadding }]}
>
```

## Decision Table: Dynamic vs Fixed Snap Points

| Need | Fixed Snap Points | enableDynamicSizing |
|------|-------------------|---------------------|
| Sheet hugs content per step | No | Yes |
| Slide animation between steps | Yes (Pattern A) | No (instant switch) |
| Different scroll per step | Hard | Easy |
| Back navigation resizes | No | Yes |
| Pinned footer outside scroll | Yes | No (put inside scroll) |

## Reference Implementation

- `apps/mobile/src/components/nutrition/goals/wizard/` — 4-step goal wizard
  - Steps 1-2: `BottomSheetView` (non-scrollable, fit-to-content)
  - Steps 3-4: `BottomSheetScrollView` (scrollable, capped by `maxDynamicContentSize`)
  - Save button inside scroll view for proper sizing
  - Inset-aware `maxDynamicContentSize` prevents stack header overlap
