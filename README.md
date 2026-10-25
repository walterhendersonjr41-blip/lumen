# Lumen

A small glowing guide stands inside a photo. Tell it to change the picture ("open the garage, then pop the hood") or ask what it sees — even past the edge of the frame, or looking back toward you.

## Use it
- **Free, no key, no sign-up:** pick a built-in scene (Night pump, Corner grocery, Flat tire) or drop, paste, or upload your own photo, then ask anything or type an edit.
  - Questions: Lumen checks the photo in your browser (COCO-SSD object detection via TensorFlow.js, plus light and colour stats) and sends those facts, never the photo, to the free Pollinations text AI.
  - Edits: without a key, an edit becomes a **free AI redraw** (Pollinations image), a new picture painted from the scene plus your edits. It is labelled as a redraw, not a pixel-exact edit, and goes on the Undo stack. Free images may carry a small Pollinations mark.
- **Optional, exact edits:** tap the key button and paste **your own** xAI API key (from console.x.ai) for true vision answers and pixel-exact edits. The key is saved only in your browser's localStorage and sent only to `api.x.ai`. No key is included in this site.
- Chain commands with "then". Undo, Export (download the current image), Hear (reads the reply aloud), and a mic for voice input where the browser supports it.

## Files
`index.html`, `style.css`, `scenes.js` (built-in scenes and their descriptions), `app.js`, `scenes/`, `favicon.svg`, `og.jpg`. Plain static files with relative paths, no build step. Works from a GitHub Pages subpath.

Live mode defaults to `grok-4.3` for vision chat and `grok-imagine-image-2.0` for edits; both can be changed in the key settings.
