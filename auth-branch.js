(function () {
  const OWNER_EMAIL = "alilamir27@gmail.com";
  const CONFIG = Object.assign({
    url: window.LSPD_SUPABASE_URL || "https://cydsusnowotmorxywyxa.supabase.co",
    anonKey: window.LSPD_SUPABASE_ANON_KEY || "sb_publishable_1Onpbnsgcx2zaSAwqEsMMw_vDGJRdfq",
    ownerPassword: window.LSPD_OWNER_PASSWORD || "!medward9318u",
    tables: {
      accounts: "lspd_accounts"
    }
  }, window.LSPD_SUPABASE_CONFIG || {});

  CONFIG.tables = Object.assign({ accounts: "lspd_accounts" }, CONFIG.tables || {});

  const STORAGE_KEYS = {
    session: "ftlspd-session-v1",
    userEmail: "ftlspd-user-email-v1",
    accounts: "ftlspd-accounts-v1"
  };

  const mode = document.body.dataset.authMode === "register" ? "register" : "login";
  const form = document.getElementById("authBranchForm");
  const status = document.getElementById("authStatus");
  const submit = document.getElementById("authSubmit");

  function tableName(key) {
    return (CONFIG.tables && CONFIG.tables[key]) || key;
  }

  function setStatus(message, type) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = type || "";
  }

  async function loadSupabase() {
    if (!/^https:\/\/.+\.supabase\.co/i.test(CONFIG.url || "") || !CONFIG.anonKey) return null;
    if (window.supabase && window.supabase.createClient) return window.supabase.createClient(CONFIG.url, CONFIG.anonKey);
    await new Promise(function (resolve, reject) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
    return window.supabase.createClient(CONFIG.url, CONFIG.anonKey);
  }

  async function hashPassword(password) {
    if (!window.crypto || !window.crypto.subtle) {
      return "fallback-" + btoa(unescape(encodeURIComponent("ftlspd:" + password)));
    }
    const data = new TextEncoder().encode("ftlspd:" + password);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest)).map(function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function saveSession(account) {
    const session = { email: account.email.toLowerCase(), role: account.role };
    localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
    localStorage.setItem(STORAGE_KEYS.userEmail, session.email);
  }

  function readLocalAccounts() {
    try {
      const rows = JSON.parse(localStorage.getItem(STORAGE_KEYS.accounts) || "[]");
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      return [];
    }
  }

  function saveLocalAccounts(rows) {
    localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(rows));
  }

  function goHome() {
    window.location.href = location.protocol === "file:" ? "../index.html" : "/";
  }

  async function login(email, password) {
    if (email === OWNER_EMAIL) {
      if (password !== CONFIG.ownerPassword) throw new Error("Invalid owner password");
      saveSession({ email, role: "owner" });
      return;
    }
    const hash = await hashPassword(password);
    const client = await loadSupabase().catch(function () { return null; });
    let account = null;
    if (client) {
      const result = await client.from(tableName("accounts")).select("*").eq("email", email).maybeSingle();
      if (result.error) throw result.error;
      account = result.data;
    } else {
      account = readLocalAccounts().find(function (entry) { return entry.email === email; });
    }
    if (!account || account.password_hash !== hash) throw new Error("Invalid email or password");
    saveSession({ email: account.email, role: account.role || "applicant" });
  }

  async function register(email, password) {
    if (email === OWNER_EMAIL) throw new Error("This email is reserved");
    const hash = await hashPassword(password);
    const client = await loadSupabase().catch(function () { return null; });
    const row = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      email,
      role: "applicant",
      password_hash: hash,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (client) {
      const existing = await client.from(tableName("accounts")).select("id").eq("email", email).maybeSingle();
      if (existing.data) throw new Error("Account already exists");
      const result = await client.from(tableName("accounts")).insert(row);
      if (result.error) throw result.error;
    } else {
      const accounts = readLocalAccounts();
      if (accounts.some(function (entry) { return entry.email === email; })) throw new Error("Account already exists");
      accounts.push(row);
      saveLocalAccounts(accounts);
    }
    saveSession(row);
  }

  form?.addEventListener("submit", async function (event) {
    event.preventDefault();
    const email = (document.getElementById("authEmail")?.value || "").trim().toLowerCase();
    const password = document.getElementById("authPassword")?.value || "";
    if (!email || !password) {
      setStatus("Complete the required fields.", "error");
      return;
    }
    submit.disabled = true;
    setStatus(mode === "register" ? "Creating account..." : "Authorizing...", "loading");
    try {
      if (mode === "register") await register(email, password);
      else await login(email, password);
      setStatus("Access granted. Returning to command hub...", "success");
      setTimeout(goHome, 650);
    } catch (error) {
      console.warn(error);
      setStatus(error.message || "Authentication failed.", "error");
      submit.disabled = false;
    }
  });
})();
