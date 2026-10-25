# Lumen

A small glowing guide stands inside a photo. Tell it to change the picture ("open the garage, then pop the hood") or ask what it sees — even past the edge of the frame, or looking back toward you.

## Use it
- Three demo scenes (Night pump, Corner grocery, Flat tire) work offline: every suggestion chip has a built-in answer.
- Drop, paste, or upload your own photo, or type any question or edit. For that live mode, tap the key button and paste **your own** xAI API key (from console.x.ai). The key is saved only in your browser's localStorage and sent only to `api.x.ai`. No key is included in this site.
- Chain commands with "then". Undo, Export (download the current image), Hear (reads the reply aloud), and a mic for voice input where the browser supports it.

## Files
`index.html`, `style.css`, `scenes.js` (demo scenes and canned replies), `app.js`, `scenes/`, `favicon.svg`, `og.jpg`. Plain static files with relative paths, no build step. Works from a GitHub Pages subpath.

Live mode defaults to `grok-4.3` for vision chat and `grok-imagine-image-2.0` for edits; both can be changed in the key settings.
