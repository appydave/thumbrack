# UAT Plan — ThumbRack Wave 1

**Date**: 2026-03-08
**Test folder**: `/Users/davidcruwys/Downloads` (14 sorted PNG images, 01–14 prefix)

---

## UAT-01: App Loads
- Navigate to `http://localhost:5020`
- **Expect**: Page title contains "ThumbRack", directory input is visible, Load button is visible

## UAT-02: Load a Folder
- Type `/Users/davidcruwys/Downloads` into the directory input
- Click Load
- **Expect**: 14 items appear in the sorted pane

## UAT-03: Sorted Pane Shows Correct Items
- After loading Downloads folder
- **Expect**: Items are numbered 01–14, thumbnails are visible (not broken), labels match filenames

## UAT-04: Image Preview
- Click on image "01-ecamm-finding-hidden-api-title-slide.png"
- **Expect**: Preview pane shows the image, filename label appears below

## UAT-05: Unsorted Pane Is Empty (or has items)
- After loading Downloads
- **Expect**: Unsorted section shows "No unsorted images" (all 14 have NN- prefix)

## UAT-06: Manual Number Entry
- Select image 01, click its number badge "01"
- Type "14" and press Enter
- **Expect**: The file is renamed, list reloads, item now appears at position 14

## UAT-07: Regenerate Button
- With folder loaded, click Regenerate button
- **Expect**: Button is enabled, toast notification "Manifest regenerated" appears

## UAT-08: Keyboard Navigation
- With sorted list loaded and first item selected
- Press ArrowDown
- **Expect**: Selection moves to second item, preview updates

## UAT-09: API Health — Folder Endpoint
- Direct API call: GET `http://localhost:5021/api/folder?path=/Users/davidcruwys/Downloads`
- **Expect**: 200 response with sorted array of 14 images

## UAT-10: API Health — Image Serving
- After folder load, pick an encodedPath from the response
- Fetch `http://localhost:5021/api/images/{encodedPath}`
- **Expect**: 200 response with image content-type
