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
  var NO_KEY = "That one needs live AI. Tap the key button up top and paste your own xAI key to let me answer anything and redraw the photo. The demo chips work without it.";
  var DEMO_NOTE = "Demo mode: add your xAI key (key button, top right) to actually redraw the photo.";

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

  var state = { scene: "station", src: SCENES.station.src, edited: false, history: [], undo: [], busy: false, abort: null, lastSay: "" };

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
    state.scene = id; state.src = src || s.src; state.edited = false; state.history = []; state.undo = [];
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
    el.keyStatus.textContent = apiKey() ? "Saved in this browser. Live AI is on." : "Settings saved. No key yet — demo mode.";
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
      if (canned && (!key || !state.edited)) return Promise.resolve(answered(cmd, next, canned));
      if (!key) { setBubble({ you: cmd, next: next, say: canned || NO_KEY }); return Promise.resolve(); }
      setBusy("think"); setBubble({ kicker: "Reading the frame", you: cmd, next: next, say: "…" });
      return askVision(cmd, ctrl.signal).then(function (ans) { answered(cmd, next, ans); });
    }
    if (!key) {
      var narr = cannedEdit(cmd);
      setBubble({ you: cmd, next: next, say: narr || NO_KEY, note: narr ? DEMO_NOTE : "" });
      if (narr) { pushHistory(cmd, narr); arrive(); }
      return Promise.resolve();
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
        prompt: "Edit this photograph: " + cmd + ". Keep everything else the same — same camera angle, lighting, style and composition. Photorealistic.",
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
        if (!apiKey()) setBubble({ say: SCENES.upload.greeting, note: "Add your xAI key (key button, top right) so I can answer and redraw this photo." });
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
    state.src = state.undo.pop(); el.stage.src = state.src; state.edited = state.undo.length > 0;
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
  window.__lumen = { state: state, run: run, setScene: setScene, splitCommands: splitCommands, isAsk: isAsk };
})();
