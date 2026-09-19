(function () {
  "use strict";

  const PUBLIC_CONFIG = window.LSPD_CONFIG || {};
  const CONFIG = Object.assign({
    url: "",
    anonKey: "",
    auditFunctionName: "lspd-audit"
  }, window.LSPD_SUPABASE_CONFIG || {});
  const MIN_PASSWORD_LENGTH = Number(PUBLIC_CONFIG.security?.minimumPasswordLength || 10);
  const mode = document.body.dataset.authMode === "register" ? "register" : "login";
  const form = document.getElementById("authBranchForm");
  const status = document.getElementById("authStatus");
  const submit = document.getElementById("authSubmit");
  let client = null;

  function setStatus(message, type) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = type || "";
  }

  function isConfigured() {
    return /^https:\/\/.+\.supabase\.co/i.test(CONFIG.url || "") && Boolean(CONFIG.anonKey);
  }

  async function loadSupabase() {
    if (!isConfigured()) throw new Error("Secure authentication is not configured.");
    if (!window.supabase?.createClient) {
      await new Promise(function (resolve, reject) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
    client = client || window.supabase.createClient(CONFIG.url, CONFIG.anonKey);
    return client;
  }

  function throttleState() {
    try {
      return JSON.parse(sessionStorage.getItem("lspd-auth-throttle") || '{"attempts":0,"until":0}');
    } catch (error) {
      return { attempts: 0, until: 0 };
    }
  }

  function recordFailure() {
    const state = throttleState();
    state.attempts += 1;
    if (state.attempts >= 5) {
      state.until = Date.now() + 30000;
      state.attempts = 0;
    }
    sessionStorage.setItem("lspd-auth-throttle", JSON.stringify(state));
  }

  function clearFailures() {
    sessionStorage.removeItem("lspd-auth-throttle");
  }

  async function sendAuthAudit(action, email) {
    if (!client || !CONFIG.auditFunctionName) return;
    try {
      await client.functions.invoke(CONFIG.auditFunctionName, {
        body: {
          action,
          target: "session",
          eventType: "auth",
          details: { email },
          source: "auth-branch"
        }
      });
    } catch (error) {
      console.warn("LSPD auth audit delivery failed", error);
    }
  }

  function goHome() {
    window.location.replace("../ftlspd-portal.html");
  }

  async function login(email, password) {
    const supabaseClient = await loadSupabase();
    const result = await supabaseClient.auth.signInWithPassword({ email, password });
    if (result.error) throw new Error("Invalid email or password.");
    await sendAuthAudit("auth.login", email);
  }

  async function register(email, password) {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error("Use at least " + MIN_PASSWORD_LENGTH + " characters for your password.");
    }
    const supabaseClient = await loadSupabase();
    const result = await supabaseClient.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: new URL("../ftlspd-portal.html", window.location.href).href }
    });
    if (result.error) throw new Error(result.error.message || "Registration failed.");
    if (!result.data.session) {
      setStatus("Account created. Check your email to confirm access.", "success");
      return false;
    }
    await sendAuthAudit("auth.register", email);
    return true;
  }

  async function loginWithDiscord() {
    const supabaseClient = await loadSupabase();
    const result = await supabaseClient.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: new URL("../ftlspd-portal.html", window.location.href).href }
    });
    if (result.error) throw new Error(result.error.message || "Discord login failed.");
  }

  form?.addEventListener("submit", async function (event) {
    event.preventDefault();
    const email = (document.getElementById("authEmail")?.value || "").trim().toLowerCase();
    const password = document.getElementById("authPassword")?.value || "";
    const throttle = throttleState();
    if (throttle.until > Date.now()) {
      setStatus("Too many attempts. Wait 30 seconds and try again.", "error");
      return;
    }
    if (!email || !password) {
      setStatus("Complete the required fields.", "error");
      return;
    }
    submit.disabled = true;
    setStatus(mode === "register" ? "Creating secure account..." : "Authorizing...", "loading");
    try {
      const shouldRedirect = mode === "register" ? await register(email, password) : (await login(email, password), true);
      clearFailures();
      if (shouldRedirect) {
        setStatus("Access granted. Returning to command hub...", "success");
        window.setTimeout(goHome, 500);
      } else {
        submit.disabled = false;
      }
    } catch (error) {
      console.warn(error);
      recordFailure();
      setStatus(error.message || "Authentication failed.", "error");
      submit.disabled = false;
    }
  });

  document.getElementById("discordAuthButton")?.addEventListener("click", async function (event) {
    const button = event.currentTarget;
    button.disabled = true;
    setStatus("Opening Discord authorization...", "loading");
    try {
      await loginWithDiscord();
    } catch (error) {
      console.warn(error);
      setStatus(error.message || "Discord authorization failed.", "error");
      button.disabled = false;
    }
  });
})();
