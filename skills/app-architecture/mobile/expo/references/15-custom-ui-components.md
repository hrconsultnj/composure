# Custom UI Components — Themed Alternatives to Native Controls

NutriJourney mobile uses **custom-built, fully-themed components** instead of native controls or third-party pickers. This ensures visual consistency, dark/light mode support, and a premium UX that matches the app's brand identity.

**Philosophy**: Every user-facing control should feel like it belongs to the app, not the OS. Native pickers look generic and break the immersion. Custom components give us full control over theming, animation, accessibility, and behavior.

---

## Table of Contents

- [BottomSheetModal vs BottomSheet — When to Use Which](#bottomsheetmodal-vs-bottomsheet)
- [CalendarPickerSheet — Custom Date Picker](#calendarpickersheet)
- [DateNavigator — Day-by-Day Navigation + Calendar](#datenavigator)
- [TagSheet — Tag Creation Sheet](#tagsheet)
- [Branded Dialog — Alert Replacement](#branded-dialog)
- [SearchPickerModal — Address-Picker Autocomplete](#searchpickermodal)
- [Component Inventory](#component-inventory)
- [Anti-Patterns](#anti-patterns)

---

## BottomSheetModal vs BottomSheet

**Critical distinction** from `@gorhom/bottom-sheet`:

| Feature | `BottomSheet` | `BottomSheetModal` |
|---------|--------------|-------------------|
| Rendering | Inline in React tree | Portal via `BottomSheetModalProvider` |
| Z-index | Inherits from parent | Renders above everything |
| Inside FlatList/ScrollView | **Broken** (clipped, gesture conflicts) | **Works** (portal escapes parent) |
| Open API | `.snapToIndex(0)` / `.expand()` | `.present()` |
| Close API | `.close()` | `.dismiss()` |
| Dynamic sizing | `enableDynamicSizing` | `enableDynamicSizing` |
| Content wrapper | `BottomSheetScrollView` | `BottomSheetView` or `BottomSheetScrollView` |

### When to Use BottomSheetModal

Use `BottomSheetModal` when the sheet is:
- Rendered inside a `FlatList` header or `ScrollView`
- Triggered by a component nested deep in the view hierarchy
- A standalone picker/selector (calendar, tags, filters)
- Something that should always render above everything (modals, alerts)

### When to Use BottomSheet

Use regular `BottomSheet` when:
- The sheet is the main content area of a screen (e.g., NoteSheet, AddDrinkSheet)
- It uses `index={-1}` with `enablePanDownToClose` for toggle behavior
- It's a direct child of the screen (not nested inside lists)

### Provider Setup

`BottomSheetModalProvider` must be inside `GestureHandlerRootView`:

```tsx
// app/_layout.tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <KeyboardProvider>
    <AppProviders>  {/* BottomSheetModalProvider is inside here */}
      <Slot />
    </AppProviders>
  </KeyboardProvider>
</GestureHandlerRootView>

// src/providers/app-providers.tsx
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

<LoadingProvider>
  <NotificationProvider>
    <BottomSheetModalProvider>
      {children}
    </BottomSheetModalProvider>
  </NotificationProvider>
</LoadingProvider>
```

### Common Sheet Chrome (Reusable Styling)

All bottom sheets follow this visual pattern:

```tsx
<BottomSheetModal
  ref={sheetRef}
  enablePanDownToClose
  enableDynamicSizing
  backdropComponent={renderBackdrop}
  backgroundStyle={{
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: isDark ? colors.border : `${colors.primary}25`,
    borderBottomWidth: 0,
  }}
  handleIndicatorStyle={{
    backgroundColor: colors.textMuted,
    width: 40,
    height: 4,
  }}
>
```

Backdrop pattern (reuse everywhere):

```tsx
const renderBackdrop = useCallback(
  (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      disappearsOnIndex={-1}
      appearsOnIndex={0}
      opacity={0.4}
    />
  ),
  [],
);
```

---

## CalendarPickerSheet

**Replaces**: Native `DateTimePicker`, third-party calendar libraries

**Location**: `src/components/common/calendar-picker-sheet.tsx`

Custom month-grid calendar in a `BottomSheetModal`. Fully themed, supports min/max date bounds, and dynamically sizes to content.

### Features
- Month grid with 7-column day layout (14.28% width cells)
- Month navigation arrows with bounds checking
- **Month title pressable** — tap to jump back to current month (text turns `colors.primary` when viewing past month as a hint)
- Selected day = primary background, today = primary border ring, disabled = muted
- "Jump to Today" button when not on today
- `enableDynamicSizing` — no fixed snap points

### Props

```tsx
interface CalendarPickerSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  selectedDate: string;          // YYYY-MM-DD
  onDateSelect: (date: string) => void;
  minDate?: string;              // Defaults to 90 days ago
  maxDate?: string;              // Defaults to today
}
```

### Usage Pattern (Fragment Self-Containment)

The calendar is always paired with `DateNavigator` — consumers never render it directly. DateNavigator uses a Fragment pattern to render both the nav bar and the calendar sheet together:

```tsx
// Inside DateNavigator — consumers get the calendar for free
<>
  <View style={s.container}>
    {/* < date > nav bar */}
  </View>
  <CalendarPickerSheet
    sheetRef={calendarRef}
    selectedDate={selectedDate}
    onDateSelect={onDateChange}
    minDate={minDate}
    maxDate={maxDate}
  />
</>
```

---

## DateNavigator

**Replaces**: Inline date pickers, manual date state management

**Location**: `src/components/common/date-navigator.tsx`

Reusable day-by-day date picker bar with integrated calendar sheet.

### Interactions
- **Tap arrows**: Navigate +/- 1 day
- **Tap date text**: Jump to today (text turns `colors.primary` when not on today as a hint)
- **Long-press date text** (300ms): Opens `CalendarPickerSheet` for jumping to any date

### Props

```tsx
interface DateNavigatorProps {
  selectedDate: string;    // YYYY-MM-DD
  onDateChange: (date: string) => void;
  colors: ThemeColors;
  minDate?: string;        // Earliest allowed date
  maxDate?: string;        // Latest allowed date (default: today)
}
```

### Consumer Comments Convention

Each DateNavigator usage should have a comment explaining where `minDate` comes from:

```tsx
{/* minDate = earliest hydration_logs row from DB (via useEarliestHydrationDate) */}
<DateNavigator ... minDate={earliestDate ?? undefined} />

{/* minDate = earliest sleep_entries row from DB (via useEarliestPolarDate) */}
<DateNavigator ... minDate={earliestPolarDate ?? undefined} />

{/* minDate = default 90 days (no DB query — notes are short-lived) */}
<DateNavigator ... />
```

### Earliest Date Hook Pattern

For data-driven minDate bounds, create a hook that queries the oldest row:

```tsx
export function useEarliestPolarDate() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...sleepEntryKeys.all, "earliest", user?.id ?? ""],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sleep_entries")
        .select("date")
        .eq("user_id", user!.id)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.date ?? toLocalDateString(new Date());
    },
    staleTime: 10 * 60 * 1000,
    gcTime: CACHE_TIMES.OFFLINE,
    networkMode: "offlineFirst",
    enabled: !!user,
  });
}
```

**Used by**: Hydration (`useEarliestHydrationDate`), Polar (`useEarliestPolarDate`)

---

## TimePickerSheet

**Replaces**: Native `DateTimePicker` time dialog (Android), raw `<Modal>` wrapper (iOS)

**Location**: `src/components/nutrition/sleep-recovery/add-sleep-sheet/components/time-picker-sheet.tsx`

Custom time picker in a `BottomSheetModal`. iOS uses native `DateTimePicker` spinner (renders inline). Android uses a custom 3-column scroll-wheel picker (Hour : Minute AM/PM) since `@react-native-community/datetimepicker` v8.4.4 **cannot render inline on Android** — all display modes open as native dialogs.

### Features
- **iOS**: Native `DateTimePicker` spinner wheels inside themed BottomSheetModal
- **Android**: Custom `WheelColumn` scroll picker — `ScrollView` + `snapToInterval` + center selection indicator
- **Both**: Bed/wake tab pills with live formatted times, "Done" button, tablet side-by-side layout
- `enableContentPanningGesture={false}` — **critical** to prevent gesture conflicts (see below)

### Gesture Conflict Fix

**Problem**: BottomSheetModal wraps content with a `PanGestureHandler` that intercepts vertical gestures, preventing native spinner wheels and ScrollView-based wheel pickers from scrolling.

**Solution**: `enableContentPanningGesture={false}` on the BottomSheetModal. This disables the sheet's gesture handling on the content area, so picker wheels receive all touch events. The user can still dismiss via:
- Handle bar drag
- Backdrop tap
- "Done" button

```tsx
<BottomSheetModal
  ref={sheetRef}
  enablePanDownToClose
  enableDynamicSizing
  enableContentPanningGesture={false}  // ← prevents gesture conflicts with scroll wheels
  backdropComponent={renderBackdrop}
>
```

**When to use this pattern**: Any BottomSheetModal containing scrollable/pannable native content — time pickers, signature pads, scroll-wheel selectors, draggable elements.

### Props

```tsx
interface TimePickerSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  activeTab: "bed" | "wake";
  bedtime: Date;
  wakeTime: Date;
  isWideScreen: boolean;
  colors: ThemeColors;
  onBedtimeChange: (date: Date) => void;
  onWakeTimeChange: (date: Date) => void;
  onActiveTabChange: (tab: "bed" | "wake") => void;
}
```

### Android WheelColumn Architecture

Each column is a `ScrollView` with:
- Fixed `ITEM_HEIGHT` (50px), 5 visible items
- `snapToInterval={ITEM_HEIGHT}` + `decelerationRate="fast"`
- Content padding = `PADDING_ITEMS * ITEM_HEIGHT` (centers first/last items)
- Center selection indicator (translucent border + background)
- `isScrollingRef` prevents feedback loops between scroll events and programmatic scroll updates
- 12-hour format (matches `formatTime` helper): hours 1-12, minutes 00-59, AM/PM

### Usage Pattern

Always mounted, opened via `.present()` from the parent:

```tsx
const timePickerRef = useRef<BottomSheetModal>(null);

// Open for bedtime
setActiveTimePicker("bed");
timePickerRef.current?.present();

// Always rendered (not conditional)
<TimePickerSheet
  sheetRef={timePickerRef}
  activeTab={activeTimePicker ?? "bed"}
  bedtime={bedtime}
  wakeTime={wakeTime}
  isWideScreen={isWideScreen}
  colors={colors}
  onBedtimeChange={setBedtime}
  onWakeTimeChange={setWakeTime}
  onActiveTabChange={setActiveTimePicker}
/>
```

---

## TagSheet

**Replaces**: Inline tag creation forms, alert-based input

**Location**: `src/components/common/tag-sheet.tsx`

Tag creation sheet with name input, 8 preset color circles, and themed create button. Uses `BottomSheetModal` so it works when triggered from any context (including inside other sheets or FlatLists).

### Props

```tsx
interface TagSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  onTagCreated?: (tag: { id: string; name: string; color: string | null }) => void;
  onCreateTag: (name: string, color: string) => Promise<{ ... } | undefined>;
}
```

### Preset Colors

```tsx
const TAG_PRESET_COLORS = [
  "#6366f1", "#EF4444", "#F59E0B", "#10B981",
  "#3B82F6", "#8B5CF6", "#EC4899", "#06B6D4",
];
```

### Usage Pattern

Always mounted (never conditionally rendered). Open via `.present()`:

```tsx
const tagSheetRef = useRef<BottomSheetModal>(null);

// Open
tagSheetRef.current?.present();

// Always render (not conditional)
<TagSheet
  sheetRef={tagSheetRef}
  onTagCreated={handleTagCreated}
  onCreateTag={handleCreateTag}
/>
```

---

## Branded Dialog

**Replaces**: `Alert.alert()` (native dialog)

**Location**: `src/components/common/branded-dialog/`

Custom dialog system that matches the app theme. Uses the `useBrandedDialog` hook.

```tsx
const { showDialog, DialogPortal } = useBrandedDialog();

// Usage
showDialog({
  title: "Archive Note?",
  message: "This note will be moved to your archive.",
  confirmLabel: "Archive",
  confirmVariant: "destructive",
  onConfirm: () => handleArchive(noteId),
});

// Render the portal at the end of the component
<DialogPortal />
```

---

## SearchPickerModal

**Replaces**: Inline `TextInput` + results list inside BottomSheets (keyboard covers results)

**Location**: `src/components/common/search-picker-modal.tsx`

FloatingActionBar-style search pill at the bottom with results floating above — like Uber/Google Maps address autocomplete. Uses `<Modal>` to render above BottomSheets, `KeyboardStickyView` for keyboard-aware positioning.

### Architecture (3 patterns combined)

| Pattern from | What we take |
|---|---|
| **FloatingActionBar** | `KeyboardStickyView`, `ADJUST_NOTHING`, search pill styling (48px, radius 24), close button |
| **BrandedDialog** | `<Modal transparent statusBarTranslucent>` — renders above BottomSheet natively |
| **DateNavigator** | "Compact trigger → opens full picker" interaction (tap → modal) |

### Layout

```
┌──────────────────────────────────┐
│      (dimmed backdrop — tap      │
│       to dismiss)                │
├──────────────────────────────────┤
│  Liquid IV Hydration             │  ← results card floats
│  Brand: Liquid IV                │    above the search pill
│──────────────────────────────────│
│  Gatorade Zero                   │
│  Brand: Gatorade                 │
├──────────────────────────────────┤
│  🔍  Search drinks, brands...  [X]│ ← search pill + close (keyboard-sticky)
├──────────────────────────────────┤
│          KEYBOARD                │
└──────────────────────────────────┘
```

### Key Behaviors

- **Keyboard dismiss = close modal**: `keyboardDidHide` calls `onDismiss()`. `keyboardShouldPersistTaps="handled"` keeps keyboard open when tapping results.
- **Self-contained query state**: Modal owns TextInput value, emits via `onQueryChange`. Parent drives TanStack Query.
- **Results card only when definitive**: `!isQueryShort && results !== undefined`. No card when < 2 chars.

### Consumer Pattern — Trigger + Modal

```tsx
const [modalVisible, setModalVisible] = useState(false);

// Trigger (looks like an input)
<Pressable onPress={() => setModalVisible(true)} style={s.inputRow}>
  <SearchIcon size={16} color={colors.textMuted} />
  <Text style={s.placeholderText}>Search drinks, brands...</Text>
</Pressable>

// Modal
<SearchPickerModal
  visible={modalVisible}
  onDismiss={() => { setModalVisible(false); onSearchChange(""); }}
  onQueryChange={onSearchChange}
  results={mappedResults}
  onSelect={(item) => { onSelect(item); setModalVisible(false); }}
/>
```

---

## NumericPickerSheet

**Replaces**: `TextInput` with `keyboardType="decimal-pad"` for numeric values (height, weight, etc.)

**Location**: `src/components/common/numeric-picker-sheet.tsx`

**Architecture**: Reuses the **WheelColumn** scroll-picker pattern from `TimePickerSheet` (ScrollView + snapToInterval + center selection indicator). Wrapped in `BottomSheetModal` with `enableContentPanningGesture={false}` to avoid gesture conflicts with scroll wheels.

### Three Modes

| Mode | Columns | Use Case |
|------|---------|----------|
| `integer` | Single whole-number column | Height in cm (100–250) |
| `decimal` | Whole + `.` + tenths | Weight in kg/lbs (20.0–300.9) |
| `height-imperial` | Feet (3–7) + Inches (0–11) | Height in ft'in" |

### Props

```tsx
interface NumericPickerSheetProps {
  sheetRef: React.RefObject<BottomSheetModal | null>;
  mode: "integer" | "decimal" | "height-imperial";
  value: number;                    // cm, total inches (imperial height), kg/lbs
  onValueChange: (value: number) => void;
  label: string;                    // Header text
  icon?: string;                    // MDI icon in header
  unit?: string;                    // Suffix (e.g., "kg", "cm")
  min?: number;                     // Default: 0
  max?: number;                     // Default: 999
}
```

### Key Behaviors

- **Draft state**: Wheel changes update a local draft. Value is committed on "Done" tap — no debounce needed.
- **Unit conversion in consumer**: The picker works in display units. Consumer handles conversion (e.g., lbs → kg on save).
- **enableContentPanningGesture={false}**: Required so scroll wheels receive all touch events (same pattern as TimePickerSheet).

### Consumer Pattern — Tap Row + Picker Sheet

```tsx
const pickerRef = useRef<BottomSheetModal>(null);

// Tap row opens the picker
<Pressable onPress={() => pickerRef.current?.present()}>
  <Text>Weight: 75.5 kg</Text>
</Pressable>

// Picker sheet (rendered outside ScrollView)
<NumericPickerSheet
  sheetRef={pickerRef}
  mode="decimal"
  value={75.5}
  onValueChange={(v) => saveBiometric({ weight_kg: v })}
  label="Weight"
  icon="mdi:scale-bathroom"
  unit="kg"
  min={20}
  max={300}
/>
```

### When to Use

- Any numeric field where the user picks from a range (height, weight, servings, quantities)
- Replaces `TextInput` + `keyboardType="decimal-pad"` + debounce timers
- Better UX on both platforms — no keyboard popup, visual scroll wheels

---

## Component Inventory

### Custom Replacements

| Native/Generic | Custom Component | Location |
|---------------|-----------------|----------|
| `DateTimePicker` (date) | `CalendarPickerSheet` | `common/calendar-picker-sheet.tsx` |
| `DateTimePicker` (time) | `TimePickerSheet` | `sleep-recovery/add-sleep-sheet/components/time-picker-sheet.tsx` |
| Manual date nav | `DateNavigator` | `common/date-navigator.tsx` |
| `Alert.alert()` | `useBrandedDialog` | `common/branded-dialog/` |
| Native tag input | `TagSheet` | `common/tag-sheet.tsx` |
| `ActivityIndicator` | `useLoading()` overlay | `providers/layout/loading-provider.tsx` |
| Generic weather | `WeatherBar` | `common/weather-bar.tsx` |
| `Picker` / select | `SelectRow` | `nutrition/profile/setting-row.tsx` |
| Search in BottomSheet | `SearchPickerModal` | `common/search-picker-modal.tsx` |
| `TextInput` (numeric) | `NumericPickerSheet` | `common/numeric-picker-sheet.tsx` |

### Sheet Header Pattern

Sheets with date context should show a formatted date subtitle:

```tsx
<View style={s.header}>
  <View>
    <Text style={[s.title, { color: colors.text }]}>
      {isEditMode ? "Edit Note" : "New Note"}
    </Text>
    {selectedDate && (
      <Text style={[s.dateSubtitle, { color: colors.textSecondary }]}>
        {parseDateLocal(selectedDate).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>
    )}
    {/* Storage indicator or other subtitle */}
  </View>
  <TouchableOpacity onPress={() => sheetRef.current?.close()} hitSlop={12}>
    <Icon icon="mdi:close" size={22} color={colors.textMuted} />
  </TouchableOpacity>
</View>
```

---

## Anti-Patterns

### Never Do This

```tsx
// ❌ Native DateTimePicker — looks like iOS/Android, not the app
import DateTimePicker from "@react-native-community/datetimepicker";

// ❌ Alert.alert — generic OS dialog
Alert.alert("Confirm", "Are you sure?", [{ text: "OK" }]);

// ❌ Inline ActivityIndicator for screen loading
if (isLoading) return <View><ActivityIndicator /></View>;

// ❌ Conditional rendering of BottomSheetModal (timing issues)
{showSheet && <TagSheet sheetRef={ref} />}

// ❌ Regular BottomSheet inside a FlatList header (z-index/gesture issues)
<FlatList ListHeaderComponent={<BottomSheet>...</BottomSheet>} />

// ❌ useEffect + snapToIndex for opening sheets (race condition)
useEffect(() => { if (show) sheetRef.current?.snapToIndex(0); }, [show]);

// ❌ Scrollable content inside BottomSheetModal without disabling content panning
// (spinner wheels, scroll pickers, signature pads won't receive touch events)
<BottomSheetModal ref={ref} enableDynamicSizing>
  <DateTimePicker display="spinner" />  {/* gestures stolen by sheet */}
</BottomSheetModal>

// ❌ TextInput + results list inside a BottomSheet (keyboard covers results)
<BottomSheet>
  <TextInput onChangeText={setQuery} />
  <FlatList data={results} />  {/* hidden behind keyboard! */}
</BottomSheet>

// ❌ TextInput with keyboardType="decimal-pad" for numeric values (height, weight)
// — keyboard covers content, requires debounce timers, error-prone text parsing
<TextInput keyboardType="decimal-pad" onChangeText={handleHeightChange} />
```

### Always Do This

```tsx
// ✅ Custom CalendarPickerSheet — themed, consistent
<CalendarPickerSheet sheetRef={ref} selectedDate={date} onDateSelect={fn} />

// ✅ Branded dialog — matches app theme
showDialog({ title: "Confirm", message: "Are you sure?", ... });

// ✅ Global loading overlay
const { setNavigationLoading } = useLoading();
useEffect(() => { setNavigationLoading(isLoading); }, [isLoading]);

// ✅ Always mounted BottomSheetModal, open via .present()
tagSheetRef.current?.present();
<TagSheet sheetRef={tagSheetRef} ... />  {/* always rendered */}

// ✅ BottomSheetModal for sheets inside FlatList/ScrollView (portal-based)
<BottomSheetModal ref={ref} enableDynamicSizing>
  <BottomSheetView>...</BottomSheetView>
</BottomSheetModal>

// ✅ enableContentPanningGesture={false} for scrollable native content
<BottomSheetModal ref={ref} enableDynamicSizing enableContentPanningGesture={false}>
  <DateTimePicker display="spinner" />  {/* gestures work! */}
</BottomSheetModal>

// ✅ SearchPickerModal for search inside BottomSheets (address-picker pattern)
<SearchPickerModal
  visible={modalVisible}
  onDismiss={handleDismiss}
  onQueryChange={onSearchChange}
  results={mappedResults}
  onSelect={handleSelect}
/>

// ✅ NumericPickerSheet for height, weight, and numeric range values
<NumericPickerSheet
  sheetRef={pickerRef}
  mode="decimal"
  value={75.5}
  onValueChange={(v) => save(v)}
  label="Weight"
  icon="mdi:scale-bathroom"
  unit="kg"
  min={20} max={300}
/>
```
