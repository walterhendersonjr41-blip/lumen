/* Lumen — standalone static build. No server; optional live AI uses the visitor's own xAI key
   (stored only in this browser's localStorage, sent only to api.x.ai). */
(function () {
  "use strict";
  var SCENES = window.LUMEN_SCENES;
  var API = "https://api.x.ai/v1";
  var LS = { key: "lumen.xaiKey", chat: "lumen.chatModel", image: "lumen.imageModel" };
  var DEFAULT_CHAT = "grok-4.3", DEFAULT_IMAGE = "grok-imagine-image-2.0";
  var MAX_UNDO = 8, MAX_HISTORY = 6, MAX_SIDE = 1024;
  var ASK = /^(what|who|where|why|how|when|which|is|are|was|were|does|do|did|can|could|would|whose|tell me|describe|explain)\b|looking my way|toward me|towards me|\?\s*$/i;
  var FREE_BUSY = "The free AI is busy right now. Try again in a minute, or add your own xAI key (key button, top right) for instant answers.";
  var REDRAW_NOTE = "Free AI redraw: a new picture painted from the scene plus your edits, not a pixel-exact edit. For exact edits of the same photo, add your own xAI key (key button, top right).";

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    studio: $("studio"), stage: $("stage"), scan: $("scan"), veil: $("veil"), place: $("place"),
    kicker: $("kicker"), youSaid: $("youSaid"), next: $("next"), say: $("say"), chips: $("chips"),
    form: $("dock"), input: $("command"), send: $("btnSend"), mic: $("btnMic"), undo: $("btnUndo"),
    hear: $("btnHear"), hearLabel: $("hearLabel"), stop: $("btnStop"), exportBtn: $("btnExport"),
    sceneSheet: $("sceneSheet"), sceneGrid: $("sceneGrid"), keySheet: $("keySheet"), keyDot: $("keyDot"),
    keyForm: $("keyForm"), keyInput: $("keyInput"), chatModel: $("chatModel"), imageModel: $("imageModel"),
    keyClear: $("keyClear"), keyStatus: $("keyStatus")
  };

  var state = { scene: "station", src: SCENES.station.src, edited: false, freeEdits: [], freeDesc: "", history: [], undo: [], busy: false, abort: null, lastSay: "" };

  /* ---------- storage ---------- */
  function store(k, v) { try { if (v == null || v === "") localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function apiKey() { return load(LS.key).trim(); }
  function chatModel() { return load(LS.chat).trim() || DEFAULT_CHAT; }
  function imageModel() { return load(LS.image).trim() || DEFAULT_IMAGE; }
  function refreshKeyDot() { el.keyDot.hidden = !apiKey(); }

  /* ---------- bubble ---------- */
  function setBubble(o) {
    el.kicker.hidden = !o.kicker; el.kicker.textContent = o.kicker || "";
    el.youSaid.hidden = !o.you; el.youSaid.textContent = o.you ? "You: " + o.you : "";
    el.next.hidden = !o.next; el.next.textContent = o.next ? "Next: " + o.next : "";
    el.say.textContent = o.say || "";
    if (o.note) { var n = document.createElement("span"); n.className = "note"; n.textContent = o.note; el.say.appendChild(n); }
    if (o.say) state.lastSay = o.say;
  }
  function setBusy(kind) {
    state.busy = !!kind;
    el.studio.dataset.busy = kind || "idle";
    el.scan.hidden = kind !== "edit";
    el.stop.hidden = !kind;
    Array.prototype.forEach.call(el.chips.querySelectorAll(".chip"), function (c) { c.disabled = !!kind; });
    updateSend();
  }
  function updateSend() { el.send.disabled = state.busy || !el.input.value.trim(); el.undo.disabled = state.busy || !state.undo.length; }

  /* ---------- scenes ---------- */
  function renderChips() {
    el.chips.innerHTML = "";
    SCENES[state.scene].chips.forEach(function (t) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "chip"; b.textContent = t;
      b.addEventListener("click", function () { run(t); });
      el.chips.appendChild(b);
    });
  }
  function arrive() {
    el.studio.classList.remove("is-arrived"); void el.studio.offsetWidth; el.studio.classList.add("is-arrived");
  }
  function setScene(id, src) {
    cancel();
    var s = SCENES[id];
    state.scene = id; state.src = src || s.src; state.edited = false; state.history = []; state.undo = []; state.freeEdits = []; state.freeDesc = "";
    el.stage.src = state.src; el.place.textContent = s.place;
    renderChips(); setBubble({ say: s.greeting }); arrive(); updateSend();
    Array.prototype.forEach.call(el.sceneGrid.children, function (c) { c.classList.toggle("is-current", c.dataset.id === id); });
  }
  function renderSceneGrid() {
    ["station", "street", "driveway"].forEach(function (id) {
      var s = SCENES[id], b = document.createElement("button");
      b.type = "button"; b.className = "scene-card"; b.dataset.id = id;
      b.innerHTML = '<img alt="" loading="lazy"><span><strong></strong><em></em></span>';
      b.querySelector("img").src = s.src; b.querySelector("strong").textContent = s.title; b.querySelector("em").textContent = s.place;
      b.addEventListener("click", function () { setScene(id); closeSheets(); });
      el.sceneGrid.appendChild(b);
    });
  }

  /* ---------- sheets ---------- */
  function openSheet(sh) { closeSheets(); sh.hidden = false; }
  function closeSheets() { el.sceneSheet.hidden = true; el.keySheet.hidden = true; }
  [el.sceneSheet, el.keySheet].forEach(function (sh) {
    sh.addEventListener("click", function (e) { if (e.target === sh || e.target.closest("[data-close]")) closeSheets(); });
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSheets(); });
  $("btnScenes").addEventListener("click", function () { openSheet(el.sceneSheet); });
  $("btnKey").addEventListener("click", function () {
    el.keyInput.value = ""; el.keyInput.placeholder = apiKey() ? "Key saved — paste to replace" : "xai-…";
    el.chatModel.value = chatModel(); el.imageModel.value = imageModel(); el.keyStatus.textContent = "";
    openSheet(el.keySheet);
  });
  el.keyForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var k = el.keyInput.value.trim();
    if (k) store(LS.key, k);
    store(LS.chat, el.chatModel.value.trim() === DEFAULT_CHAT ? "" : el.chatModel.value.trim());
    store(LS.image, el.imageModel.value.trim() === DEFAULT_IMAGE ? "" : el.imageModel.value.trim());
    el.keyInput.value = ""; refreshKeyDot();
    el.keyStatus.textContent = apiKey() ? "Saved in this browser. Live AI is on." : "Settings saved. No key yet: free AI is on (it redraws instead of editing exactly).";
  });
  el.keyClear.addEventListener("click", function () {
    store(LS.key, ""); el.keyInput.value = ""; refreshKeyDot();
    el.keyInput.placeholder = "xai-…"; el.keyStatus.textContent = "Key removed from this browser.";
  });

  /* ---------- commands ---------- */
  function splitCommands(text) {
    return text.split(/\s*(?:\bthen\b|;|\n|,?\s+and\s+then\b|\s+and\s+(?=(?:open|close|pop|pump|change|move|add|remove|make|turn|put|paint|light|shut)\b))\s*/i)
      .map(function (s) { return s.replace(/^[\s,.]+|[\s,.]+$/g, ""); }).filter(Boolean);
  }
  function isAsk(cmd) { return ASK.test(cmd.trim()); }
  function cannedAnswer(cmd) {
    var a = SCENES[state.scene].answers, c = cmd.toLowerCase(), k = null;
    if (/looking my way|toward(s)? me|my way|behind me/.test(c)) k = "toward";
    else if (/garage/.test(c)) k = "garage";
    else if (/behind|back of|out back/.test(c)) k = "behind";
    else if (/inside|store|shop|through the (glass|window|door)/.test(c)) k = "store";
    else if (/street|road|down the|out of frame|past the|beyond/.test(c)) k = "street";
    else if (/what do you see|what('s| is) (here|there|in the (photo|picture|frame))|describe|look around/.test(c)) k = "see";
    return k && a[k] ? a[k] : null;
  }
  function cannedEdit(cmd) {
    var e = SCENES[state.scene].edits, c = cmd.toLowerCase().replace(/[.!]+$/, "").trim();
    return e[c] || null;
  }
  function editPhrase(cmd) { var c = cmd.replace(/[.!]+$/, ""); return "I'll " + c.charAt(0).toLowerCase() + c.slice(1) + "."; }

  function run(text) {
    text = (text || "").trim();
    if (!text || state.busy) return;
    el.input.value = ""; updateSend(); stopSpeaking();
    var cmds = splitCommands(text);
    var ctrl = new AbortController(); state.abort = ctrl;
    (function step(i) {
      if (ctrl.signal.aborted || i >= cmds.length) { if (state.abort === ctrl) { state.abort = null; setBusy(null); } return; }
      var cmd = cmds[i], next = cmds[i + 1] || "";
      runOne(cmd, next, ctrl).then(function () { step(i + 1); }, function (err) {
        if (ctrl.signal.aborted) return;
        setBubble({ you: cmd, say: friendlyError(err) });
        state.abort = null; setBusy(null);
      });
    })(0);
  }

  function runOne(cmd, next, ctrl) {
    var key = apiKey();
    if (isAsk(cmd)) {
      var canned = cannedAnswer(cmd);
      if (key && canned && !state.edited) return Promise.resolve(answered(cmd, next, canned));
      if (!key) {
        setBusy("think"); setBubble({ kicker: "Free AI is looking", you: cmd, next: next, say: "…" });
        return freeAsk(cmd, ctrl.signal).then(function (ans) { answered(cmd, next, ans); }, function (e) {
          if (ctrl.signal.aborted) return;
          setBubble({ you: cmd, next: next, say: canned || FREE_BUSY });
        });
      }
      setBusy("think"); setBubble({ kicker: "Reading the frame", you: cmd, next: next, say: "…" });
      return askVision(cmd, ctrl.signal).then(function (ans) { answered(cmd, next, ans); });
    }
    if (!key) {
      setBusy("edit"); setBubble({ kicker: "Free AI is redrawing", you: cmd, next: next, say: editPhrase(cmd) + " This takes about 10 seconds." });
      return freeRedraw(cmd, ctrl.signal).then(function (src) {
        state.undo.push({ src: state.src, edits: state.freeEdits.slice(0, -1), desc: state.freeDesc });
        if (state.undo.length > MAX_UNDO) state.undo.shift();
        state.src = src; state.edited = true; el.stage.src = src;
        var narr = "Here's a fresh picture with your change: " + cmd.replace(/[.!]+$/, "").toLowerCase() + ". Not quite right? Tap Undo or say it another way.";
        setBubble({ you: cmd, next: next, say: narr, note: REDRAW_NOTE }); pushHistory(cmd, narr); arrive();
      }, function (err) {
        state.freeEdits.pop();
        if (ctrl.signal.aborted) throw err;
        setBubble({ you: cmd, next: next, say: "The free image AI didn't answer just now. Try again in a minute, or add your own xAI key for exact edits." });
      });
    }
    setBusy("edit"); setBubble({ kicker: "Rewriting the photograph", you: cmd, next: next, say: editPhrase(cmd) });
    return editImage(cmd, ctrl.signal).then(function (src) {
      state.undo.push(state.src); if (state.undo.length > MAX_UNDO) state.undo.shift();
      state.src = src; state.edited = true; el.stage.src = src;
      var said = editPhrase(cmd).replace(/^I'll /, "Done. I ");
      setBubble({ you: cmd, next: next, say: said.replace(/\.$/, "") + "." });
      pushHistory(cmd, said); arrive(); updateSend();
    });
  }
  function answered(cmd, next, text) { setBubble({ you: cmd, next: next, say: text }); pushHistory(cmd, text); }
  function pushHistory(u, a) {
    state.history.push({ role: "user", content: u }, { role: "assistant", content: a });
    state.history = state.history.slice(-MAX_HISTORY);
  }
  function cancel() { if (state.abort) { state.abort.abort(); state.abort = null; } setBusy(null); }

  function friendlyError(err) {
    var s = err && err.status;
    if (s === 401 || s === 403) return "Your xAI key was refused. Check it in the key settings and try again.";
    if (s === 429) return "xAI says slow down (rate limit or credits). Give it a moment and try again.";
    if (s === 404 || s === 400) return "xAI didn't accept that request" + (err.detail ? ": " + err.detail : ".") + " You can change the model names in key settings.";
    if (err && err.name === "AbortError") return "Stopped. I'm still in the picture.";
    return "I couldn't reach xAI just now. Check your connection and try again.";
  }

  /* ---------- xAI calls (browser → api.x.ai, CORS enabled) ---------- */
  function xai(path, body, signal) {
    return fetch(API + path, {
      method: "POST", signal: signal,
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + apiKey() },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) {}
        if (!r.ok) {
          var err = new Error("xai " + r.status); err.status = r.status;
          var d = j && (j.error && (j.error.message || j.error) || j.message); if (typeof d === "string") err.detail = d.slice(0, 160);
          throw err;
        }
        return j;
      });
    });
  }
  function toJpegDataUrl(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight, s = Math.min(1, MAX_SIDE / Math.max(w, h));
        var c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        try { resolve(c.toDataURL("image/jpeg", 0.88)); } catch (e) { reject(e); }
      };
      img.onerror = function () { reject(new Error("image load failed")); };
      img.src = src;
    });
  }
  var SYSTEM = "You are Lumen, a small glowing guide standing inside the user's photograph. Speak in first person from where you stand in the picture, warm and concrete, in 1 to 3 short sentences. Describe what is visible, and when asked about things past the edge of the frame, behind objects, or looking back toward the viewer, make a plausible, grounded guess that fits the scene and say it as what you see. Never mention being an AI or a model.";
  /* Free keyless AI (no sign-up, no key). The free text AI (Pollinations) can't see pixels, so Lumen
     "looks" at the photo itself in this browser: COCO-SSD object detection (TensorFlow.js) plus light,
     colour and layout stats. Those facts (or the built-in scene's written description) go to the free
     text AI. Edits without a key become a free redraw (Pollinations image), clearly labelled. */
  var POLL_TEXT = "https://text.pollinations.ai/openai", POLL_IMG = "https://image.pollinations.ai/prompt/";
  var TF_URL = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js";
  var COCO_URL = "https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js";
  var MOBILENET_URL = "https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js";
  var lookCache = {}, modelP = null, netP = null;
  function netModel() {
    if (!netP) netP = cocoModel().then(function () { return window.mobilenet ? 0 : loadScript(MOBILENET_URL); })
      .then(function () { return window.mobilenet.load({ version: 2, alpha: 0.5 }); })
      .catch(function (e) { netP = null; throw e; });
    return netP;
  }
  function loadScript(u) { return new Promise(function (ok, bad) { var t = document.createElement("script"); t.src = u; t.async = true; t.onload = ok; t.onerror = function () { bad(new Error("script " + u)); }; document.head.appendChild(t); }); }
  function cocoModel() {
    if (!modelP) modelP = (window.cocoSsd ? Promise.resolve() : loadScript(TF_URL).then(function () { return loadScript(COCO_URL); }))
      .then(function () { return window.cocoSsd.load({ base: "lite_mobilenet_v2" }); })
      .catch(function (e) { modelP = null; throw e; });
    return modelP;
  }
  function colourName(r, g, b) {
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 510, d = mx - mn;
    if (d < 22) return l > .8 ? "white" : l < .18 ? "black" : l > .55 ? "light grey" : "grey";
    var h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
    var n = h < 15 ? "red" : h < 40 ? "orange" : h < 65 ? "yellow" : h < 160 ? "green" : h < 200 ? "teal" : h < 255 ? "blue" : h < 290 ? "purple" : h < 335 ? "pink" : "red";
    if (n === "orange" && l < .4) n = "brown";
    return (l < .3 ? "dark " : l > .72 ? "pale " : "") + n;
  }
  function imgEl(src) { return new Promise(function (ok, bad) { var i = new Image(); i.crossOrigin = "anonymous"; i.onload = function () { ok(i); }; i.onerror = bad; i.src = src; }); }
  function lookAt(src) {
    if (lookCache[src]) return Promise.resolve(lookCache[src]);
    return imgEl(src).then(function (img) {
      var w = 96, h = Math.max(1, Math.round(96 * img.naturalHeight / img.naturalWidth)), c = document.createElement("canvas");
      c.width = w; c.height = h; var x = c.getContext("2d"); x.drawImage(img, 0, 0, w, h);
      var d = x.getImageData(0, 0, w, h).data, sum = 0, bins = {}, top = {}, bottom = {};
      for (var p = 0; p < d.length; p += 4) {
        var r = d[p], g = d[p + 1], b = d[p + 2], name = colourName(r, g, b), row = (p / 4) / w | 0;
        sum += .299 * r + .587 * g + .114 * b; bins[name] = (bins[name] || 0) + 1;
        if (row < h / 3) top[name] = (top[name] || 0) + 1; else if (row > 2 * h / 3) bottom[name] = (bottom[name] || 0) + 1;
      }
      function best(o, k) { return Object.keys(o).sort(function (a, b) { return o[b] - o[a]; }).slice(0, k); }
      var bright = sum / (d.length / 4), facts = [];
      facts.push("Overall light: " + (bright < 60 ? "dark, night or low light" : bright < 110 ? "dim" : bright < 170 ? "normal daylight or indoor light" : "very bright") + ".");
      facts.push("Main colours: " + best(bins, 4).join(", ") + ". Top third mostly " + best(top, 2).join(" and ") + "; bottom third mostly " + best(bottom, 2).join(" and ") + ".");
      facts.push("Shape: " + (img.naturalWidth > img.naturalHeight * 1.1 ? "landscape" : img.naturalHeight > img.naturalWidth * 1.1 ? "portrait" : "square") + " photo.");
      return cocoModel().then(function (m) { return m.detect(img, 12, 0.4); }).then(function (preds) {
        if (preds.length) {
          var counts = {}; preds.forEach(function (q) { counts[q.class] = (counts[q.class] || 0) + 1; });
          var where = preds.slice(0, 8).map(function (q) {
            var cx = (q.bbox[0] + q.bbox[2] / 2) / img.naturalWidth, cy = (q.bbox[1] + q.bbox[3] / 2) / img.naturalHeight, area = q.bbox[2] * q.bbox[3] / (img.naturalWidth * img.naturalHeight);
            return q.class + " (" + (cy < .35 ? "upper " : cy > .65 ? "lower " : "") + (cx < .35 ? "left" : cx > .65 ? "right" : "centre") + (area > .25 ? ", large in frame" : area < .03 ? ", small/far" : "") + ")";
          });
          facts.unshift("Objects detected: " + Object.keys(counts).map(function (k) { return counts[k] > 1 ? counts[k] + " × " + k : k; }).join(", ") + ". Positions: " + where.join("; ") + ".");
        } else facts.unshift("No common objects detected (it may be a landscape, texture, close-up, or document).");
        return netModel().then(function (n) { return n.classify(img, 3); }).then(function (cls) {
          var good = cls.filter(function (c) { return c.probability > 0.08; }).map(function (c) { return c.className.split(",")[0] + " (" + Math.round(c.probability * 100) + "%)"; });
          if (good.length) facts.unshift("Best guesses for the overall picture: " + good.join(", ") + ".");
          return facts.join(" ");
        }, function () { return facts.join(" "); });
      }, function () { return facts.join(" ") + " (Object detection could not load on this device.)"; });
    }).then(function (f) { lookCache[src] = f; return f; });
  }
  function sceneFacts() {
    var s = SCENES[state.scene];
    var base = s && s.answers && s.answers.see && !state.edited ? Promise.resolve(s.title + " (" + s.place + "). " + Object.keys(s.answers).map(function (k) { return s.answers[k]; }).join(" "))
      : lookAt(state.src).then(function (f) { return (state.freeDesc ? "This picture was painted from: " + state.freeDesc + ". " : "") + "What the camera check found: " + f; });
    return base;
  }
  function tfetch(url, opts, ms, outer) {
    var c = new AbortController(), t = setTimeout(function () { c.abort(); }, ms);
    if (outer) { if (outer.aborted) c.abort(); else outer.addEventListener("abort", function () { c.abort(); }); }
    opts.signal = c.signal;
    return fetch(url, opts).then(function (r) { clearTimeout(t); return r; }, function (e) { clearTimeout(t); throw e; });
  }
  function pollText(msgs, signal, onWait) {
    var sys = msgs[0].role === "system" ? msgs.shift().content : "";
    var p = window.AIHelper.ask(sys, msgs, { onWait: onWait });
    return new Promise(function (ok, bad) {
      if (signal) signal.addEventListener("abort", function () { var e = new Error("aborted"); e.name = "AbortError"; bad(e); });
      p.then(function (t) { ok(String(t).replace(/\*\*/g, "").trim()); }, bad);
    });
  }
  function waitNote(sec) { el.kicker.hidden = false; el.kicker.textContent = "Free AI: 1 reply every 30 s · starts in " + sec + " s"; }
  function freeAsk(cmd, signal) {
    return sceneFacts().then(function (facts) {
      var builtIn = !!(SCENES[state.scene].answers && !state.edited && SCENES[state.scene].answers.see);
      var sys = builtIn ? SYSTEM + " You can't see the image directly; this is what is in it, so stay consistent with it: " + facts
        : "You are Lumen, a small glowing guide standing inside the user's photograph. This is what you see from where you stand: " + facts +
          " Always answer, in first person, in 1 to 2 short sentences, describing it as what you see: the scene type, the objects listed and where they are, the light and the main colours. Do not add furniture, rooms, people or objects that are not listed. For anything outside the frame or behind you, give one short, modest guess that fits this scene. Never refuse, never say you can't see, never mention being an AI or a camera check.";
      return pollText([{ role: "system", content: sys }].concat(state.history.slice(-MAX_HISTORY).filter(function (m) { return typeof m.content === "string"; })).concat([{ role: "user", content: cmd }]), signal, waitNote);
    });
  }
  function freeRedraw(cmd, signal) {
    state.freeEdits.push(cmd.replace(/[.!]+$/, ""));
    var s0 = SCENES[state.scene];
    return (state.freeDesc ? Promise.resolve(state.freeDesc)
      : s0 && s0.answers && s0.answers.see && !state.edited ? Promise.resolve(s0.title + ", " + s0.answers.see)
      : lookAt(state.src).then(function (f) { return f.replace(/\s*\(\d+%\)/g, "").replace(/Best guesses for the overall picture: /, "Scene: ").replace(/Positions: [^.]*\.\s*/, "").replace(/Shape: [^.]*\.\s*/, "").slice(0, 400); })
    ).then(function (desc) {
      state.freeDesc = desc;
      return imgEl(state.src).then(function (i) { return [i.naturalWidth, i.naturalHeight]; }, function () { return [1024, 768]; }).then(function (wh) {
        var s = Math.min(1, 1024 / Math.max(wh[0], wh[1])), W = Math.round(wh[0] * s / 16) * 16, H = Math.round(wh[1] * s / 16) * 16;
        var prompt = "Photorealistic photo, same camera angle and lighting. The scene MUST still contain every object here, each in the same place: " + desc +
          ". Apply only these small changes, and keep each changed part attached to its object (an opened car door stays on the car): " + state.freeEdits.join("; ") +
          ". Do not remove, hide or replace any vehicle, person, building or object.";
        var url = POLL_IMG + encodeURIComponent(prompt.slice(0, 900)) + "?width=" + W + "&height=" + H + "&nologo=true&model=sana&referrer=lumen&seed=" + (Math.random() * 1e6 | 0);
        function once() {
          return tfetch(url, {}, 60000, signal).then(function (r) { if (!r.ok) throw new Error("img " + r.status); return r.blob(); })
            .then(function (b) { if (!/^image\//.test(b.type) || b.size < 2000) throw new Error("bad image"); return new Promise(function (ok) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.readAsDataURL(b); }); });
        }
        return once().catch(function () { if (signal && signal.aborted) throw new Error("aborted"); return new Promise(function (r) { setTimeout(r, 4000); }).then(once); });
      });
    });
  }
  function askVision(cmd, signal) {
    return toJpegDataUrl(state.src).then(function (url) {
      var msgs = [{ role: "system", content: SYSTEM }].concat(state.history.slice(-MAX_HISTORY));
      msgs.push({ role: "user", content: [{ type: "image_url", image_url: { url: url, detail: "high" } }, { type: "text", text: cmd }] });
      return xai("/chat/completions", { model: chatModel(), messages: msgs, max_tokens: 220, temperature: 0.7 }, signal);
    }).then(function (j) {
      var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
      if (Array.isArray(t)) t = t.map(function (p) { return p.text || ""; }).join("");
      return (t || "I looked, but nothing came back. Try asking another way.").trim();
    });
  }
  function editImage(cmd, signal) {
    return toJpegDataUrl(state.src).then(function (url) {
      return xai("/images/edits", {
        model: imageModel(), response_format: "b64_json",
        prompt: "Make one small, local change to this exact photograph: " + cmd + ". Change ONLY the object named; an opened door stays attached to its car or building. Do NOT remove, replace or move any vehicle, person, building or object. Same camera angle, framing, lighting and style. Photorealistic.",
        image: { url: url, type: "image_url" }
      }, signal);
    }).then(function (j) {
      var d = j && j.data && j.data[0];
      if (d && d.b64_json) return "data:image/png;base64," + d.b64_json;
      if (d && d.url) return d.url;
      throw new Error("no image");
    });
  }

  /* ---------- photo in ---------- */
  function takeFile(file) {
    if (!file || !/^image\//.test(file.type)) return;
    closeSheets(); setBubble({ kicker: "Listening", say: "Stepping into your photo…" });
    var r = new FileReader();
    r.onload = function () {
      toJpegDataUrl(r.result).then(function (url) {
        setScene("upload", url);
        if (!apiKey()) { setBubble({ say: SCENES.upload.greeting, note: "Free AI is on: ask me anything about this photo, or tell me what to change and I'll redraw it." }); lookAt(url).catch(function () {}); }
      }, function () { setBubble({ say: "I couldn't open that image. Try a JPG or PNG." }); });
    };
    r.readAsDataURL(file);
  }
  ["file1", "file2"].forEach(function (id) { $(id).addEventListener("change", function (e) { takeFile(e.target.files[0]); e.target.value = ""; }); });
  var dragDepth = 0;
  el.studio.addEventListener("dragenter", function (e) { e.preventDefault(); dragDepth++; el.veil.hidden = false; });
  el.studio.addEventListener("dragover", function (e) { e.preventDefault(); });
  el.studio.addEventListener("dragleave", function () { if (--dragDepth <= 0) { dragDepth = 0; el.veil.hidden = true; } });
  el.studio.addEventListener("drop", function (e) { e.preventDefault(); dragDepth = 0; el.veil.hidden = true; takeFile(e.dataTransfer.files[0]); });
  document.addEventListener("paste", function (e) {
    var items = (e.clipboardData && e.clipboardData.files) || [];
    for (var i = 0; i < items.length; i++) if (/^image\//.test(items[i].type)) { e.preventDefault(); takeFile(items[i]); return; }
  });

  /* ---------- composer, undo, export, stop ---------- */
  el.form.addEventListener("submit", function (e) { e.preventDefault(); run(el.input.value); });
  el.input.addEventListener("input", updateSend);
  el.undo.addEventListener("click", function () {
    if (!state.undo.length || state.busy) return;
    var u = state.undo.pop();
    if (typeof u === "string") state.src = u; else { state.src = u.src; state.freeEdits = u.edits; state.freeDesc = u.desc; }
    el.stage.src = state.src; state.edited = state.undo.length > 0;
    setBubble({ say: "Back one step." }); updateSend();
  });
  el.stop.addEventListener("click", function () { cancel(); stopSpeaking(); setBubble({ say: "Stopped. I'm still in the picture." }); });
  el.exportBtn.addEventListener("click", function () {
    var a = document.createElement("a"); a.href = state.src; a.download = "lumen-" + state.scene + (state.src.indexOf("data:image/png") === 0 ? ".png" : ".jpg");
    document.body.appendChild(a); a.click(); a.remove();
  });

  /* ---------- hear (speech synthesis) ---------- */
  var synth = window.speechSynthesis;
  function stopSpeaking() { if (synth) synth.cancel(); el.hearLabel.textContent = "Hear"; }
  if (!synth) el.hear.disabled = true;
  el.hear.addEventListener("click", function () {
    if (!synth) return;
    if (synth.speaking) { stopSpeaking(); return; }
    var u = new SpeechSynthesisUtterance(state.lastSay || el.say.textContent);
    u.rate = 1; u.pitch = 1.05;
    u.onend = u.onerror = function () { el.hearLabel.textContent = "Hear"; };
    el.hearLabel.textContent = "Stop"; synth.speak(u);
  });

  /* ---------- mic (speech recognition) ---------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition, rec = null;
  if (!SR) el.mic.hidden = true;
  el.mic.addEventListener("click", function () {
    if (!SR) return;
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = navigator.language || "en-US"; rec.interimResults = true; rec.continuous = false;
    var finalText = "";
    el.mic.classList.add("is-on"); el.mic.setAttribute("aria-pressed", "true");
    el.input.placeholder = "Listening… keep talking";
    rec.onresult = function (e) {
      var t = ""; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      el.input.value = t; finalText = t; updateSend();
    };
    rec.onend = rec.onerror = function () {
      el.mic.classList.remove("is-on"); el.mic.setAttribute("aria-pressed", "false");
      el.input.placeholder = "Any command. Chain them with then."; rec = null;
      if (finalText.trim()) run(finalText);
    };
    rec.start();
  });

  /* ---------- boot ---------- */
  renderSceneGrid(); refreshKeyDot(); setScene("station");
  window.__lumen = { state: state, run: run, look: function () { return lookAt(state.src); }, setScene: setScene, splitCommands: splitCommands, isAsk: isAsk };
})();
