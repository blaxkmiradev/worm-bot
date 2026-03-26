const messagesEl = document.getElementById("messages");
const inputEl    = document.getElementById("userInput");
const sendBtn    = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const historyEl  = document.getElementById("chatHistory");

const LOGO_URL = "https://avatars.githubusercontent.com/u/172988251?s=200&v=4";

let chatHistory  = [];          // current chat [{role, content}]
let sessions     = [];          // [{label, history}]
let activeIdx    = -1;          // index of loaded session (-1 = new)
let isLoading    = false;

// ── Comprehensive language → extension map ────────────────────────────────────
const EXT_MAP = {
  // Web
  html: "html", htm: "html", css: "css", scss: "scss", sass: "sass",
  less: "less", javascript: "js", js: "js", typescript: "ts", ts: "ts",
  jsx: "jsx", tsx: "tsx", vue: "vue", svelte: "svelte",
  // Backend / General
  python: "py", py: "py", ruby: "rb", rb: "rb",
  php: "php", java: "java", kotlin: "kt", swift: "swift",
  go: "go", golang: "go", rust: "rs", rs: "rs",
  c: "c", cpp: "cpp", "c++": "cpp", csharp: "cs", cs: "cs",
  scala: "scala", dart: "dart", elixir: "ex", erlang: "erl",
  haskell: "hs", lua: "lua", perl: "pl", r: "r",
  // Shell / Scripts
  bash: "sh", shell: "sh", sh: "sh", zsh: "sh", fish: "fish",
  powershell: "ps1", ps1: "ps1", bat: "bat", cmd: "bat",
  // Data / Config
  json: "json", yaml: "yml", yml: "yml", toml: "toml",
  xml: "xml", csv: "csv", ini: "ini", env: "env",
  // DB
  sql: "sql", mysql: "sql", postgresql: "sql", sqlite: "sql",
  graphql: "graphql", gql: "graphql",
  // Docs / Markup
  markdown: "md", md: "md", rst: "rst", tex: "tex", latex: "tex",
  // DevOps / Infra
  dockerfile: "dockerfile", docker: "dockerfile",
  makefile: "makefile", nginx: "conf", apache: "conf",
  terraform: "tf", tf: "tf", helm: "yaml",
  // Other
  asm: "asm", assembly: "asm", wasm: "wat",
};

function getExt(lang) {
  return EXT_MAP[lang.toLowerCase()] || "txt";
}

// ── Clipboard helper with fallback ────────────────────────────────────────────
function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for non-secure contexts
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    ok ? resolve() : reject(new Error("execCommand failed"));
  });
}

// ── Auto-resize textarea ──────────────────────────────────────────────────────
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
});
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
sendBtn.addEventListener("click", sendMessage);
newChatBtn.addEventListener("click", startNewChat);

// ── About modal ───────────────────────────────────────────────────────────────
const aboutModal  = document.getElementById("aboutModal");
const aboutBtn    = document.getElementById("aboutBtn");
const closeModal  = document.getElementById("closeModal");

aboutBtn.addEventListener("click", () => { aboutModal.classList.add("open"); closeSidebar(); });
closeModal.addEventListener("click", () => aboutModal.classList.remove("open"));
aboutModal.addEventListener("click", (e) => { if (e.target === aboutModal) aboutModal.classList.remove("open"); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") aboutModal.classList.remove("open"); });

// ── Mobile sidebar ────────────────────────────────────────────────────────────
const sidebar          = document.getElementById("sidebar");
const sidebarBackdrop  = document.getElementById("sidebarBackdrop");
const hamburgerBtn     = document.getElementById("hamburgerBtn");
const sidebarCloseBtn  = document.getElementById("sidebarCloseBtn");

function openSidebar()  { sidebar.classList.add("open"); sidebarBackdrop.classList.add("open"); document.body.style.overflow = "hidden"; }
function closeSidebar() { sidebar.classList.remove("open"); sidebarBackdrop.classList.remove("open"); document.body.style.overflow = ""; }

hamburgerBtn.addEventListener("click", openSidebar);
sidebarCloseBtn.addEventListener("click", closeSidebar);
sidebarBackdrop.addEventListener("click", closeSidebar);

// Auto-close sidebar on new chat / session load on mobile
function maybeCloseSidebar() { if (window.innerWidth <= 768) closeSidebar(); }

// ── Session management ───────────────────────────────────────────────────────
function saveCurrentSession() {
  if (chatHistory.length === 0) return;
  const label = (chatHistory[0]?.content || "Chat").slice(0, 38);
  if (activeIdx >= 0) {
    // update existing session
    sessions[activeIdx] = { label, history: [...chatHistory] };
  } else {
    sessions.unshift({ label, history: [...chatHistory] });
  }
  renderSessions();
}

function startNewChat() {
  saveCurrentSession();
  chatHistory = [];
  activeIdx   = -1;
  messagesEl.innerHTML = "";
  appendWelcome();
  maybeCloseSidebar();
}

function loadSession(idx) {
  saveCurrentSession();
  const session = sessions[idx];
  if (!session) return;
  activeIdx   = idx;
  chatHistory = [...session.history];
  messagesEl.innerHTML = "";
  chatHistory.forEach((entry) => {
    const role = entry.role === "model" ? "bot" : "user";
    appendMessage(role, entry.content);
  });
  maybeCloseSidebar();
}

function renderSessions() {
  const label = historyEl.querySelector(".history-label");
  historyEl.innerHTML = "";
  historyEl.appendChild(label);
  sessions.slice(0, 20).forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "history-item" + (i === activeIdx ? " active" : "");
    div.textContent = s.label + "…";
    div.title = s.label;
    div.addEventListener("click", () => loadSession(i));
    historyEl.appendChild(div);
  });
}

// ── Welcome ───────────────────────────────────────────────────────────────────
function appendWelcome() {
  messagesEl.innerHTML = `
    <div class="welcome">
      <img src="${LOGO_URL}" alt="WormBot" class="welcome-logo"/>
      <h2>WormBot ready.</h2>
      <p>Sharp. Direct. No fluff. Ask me anything.</p>
    </div>`;
}

// ── Parse reply into text + code blocks ───────────────────────────────────────
function renderMessage(text) {
  const frag = document.createDocumentFragment();
  // Match fenced code blocks: ```lang\n...code...\n```
  const parts = text.split(/(```[\w]*\n[\s\S]*?```|```[\s\S]*?```)/g);

  parts.forEach((part) => {
    const m = part.match(/^```([\w]*)\n?([\s\S]*?)```$/s);
    if (m) {
      const lang    = (m[1] || "txt").trim();
      const code    = m[2] || "";
      const ext     = getExt(lang);

      const block = document.createElement("div");
      block.className = "code-block";

      // Header
      const header = document.createElement("div");
      header.className = "code-header";

      const langTag = document.createElement("span");
      langTag.className = "code-lang";
      langTag.textContent = lang || "text";

      const actions = document.createElement("div");
      actions.className = "code-actions";

      // Copy button
      const copyBtn = document.createElement("button");
      copyBtn.className = "code-btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => {
        copyToClipboard(code)
          .then(() => {
            copyBtn.textContent = "Copied!";
            setTimeout(() => (copyBtn.textContent = "Copy"), 1800);
          })
          .catch(() => {
            copyBtn.textContent = "Failed";
            setTimeout(() => (copyBtn.textContent = "Copy"), 1800);
          });
      });

      // Save button
      const saveBtn = document.createElement("button");
      saveBtn.className = "code-btn code-btn-dl";
      saveBtn.textContent = "Save File";
      saveBtn.addEventListener("click", () => saveFile(lang, ext, code, saveBtn));

      actions.appendChild(copyBtn);
      actions.appendChild(saveBtn);
      header.appendChild(langTag);
      header.appendChild(actions);

      const pre = document.createElement("pre");
      const codeEl = document.createElement("code");
      codeEl.textContent = code;
      pre.appendChild(codeEl);

      block.appendChild(header);
      block.appendChild(pre);
      frag.appendChild(block);
    } else if (part.trim()) {
      const p = document.createElement("p");
      p.className = "text-part";
      p.textContent = part;
      frag.appendChild(p);
    }
  });

  return frag;
}

// ── Save file directly in browser via Blob URL ───────────────────────────────
function saveFile(lang, ext, code, btn) {
  try {
    const filename = `wormbot_${Date.now()}.${ext}`;
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    btn.textContent = "Saved!";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = "Save File";
      btn.disabled = false;
    }, 2000);
  } catch (err) {
    console.error("[Save error]", err);
    btn.textContent = "Error";
    setTimeout(() => {
      btn.textContent = "Save File";
      btn.disabled = false;
    }, 2000);
  }
}

// ── Build avatar element ──────────────────────────────────────────────────────
function makeAvatar(role) {
  if (role === "bot") {
    const wrap = document.createElement("div");
    wrap.className = "avatar";
    const img = document.createElement("img");
    img.src = LOGO_URL;
    img.alt = "WormBot";
    wrap.appendChild(img);
    return wrap;
  }
  const wrap = document.createElement("div");
  wrap.className = "avatar-user";
  wrap.textContent = "U";
  return wrap;
}

// ── Append message ────────────────────────────────────────────────────────────
function appendMessage(role, text) {
  messagesEl.querySelector(".welcome")?.remove();

  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (role === "bot") {
    bubble.appendChild(renderMessage(text));
  } else {
    bubble.textContent = text;
  }

  wrapper.appendChild(makeAvatar(role));
  wrapper.appendChild(bubble);
  messagesEl.appendChild(wrapper);
  scrollBottom();
  return wrapper;
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function appendTyping() {
  messagesEl.querySelector(".welcome")?.remove();
  const wrapper = document.createElement("div");
  wrapper.className = "message bot typing";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;
  wrapper.appendChild(makeAvatar("bot"));
  wrapper.appendChild(bubble);
  messagesEl.appendChild(wrapper);
  scrollBottom();
  return wrapper;
}

function scrollBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

// ── Send message ──────────────────────────────────────────────────────────────
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;

  appendMessage("user", text);
  chatHistory.push({ role: "user", content: text });
  inputEl.value = "";
  inputEl.style.height = "auto";

  const typingEl = appendTyping();
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: chatHistory.slice(0, -1) }),
    });
    const data = await res.json();
    typingEl.remove();
    if (!res.ok) throw new Error(data.error || "Request failed");
    appendMessage("bot", data.reply);
    chatHistory.push({ role: "model", content: data.reply });
  } catch (err) {
    typingEl.remove();
    appendMessage("bot", "Error: " + err.message);
  } finally {
    isLoading = false;
    sendBtn.disabled = false;
    inputEl.focus();
  }
}
