(function () {
  "use strict";

  const config = {
    brand: {
      shortName: "FT | LSPD",
      departmentName: "Los Santos Police Department",
      portalName: "Command Portal",
      serverConnectUrl: "fivem://connect/ftlspd.com",
      shield: "lspd-shield.png",
      favicon: "header.png"
    },

    colors: {
      background: "#01040b",
      backgroundAlt: "#06111f",
      panel: "#07101d",
      panelElevated: "#0a182b",
      accentBlue: "#3aa7ff",
      accentRed: "#e7515a",
      text: "#edf7ff",
      muted: "#93a9bf",
      success: "#4ade80",
      warning: "#7dd3fc",
      line: "rgba(58, 167, 255, .24)"
    },

    assets: {
      hubBackground: "image4.webp",
      sopBackground: "image.webp",
      policeChiefPortrait: "murphy-edward-cutout.webp",
      crewFallback: "image2.webp"
    },

    policeChief: {
      firstName: "MURPHY",
      lastName: "EDWARD",
      rank: "CHIEF OF POLICE",
      title: "MURPHY EDWARD",
      introduction: "Commanding the Los Santos Police Department with discipline, accountability, and a clear standard for every officer under the badge.",
      details: [
        { label: "DETAIL 01", value: "Department command and operational oversight" },
        { label: "DETAIL 02", value: "Officer standards, readiness, and accountability" },
        { label: "DETAIL 03", value: "Public safety strategy and executive leadership" }
      ]
    },

    supabase: {
      url: "https://cydsusnowotmorxywyxa.supabase.co",
      anonKey: "sb_publishable_1Onpbnsgcx2zaSAwqEsMMw_vDGJRdfq",
      tables: {
        applications: "lspd_applications",
        accounts: "lspd_accounts",
        roles: "lspd_roles",
        assets: "lspd_assets",
        streams: "lspd_streams",
        mediaReactions: "lspd_media_reactions",
        regulations: "lspd_regulations",
        schedule: "lspd_schedule",
        presence: "lspd_presence",
        audit: "lspd_audit_log"
      }
    },

    integrations: {
      auditFunctionName: "lspd-audit",
      kickChannelEndpoint: "https://kick.com/api/v2/channels/"
    },

    security: {
      requireSecureAuthForPrivilegedActions: true,
      minimumPasswordLength: 10,
      bootFailSafeMs: 8000,
      maxAuditDetailLength: 1800
    }
  };

  const cssMap = {
    background: ["--page", "--custom-bg", "--ops-black", "--config-bg"],
    backgroundAlt: ["--ops-navy", "--config-bg-alt"],
    panel: ["--ops-panel-solid", "--config-panel"],
    panelElevated: ["--surface-raised", "--config-panel-elevated"],
    accentBlue: ["--accent", "--accent-cyan", "--ops-blue", "--config-blue"],
    accentRed: ["--critical", "--ops-red", "--config-red"],
    text: ["--text", "--ops-white", "--config-text"],
    muted: ["--muted", "--ops-muted", "--config-muted"],
    success: ["--success", "--config-success"],
    warning: ["--gold", "--config-warning"],
    line: ["--ops-line", "--config-line"]
  };

  Object.entries(config.colors).forEach(function (entry) {
    (cssMap[entry[0]] || []).forEach(function (name) {
      document.documentElement.style.setProperty(name, entry[1]);
    });
  });

  window.LSPD_CONFIG = Object.freeze(config);
  window.LSPD_FIVEM_CONNECT_URL = config.brand.serverConnectUrl;
  window.LSPD_SUPABASE_CONFIG = Object.assign({}, config.supabase, {
    auditFunctionName: config.integrations.auditFunctionName
  });

  let finished = false;
  window.LSPD_BOOT = {
    finish: function () {
      if (finished) return;
      finished = true;
      const root = document.documentElement;
      const loader = document.getElementById("lspdBootScreen");
      root.classList.remove("lspd-booting");
      root.classList.add("lspd-ready");
      if (loader) {
        loader.setAttribute("aria-hidden", "true");
        window.setTimeout(function () { loader.remove(); }, 620);
      }
    }
  };

  window.setTimeout(function () {
    window.LSPD_BOOT.finish();
  }, config.security.bootFailSafeMs);
})();
