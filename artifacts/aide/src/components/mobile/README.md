# Mobile components

On-site primitives for the FIP technical assistant on a phone or tablet.

## Manuals policy

This directory contains `MyManuals.tsx`, which lets a technician store
their own PDFs on their own device for offline reference.

The rules:

1. **No manufacturer manuals are committed to this repository.** Not in
   `public/`, not in `src/`, not in any branch we ship.
2. **No manufacturer manual content is sent to our backend.** Files
   uploaded via `MyManuals` go to IndexedDB on the device and stay
   there. Backend never sees them.
3. **Manufacturer documentation is reached by linking to the
   manufacturer's own URL.** Every panel model in `data/panel-brands.ts`
   has a `manualHint` field that points the technician at the
   authoritative document on the vendor site. The UI surfaces that link
   on the panel detail; we do not render or proxy the contents.
4. **Architectural reference content** (commissioning notes, wiring
   quirks, fault hint families) is authored in tech voice and stays at
   architectural level. No firmware-version-specific values, no
   alphanumeric fault codes lifted from manuals.

If a future feature suggests breaking any of these rules - flag it and
ask. Do not silently land it.

## Files

- `MobileBottomSheet.tsx` - bottom-anchored sheet for AIDE chat on mobile.
- `PanelIdCapture.tsx` - rear-camera shutter that hands a JPEG to AIDE.
- `BookmarkStar.tsx` / `Bookmarks.tsx` - on-device favourites.
- `MyManuals.tsx` - on-device, user-uploaded PDFs only.
- `SiteNotes.tsx` - per-scope free-text notes, IDB-backed.
