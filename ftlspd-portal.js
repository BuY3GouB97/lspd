(function () {
  "use strict";

  const PUBLIC_CONFIG = window.LSPD_CONFIG || {};
  const SERVER_CONNECT_URL = window.LSPD_FIVEM_CONNECT_URL || "";
  const SUPABASE_CONFIG = Object.assign({
    url: window.LSPD_SUPABASE_URL || "",
    anonKey: window.LSPD_SUPABASE_ANON_KEY || "",
    auditFunctionName: "lspd-audit",
    tables: {
      applications: "lspd_applications",
      accounts: "lspd_accounts",
      roles: "lspd_roles",
      assets: "lspd_assets",
      streams: "lspd_streams",
      mediaReactions: "lspd_media_reactions",
      regulations: "lspd_regulations",
      schedule: "lspd_schedule",
      presence: "lspd_presence"
    }
  }, window.LSPD_SUPABASE_CONFIG || {});
  SUPABASE_CONFIG.tables = Object.assign({
    applications: "lspd_applications",
    accounts: "lspd_accounts",
    roles: "lspd_roles",
    assets: "lspd_assets",
    streams: "lspd_streams",
    mediaReactions: "lspd_media_reactions",
    regulations: "lspd_regulations",
    schedule: "lspd_schedule",
    presence: "lspd_presence"
  }, SUPABASE_CONFIG.tables || {});
  const AUDIT_FUNCTION_NAME = SUPABASE_CONFIG.auditFunctionName || "lspd-audit";
  const MEDIA_STORAGE_BUCKET = SUPABASE_CONFIG.mediaStorageBucket || "lspd-media";
  const REQUIRE_SECURE_MUTATIONS = PUBLIC_CONFIG.security?.requireSecureAuthForPrivilegedActions !== false;
  const ENABLE_REALTIME = SUPABASE_CONFIG.enableRealtime === true || PUBLIC_CONFIG.performance?.enableRealtime === true;
  const PRESENCE_INTERVAL_MS = Number(PUBLIC_CONFIG.performance?.presenceIntervalMs || SUPABASE_CONFIG.presenceIntervalMs || 120000);
  const AUTO_REFRESH_INTERVAL_MS = Number(PUBLIC_CONFIG.performance?.autoRefreshIntervalMs || SUPABASE_CONFIG.autoRefreshIntervalMs || 0);
  const SKIP_EMBEDDED_ASSET_ROWS = SUPABASE_CONFIG.skipEmbeddedAssetRows !== false && PUBLIC_CONFIG.performance?.skipEmbeddedAssetRows !== false;
  const PENDING_DISPLAY_NAME_KEY = "lspd-pending-display-name-v1";
  const LIGHTWEIGHT_UI = PUBLIC_CONFIG.performance?.lightweight !== false;
  const SUPABASE_AUTH_OPTIONS = {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "ftlspd-supabase-auth-v1"
    }
  };
  document.documentElement.classList.toggle("lightweight-ui", LIGHTWEIGHT_UI);

  const STORAGE_KEYS = {
    applications: "ftlspd-applications-v2",
    accounts: "ftlspd-accounts-v1",
    roles: "ftlspd-roles-v2",
    assets: "ftlspd-assets-v2",
    assetOrder: "ftlspd-asset-order-v1",
    mediaReactions: "ftlspd-media-reactions-v1",
    regulations: "ftlspd-custom-regulations-v1",
    schedule: "ftlspd-schedule-v1",
    streams: "ftlspd-streams-v1",
    uiPrefs: "ftlspd-ui-prefs-v1",
    userEmail: "ftlspd-user-email-v1",
    visitorId: "ftlspd-visitor-id-v1",
    session: "ftlspd-session-v1"
  };

  const defaultWorkspaceTabs = [
    ["recruitment", "fa-house-signal", "workspaceRecruitment"],
    ["dashboard", "fa-gauge-high", "workspaceDashboard"],
    ["review", "fa-clipboard-check", "workspaceReview"],
    ["archives", "fa-box-archive", "workspaceArchives"],
    ["regulations", "fa-clipboard-list", "Regulations"],
    ["sop", "fa-book-open", "Police SOP"],
    ["fto", "fa-graduation-cap", "workspaceFto"],
    ["schedule", "fa-table-list", "workspaceSchedule"],
    ["crew", "fa-users-gear", "workspaceCrew"],
    ["media", "fa-images", "workspaceMedia"],
    ["streams", "fa-tower-broadcast", "workspaceStreams"],
    ["credits", "fa-award", "workspaceCredits"]
  ];
  const portalWorkspaces = ["recruitment", "dashboard", "review", "archives", "fto", "schedule", "crew", "media", "streams", "credits"];
  const roleOptions = ["admin", "fto", "media", "ia", "applicant"];
  const policeRanks = [
    "Police Commissioner",
    "Deputy Police Commissioner",
    "Police Chief",
    "Deputy Police Chief",
    "Commander",
    "Captain III",
    "Captain II",
    "Captain I",
    "Lieutenant II",
    "Lieutenant",
    "Sergeant II",
    "Sergeant I",
    "Sergeant",
    "Senior Lead Officer",
    "Senior Officer",
    "Officer 3",
    "Officer 2",
    "Officer 1",
    "Rookie"
  ];
  const scheduleSections = [
    ["commissioner-office", "", ["Police Commissioner", "Deputy Police Commissioner"]],
    ["chief-office", "CHIEF OFFICE", ["Police Chief", "Deputy Police Chief", "Commander"]],
    ["police-administration", "POLICE ADMINISTRATION", ["Captain III", "Captain II", "Captain I"]],
    ["command-of-stations", "COMMAND OF STATIONS", ["Lieutenant II", "Lieutenant"]],
    ["watch-commander", "WATCH COMMANDER", ["Sergeant II"]],
    ["field-supervisor", "FIELD SUPERVISOR", ["Sergeant I", "Sergeant", "Senior Lead Officer"]],
    ["patrol-units", "PATROL UNITS", ["Senior Officer", "Officer 3", "Officer 2", "Officer 1"]],
    ["police-trainers", "POLICE TRAINERS", ["Rookie"]]
  ];
  const scheduleWings = [
    ["dispatch", "Dispatch"],
    ["negotiator", "Negotiator"],
    ["motorcycle", "Motorcycle"],
    ["airunit", "Air Unit"],
    ["interceptor", "Interceptor"]
  ];
  const mediaReactionTypes = ["👍", "🔥", "❤️", "😂", "🫡"];
  const state = {
    client: null,
    realtimeChannel: null,
    applications: [],
    accounts: [],
    roles: [],
    assets: [],
    mediaReactions: [],
    customRegulations: [],
    schedule: [],
    streams: [],
    streamStatus: {},
    streamTimer: null,
    presenceTimer: null,
    autoRefreshTimer: null,
    fetchTimer: null,
    fetchInFlight: false,
    fetchQueued: false,
    fetchRetryTimer: null,
    fetchRetryCount: 0,
    onlineCount: 1,
    userEmail: localStorage.getItem(STORAGE_KEYS.userEmail) || "",
    visitorId: localStorage.getItem(STORAGE_KEYS.visitorId) || "",
    authUser: null,
    accountProfile: null,
    role: "guest",
    activeReviewType: "recruitment",
    activeArchive: "accepted-recruitment",
    assetOrder: { crew: [], media: [] },
    assetEditing: { crew: null, media: null },
    dragAsset: null,
    assetOrderLockUntil: 0,
    streamEditing: null,
    scheduleEditing: null,
    uiPrefs: null,
    applicationType: "recruitment",
    applicationStep: 1,
    applicationDraft: {},
    transferGateOpen: false,
    pendingApplicationType: null,
    profilePromptShown: false,
    accountModalOpen: false,
    pendingDecision: null,
    databaseMode: "local",
    audioReady: false,
    lastHoverSound: 0
  };

  const portalCopy = {
    en: {
      pageTitle: "FT | LSPD Command Portal",
      brandKicker: "Los Santos Police Department",
      brandTitle: "Command Portal",
      footerLeft: "Version Beta 1.8 | Made By : Majed Alqahtani | Murphy Edward",
      footerRight: "LSPD command systems",
      workspaceRecruitment: "HUB",
      workspaceDashboard: "Admin",
      workspaceReview: "Review",
      workspaceArchives: "Archives",
      workspaceFto: "FTO",
      workspaceSchedule: "LSPD Schedule",
      workspaceCrew: "LSPD Crew",
      workspaceMedia: "Media",
      workspaceStreams: "Streams",
      workspaceCredits: "Credits",
      roleOwner: "Owner",
      roleAdmin: "Admin",
      roleFto: "FTO",
      roleMedia: "Media",
      roleIa: "IA",
      roleEditor: "Admin",
      roleViewer: "Viewer",
      roleGuest: "Guest",
      roleApplicant: "Applicant",
      activeUsers: "{n} online",
      emailPlaceholder: "Email",
      passwordPlaceholder: "Password",
      login: "Login",
      createAccount: "Create account",
      logout: "Logout",
      localMode: "Local fallback",
      liveMode: "Supabase live",
      roleManagerLabel: "Manage roles",
      welcomeKicker: "FT | LSPD command access",
      welcomeTitle: "Los Santos Police <span>Department</span>",
      welcomeText: "Welcome to the official LSPD portal for regulations, SOP, recruitment, FTO, command crew, and field media.",
      enterPortal: "Enter portal",
      connectFiveM: "Connect to First Town",
      recruitmentKicker: "LSPD command hub",
      recruitmentTitle: "LSPD <span>Command</span> HUB",
      recruitmentCopy: "Explore the system, connect to First Town, and join the LSPD when you are ready to start recruitment or transfer.",
      metricRealtime: "Real-time records",
      metricRealtimeText: "Applications sync to Supabase when configured.",
      metricRoles: "Role secured",
      metricRolesText: "Owner, admin, and applicant permissions.",
      metricCooldown: "Cooldown aware",
      metricCooldownText: "Accepted and rejected applicants are tracked automatically.",
      overviewTitle: "نظرة عامة على الشرطة البلدية الأمريكية",
      overviewText: "تعمل إدارات الشرطة البلدية في الولايات المتحدة كجهة محلية مسؤولة عن حفظ النظام العام، حماية الأرواح والممتلكات، الاستجابة للبلاغات، وتنفيذ القانون داخل نطاق المدينة. في سياق LSPD، يمثل الضابط واجهة الدولة أمام المواطنين، لذلك تعتمد الإدارة على التسلسل القيادي، الانضباط، التقارير الدقيقة، واحترام صلاحيات استخدام القوة وفق سياسة واضحة.",
      dashboardTitle: "Admin Command Dashboard",
      dashboardSubtitle: "Owner and admin command surface for applications, records, roster, media, regulations, streams, and account controls.",
      dashboardApplications: "Pending applications",
      dashboardArchives: "Archived records",
      dashboardPersonnel: "Personnel rows",
      dashboardMedia: "Media posts",
      dashboardQuickActions: "Command controls",
      dashboardOpenReview: "Open review",
      dashboardOpenArchives: "Open archives",
      dashboardOpenSchedule: "Open schedule",
      dashboardOpenRoles: "Manage accounts",
      applyRecruitment: "Apply for Recruitment (New)",
      submitTransfer: "Submit Transfer Request",
      goToFtoRecruitment: "Recruitment",
      goToFtoTransfer: "Transfer",
      ftoApplyTitle: "Recruitment desk",
      ftoApplyText: "Login or create an applicant account, then submit recruitment or transfer from this FTO desk.",
      loginRequired: "Login or create an account before submitting recruitment or transfer.",
      activeStatus: "Active application status",
      noApplicantRecords: "No active records for this email yet.",
      cooldownAccepted: "You are under a 7-day acceptance cooldown until {date}.",
      cooldownRejected: "You are under a 3-day rejection cooldown until {date}.",
      pendingWarning: "You already have a pending {type} application.",
      reviewTitle: "Pending Applications Review",
      reviewSubtitle: "Review submitted recruitment and transfer requests with complete question text and applicant answers.",
      newRecruitment: "New Recruitment",
      transferRequests: "Transfer Requests",
      searchApplications: "Search applications...",
      clearPending: "Clear All Pending Requests",
      accessRequired: "Owner or admin login is required to access this section.",
      noPending: "No pending records in this queue.",
      approve: "Approve",
      reject: "Reject",
      archivesTitle: "System Archives and Records",
      archivesSubtitle: "Accepted and rejected records remain available for audit until a permitted reset.",
      acceptedRecruitment: "Accepted Recruitment",
      acceptedTransfers: "Accepted Transfers",
      rejectedRecruitment: "Rejected Recruitment",
      rejectedTransfers: "Rejected Transfers",
      fullReset: "Full System Reset",
      noArchive: "No archived records in this category.",
      ftoTitle: "Field Training Officer",
      ftoSubtitle: "A focused training space for academy handoff, field evaluation, and probation readiness.",
      ftoPhaseOne: "Orientation",
      ftoPhaseOneText: "Verify SOP literacy, radio discipline, uniform standards, and call sign readiness before ride-alongs.",
      ftoPhaseTwo: "Ride Along",
      ftoPhaseTwoText: "Evaluate traffic stops, report quality, pursuit spacing, officer safety, and command compliance.",
      ftoPhaseThree: "Certification",
      ftoPhaseThreeText: "Confirm policy judgment, scenario handling, de-escalation, and readiness for independent patrol.",
      crewTitle: "LSPD Crew",
      crewSubtitle: "Police chief profile and department roster in one command view.",
      crewDirectoryTitle: "LSPD Crew Directory",
      crewDirectorySubtitle: "Authorized staff can add, edit, and organize crew profiles below.",
      mediaTitle: "LSPD Media",
      mediaSubtitle: "Department media board for patrol, academy, ceremony, and command GIF, image, and MP4 posts.",
      mediaFile: "Media file",
      mediaUrl: "Media URL (PNG, JPG, GIF, or MP4)",
      reactLoginRequired: "Login before reacting to media.",
      reactionSaved: "Reaction updated.",
      regulationsAdminTitle: "IA Regulation Intake",
      regulationsAdminSubtitle: "IA, admin, and owner accounts can add regulation records by degree, title, and description.",
      addRegulation: "Add regulation",
      regulationDegree: "Degree",
      regulationTitle: "Regulation title",
      regulationDescription: "Regulation description",
      savedRegulation: "Regulation added.",
      scheduleTitle: "LSPD Personnel Schedule",
      scheduleSubtitle: "Active personnel database with rank ordering, insignia, department assignment, points, privileges, and wing certificates.",
      scheduleAdd: "Add personnel",
      scheduleUpdate: "Update personnel",
      scheduleEmpty: "No personnel rows have been added yet.",
      scheduleInsigniaUrl: "Insignia URL",
      scheduleInsigniaFile: "Insignia PNG",
      badgeNumber: "#BN",
      department: "Department",
      adminRank: "Administrative rank",
      status: "Status",
      punishment: "Punishment",
      lastPromotion: "Last promotion",
      discordUser: "Discord user",
      points: "Points",
      privilegePoints: "Privilege points",
      wings: "Wings",
      streamsTitle: "LSPD Streams",
      streamsSubtitle: "Live Kick channels for command, patrol, training, and community broadcasts.",
      addCrew: "Add crew member",
      addMedia: "Add media",
      addStream: "Add stream",
      updateCrew: "Update crew member",
      updateMedia: "Update media",
      updateStream: "Update stream",
      edit: "Edit",
      cancel: "Cancel",
      dragAsset: "Drag to reposition",
      name: "Name",
      rank: "Rank",
      discordId: "Discord ID",
      photoUrl: "Photo URL",
      logoUrl: "Logo URL",
      kickUrl: "Kick direct link",
      title: "Title",
      caption: "Caption",
      remove: "Remove",
      noCrew: "No crew profiles have been added yet.",
      noMedia: "No media has been added yet.",
      noStreams: "No Kick streamers have been added yet.",
      live: "Live",
      offline: "Offline",
      viewers: "{n} viewers",
      streamUnavailable: "Kick status unavailable",
      streamOpen: "Open Kick",
      streamAutoRefresh: "Refreshes every 10 seconds",
      creditsTitle: "Credits & Build Log",
      creditsSubtitle: "A First Town local command interface built for LSPD operations, records, media, and recruitment.",
      creditsKicker: "First Town production",
      creditMajedTitle: "Majed Alqahtani",
      creditMajedRole: "Head of the Internal Affairs & Head Developer",
      creditMurphyTitle: "Murphy Edward",
      creditMurphyRole: "Chief of Police",
      creditMohsenTitle: "Mohsen Alqahtani",
      creditMohsenRole: "Assistant Developer",
      creditBody: "All core credits go to Majed Alqahtani, Chief of Police Murphy Edward, and Assistant Developer Mohsen Alqahtani for the LSPD command system vision, department identity, development support, and operational direction.",
      creditLocal: "Locally made in First Town.",
      creditStack: "Languages used: HTML, CSS, and JS.",
      applicationModalTitleRecruitment: "New Recruitment Application",
      applicationModalTitleTransfer: "Transfer Request",
      transferRulesTitle: "Transfer Rules & Regulations",
      transferRulesSubtitle: "Read and accept the transfer requirements before opening the survey.",
      transferRulesAgree: "I agree to everything",
      continueTransfer: "Continue to transfer survey",
      applicationStep: "Page {step} of 2",
      back: "Back",
      next: "Next",
      submitApplication: "Submit application",
      close: "Close",
      resetAccess: "Reset access",
      decisionApproveTitle: "Approve application",
      decisionRejectTitle: "Reject application",
      approvalMessage: "Response message",
      defaultApproval: "Your application has been accepted, please attend on one of the specified dates.",
      mondayDate: "Monday interview date",
      fridayDate: "Friday interview date",
      rejectionReason: "Rejection reason",
      saveDecision: "Save decision",
      roleManagement: "Admin Account Management",
      roleManagementText: "Owner and admin only. Assign admin, FTO, media, IA, or applicant access to active accounts.",
      profileTitle: "Complete Account Profile",
      profileSubtitle: "Add a name and link Discord before using command systems.",
      displayName: "Display name",
      discordUserRequired: "Discord user",
      saveProfile: "Save profile",
      profileSaved: "Profile saved.",
      profileBlocked: "Complete your name and Discord link before using this system.",
      linkDiscordRequired: "Link Discord to finish your account profile.",
      accountMenuLabel: "Open account",
      accountDetailsTitle: "Account Details",
      accountDetailsSubtitle: "Manage your identity, security, and previous applications.",
      accountName: "Account name",
      accountEmail: "Account email",
      accountRole: "Account role",
      accountDiscord: "Discord",
      discordLinked: "Discord linked",
      discordMissing: "Discord not linked",
      linkDiscord: "Link Discord",
      discordLinkStarted: "Discord authorization opened.",
      nameChangeTitle: "Change name",
      newDisplayName: "New display name",
      changeName: "Change name",
      emailChangeTitle: "Change email",
      newEmail: "New email",
      changeEmail: "Change email",
      emailUpdateSent: "Email change saved. Check your inbox if Supabase asks for confirmation.",
      passwordChangeTitle: "Change password",
      newPassword: "New password",
      changePassword: "Change password",
      passwordUpdated: "Password updated.",
      oldApplications: "Old applications",
      noOldApplications: "No previous applications yet.",
      userEmail: "User email",
      accountPassword: "Account password",
      role: "Role",
      saveRole: "Save account",
      configuredUsers: "Configured accounts",
      noUsers: "No configured accounts yet.",
      validationError: "Complete the required fields before continuing.",
      loginSuccess: "Logged in.",
      logoutSuccess: "Logged out.",
      accountCreated: "Account created.",
      invalidLogin: "Invalid email or password.",
      accountExists: "An account already exists for this email.",
      webhookSent: "Discord webhook notified.",
      webhookSkipped: "Discord webhook URL is not configured.",
      savedApplication: "Application submitted and records refreshed.",
      savedDecision: "Decision saved.",
      savedRole: "Role updated.",
      accountMustRegister: "This email must register an account before a role can be assigned.",
      savedAsset: "Saved.",
      savedStream: "Stream saved.",
      editMode: "Editing selected item.",
      reorderSaved: "Order updated.",
      removed: "Removed.",
      settingsTitle: "Personal Settings",
      settingsSubtitle: "Tune your local command interface.",
      settingsOpen: "Open settings",
      sfxSetting: "Sound effects",
      sfxOn: "ON",
      sfxOff: "OFF",
      fontSetting: "Font",
      tabOrderSetting: "Tab order",
      colorRedSetting: "Red accent",
      colorBlueSetting: "Blue accent",
      colorBgSetting: "Background",
      colorTextSetting: "Text",
      resetUi: "Reset UI",
      moveUp: "Move up",
      moveDown: "Move down",
      settingsSaved: "Settings saved.",
      deleteArchive: "Delete archive",
      confirmDeleteArchive: "Delete this archived record only?",
      archiveDeleted: "Archive record deleted.",
      databaseError: "Database action failed. Check Supabase table names and credentials.",
      resetDone: "Archives and cooldown timers were reset.",
      pendingCleared: "Pending requests cleared.",
      confirmClear: "Clear all pending requests in this queue?",
      confirmReset: "Wipe accepted/rejected archives and reset cooldown timers?",
      noPermission: "Your current role cannot perform this action.",
      recruitmentLabel: "Recruitment",
      transferLabel: "Transfer",
      pending: "Pending",
      accepted: "Accepted",
      rejected: "Rejected",
      submittedBy: "Submitted by {email}",
      submittedAt: "Submitted {date}",
      decidedAt: "Decided {date}",
      decisionMessage: "Decision message",
      interviewDates: "Interview dates",
      reason: "Reason"
    },
    ar: {
      pageTitle: "بوابة شرطة لوس سانتوس",
      brandKicker: "شرطة لوس سانتوس",
      brandTitle: "بوابة القيادة",
      footerLeft: "Version Beta 1.8 | Made By : Majed Alqahtani | Murphy Edward",
      footerRight: "أنظمة قيادة الشرطة",
      workspaceRecruitment: "الرئيسية",
      workspaceDashboard: "لوحة الأدمن",
      workspaceReview: "المراجعة",
      workspaceArchives: "الأرشيف",
      workspaceFto: "FTO",
      workspaceSchedule: "جدول LSPD",
      workspaceCrew: "طاقم LSPD",
      workspaceMedia: "الإعلام",
      workspaceStreams: "البثوث",
      workspaceCredits: "الاعتمادات",
      roleOwner: "مالك",
      roleAdmin: "أدمن",
      roleFto: "FTO",
      roleMedia: "إعلام",
      roleIa: "IA",
      roleEditor: "أدمن",
      roleViewer: "مشاهد",
      roleGuest: "مشاهد",
      roleApplicant: "متقدم",
      activeUsers: "{n} متصل",
      emailPlaceholder: "البريد",
      passwordPlaceholder: "كلمة المرور",
      login: "تسجيل الدخول",
      createAccount: "إنشاء حساب",
      logout: "خروج",
      localMode: "تخزين محلي",
      liveMode: "Supabase مباشر",
      roleManagerLabel: "إدارة الصلاحيات",
      welcomeKicker: "دخول بوابة FTLSPD",
      welcomeTitle: "شرطة لوس سانتوس <span>الرسمية</span>",
      welcomeText: "مرحباً بك في بوابة LSPD الخاصة باللوائح، دليل الإجراءات، التقديم، التدريب الميداني، طاقم القيادة، والإعلام.",
      enterPortal: "دخول البوابة",
      connectFiveM: "الدخول إلى First Town",
      recruitmentKicker: "مركز قيادة LSPD",
      recruitmentTitle: "مركز <span>LSPD</span>",
      recruitmentCopy: "استكشف النظام، ادخل إلى FiveM، وانتقل إلى FTO عندما تكون جاهزاً للتقديم أو النقل.",
      metricRealtime: "سجلات مباشرة",
      metricRealtimeText: "تتزامن الطلبات مع Supabase عند إعداده.",
      metricRoles: "صلاحيات آمنة",
      metricRolesText: "صلاحيات مالك، أدمن، ومتقدم.",
      metricCooldown: "متابعة فترات الانتظار",
      metricCooldownText: "يتم احتساب مدة القبول والرفض تلقائياً.",
      overviewTitle: "نظرة عامة على الشرطة البلدية الأمريكية",
      overviewText: "تعمل إدارات الشرطة البلدية في الولايات المتحدة كجهة محلية مسؤولة عن حفظ النظام العام، حماية الأرواح والممتلكات، الاستجابة للبلاغات، وتنفيذ القانون داخل نطاق المدينة. في سياق LSPD، يمثل الضابط واجهة الدولة أمام المواطنين، لذلك تعتمد الإدارة على التسلسل القيادي، الانضباط، التقارير الدقيقة، واحترام صلاحيات استخدام القوة وفق سياسة واضحة.",
      dashboardTitle: "لوحة تحكم الأدمن",
      dashboardSubtitle: "واجهة تحكم للمالك والأدمن للطلبات، الأرشيف، الجدول، الإعلام، اللوائح، البثوث، والحسابات.",
      dashboardApplications: "طلبات معلقة",
      dashboardArchives: "سجلات مؤرشفة",
      dashboardPersonnel: "أفراد الجدول",
      dashboardMedia: "منشورات الإعلام",
      dashboardQuickActions: "تحكم القيادة",
      dashboardOpenReview: "فتح المراجعة",
      dashboardOpenArchives: "فتح الأرشيف",
      dashboardOpenSchedule: "فتح الجدول",
      dashboardOpenRoles: "إدارة الحسابات",
      applyRecruitment: "تقديم توظيف جديد",
      submitTransfer: "تقديم طلب نقل",
      goToFtoRecruitment: "التوظيف",
      goToFtoTransfer: "النقل",
      ftoApplyTitle: "مكتب التقديم",
      ftoApplyText: "سجل الدخول أو أنشئ حساب متقدم، ثم أرسل طلب توظيف أو نقل من مكتب FTO.",
      loginRequired: "سجل الدخول أو أنشئ حساباً قبل إرسال طلب توظيف أو نقل.",
      activeStatus: "حالة الطلب الحالية",
      noApplicantRecords: "لا توجد سجلات نشطة لهذا البريد حالياً.",
      cooldownAccepted: "لديك مدة انتظار قبول 7 أيام حتى {date}.",
      cooldownRejected: "لديك مدة انتظار رفض 3 أيام حتى {date}.",
      pendingWarning: "لديك طلب {type} قيد المراجعة بالفعل.",
      reviewTitle: "مراجعة الطلبات المعلقة",
      reviewSubtitle: "راجع طلبات التوظيف والنقل مع عرض نص كل سؤال كاملاً وإجابة المتقدم.",
      newRecruitment: "توظيف جديد",
      transferRequests: "طلبات النقل",
      searchApplications: "البحث في الطلبات...",
      clearPending: "مسح كل الطلبات المعلقة",
      accessRequired: "يلزم تسجيل دخول مالك أو أدمن للوصول إلى هذا القسم.",
      noPending: "لا توجد سجلات معلقة في هذه القائمة.",
      approve: "قبول",
      reject: "رفض",
      archivesTitle: "الأرشيف والسجلات",
      archivesSubtitle: "تبقى سجلات القبول والرفض متاحة للتدقيق حتى يتم تصفيرها بصلاحية مناسبة.",
      acceptedRecruitment: "التوظيف المقبول",
      acceptedTransfers: "النقل المقبول",
      rejectedRecruitment: "التوظيف المرفوض",
      rejectedTransfers: "النقل المرفوض",
      fullReset: "تصفير النظام",
      noArchive: "لا توجد سجلات مؤرشفة في هذا التصنيف.",
      ftoTitle: "ضابط التدريب الميداني",
      ftoSubtitle: "مساحة تدريبية لتسليم الأكاديمية، تقييم الميدان، وجاهزية فترة الاختبار.",
      ftoPhaseOne: "التهيئة",
      ftoPhaseOneText: "تأكيد فهم الإجراءات، انضباط الراديو، الزي الرسمي، وجاهزية الكول ساين قبل المرافقة.",
      ftoPhaseTwo: "المرافقة الميدانية",
      ftoPhaseTwoText: "تقييم الاستيقافات، جودة التقارير، مسافات المطاردة، سلامة الضابط، والالتزام القيادي.",
      ftoPhaseThree: "الاعتماد",
      ftoPhaseThreeText: "تأكيد الحكم النظامي، التعامل مع السيناريوهات، التهدئة، والجاهزية للدورية المستقلة.",
      crewTitle: "طاقم LSPD",
      crewSubtitle: "ملف قائد الشرطة وقائمة طاقم القسم في واجهة قيادة واحدة.",
      crewDirectoryTitle: "دليل طاقم LSPD",
      crewDirectorySubtitle: "يمكن للموظفين المصرح لهم إضافة ملفات الطاقم وتعديلها وترتيبها أدناه.",
      mediaTitle: "إعلام LSPD",
      mediaSubtitle: "لوحة إعلام القسم للصور والـ GIF وملفات MP4 الخاصة بالدوريات والأكاديمية والمراسم والقيادة.",
      mediaFile: "ملف إعلامي",
      mediaUrl: "رابط إعلامي (PNG أو JPG أو GIF أو MP4)",
      reactLoginRequired: "سجل الدخول قبل التفاعل مع الإعلام.",
      reactionSaved: "تم تحديث التفاعل.",
      regulationsAdminTitle: "إضافة لوائح الشؤون الداخلية",
      regulationsAdminSubtitle: "يمكن لحسابات IA والأدمن والمالك إضافة بنود حسب الدرجة والعنوان والوصف.",
      addRegulation: "إضافة لائحة",
      regulationDegree: "الدرجة",
      regulationTitle: "عنوان اللائحة",
      regulationDescription: "وصف اللائحة",
      savedRegulation: "تمت إضافة اللائحة.",
      scheduleTitle: "جدول أفراد LSPD",
      scheduleSubtitle: "قاعدة بيانات الأفراد مع ترتيب الرتب، الشارات، الأقسام، النقاط، الامتيازات، وشهادات الونقات.",
      scheduleAdd: "إضافة فرد",
      scheduleUpdate: "تحديث الفرد",
      scheduleEmpty: "لم تتم إضافة أفراد للجدول بعد.",
      scheduleInsigniaUrl: "رابط الشارة",
      scheduleInsigniaFile: "ملف شارة PNG",
      badgeNumber: "#BN",
      department: "القسم",
      adminRank: "الرتبة الإدارية",
      status: "الحالة",
      punishment: "العقوبة",
      lastPromotion: "آخر ترقية",
      discordUser: "مستخدم ديسكورد",
      points: "النقاط",
      privilegePoints: "نقاط الامتياز",
      wings: "الونقات",
      streamsTitle: "بثوث LSPD",
      streamsSubtitle: "قنوات Kick المباشرة للقيادة والدوريات والتدريب والمجتمع.",
      addCrew: "إضافة عضو قيادة",
      addMedia: "إضافة مادة إعلامية",
      addStream: "إضافة بث",
      updateCrew: "تحديث عضو القيادة",
      updateMedia: "تحديث المادة الإعلامية",
      updateStream: "تحديث البث",
      edit: "تعديل",
      cancel: "إلغاء",
      dragAsset: "اسحب لتغيير الترتيب",
      name: "الاسم",
      rank: "الرتبة",
      discordId: "معرف الديسكورد",
      photoUrl: "رابط الصورة",
      logoUrl: "رابط الشعار",
      kickUrl: "رابط Kick المباشر",
      title: "العنوان",
      caption: "الوصف",
      remove: "حذف",
      noCrew: "لم تتم إضافة ملفات قيادة بعد.",
      noMedia: "لم تتم إضافة مواد إعلامية بعد.",
      noStreams: "لم تتم إضافة بثوث Kick بعد.",
      live: "مباشر",
      offline: "غير مباشر",
      viewers: "{n} مشاهد",
      streamUnavailable: "تعذر جلب حالة Kick",
      streamOpen: "فتح Kick",
      streamAutoRefresh: "يتحدث كل 10 ثواني",
      creditsTitle: "الاعتمادات وسجل البناء",
      creditsSubtitle: "واجهة قيادة محلية في First Town لعمليات LSPD والسجلات والإعلام والتقديم.",
      creditsKicker: "إنتاج First Town",
      creditMajedTitle: "Majed Alqahtani",
      creditMajedRole: "Head of the Internal Affairs & Head Developer",
      creditMurphyTitle: "Murphy Edward",
      creditMurphyRole: "Chief of Police",
      creditMohsenTitle: "Mohsen Alqahtani",
      creditMohsenRole: "Assistant Developer",
      creditBody: "تعود الاعتمادات الأساسية إلى Majed Alqahtani و Chief of Police Murphy Edward و Assistant Developer Mohsen Alqahtani لرؤية نظام قيادة LSPD وهوية القسم ودعم التطوير والتوجيه التشغيلي.",
      creditLocal: "صنع محلياً في First Town.",
      creditStack: "اللغات المستخدمة: HTML و CSS و JS.",
      applicationModalTitleRecruitment: "طلب توظيف جديد",
      applicationModalTitleTransfer: "طلب نقل",
      transferRulesTitle: "شروط ولوائح النقل",
      transferRulesSubtitle: "اقرأ شروط النقل ووافق عليها قبل فتح نموذج النقل.",
      transferRulesAgree: "أوافق على كل شيء",
      continueTransfer: "متابعة نموذج النقل",
      applicationStep: "الصفحة {step} من 2",
      back: "رجوع",
      next: "التالي",
      submitApplication: "إرسال الطلب",
      close: "إغلاق",
      resetAccess: "إعادة الصلاحية",
      decisionApproveTitle: "قبول الطلب",
      decisionRejectTitle: "رفض الطلب",
      approvalMessage: "رسالة الرد",
      defaultApproval: "Your application has been accepted, please attend on one of the specified dates.",
      mondayDate: "موعد مقابلة الاثنين",
      fridayDate: "موعد مقابلة الجمعة",
      rejectionReason: "سبب الرفض",
      saveDecision: "حفظ القرار",
      roleManagement: "إدارة حسابات الأدمن",
      roleManagementText: "للمالك والأدمن فقط. عيّن صلاحيات أدمن أو FTO أو إعلام أو IA أو متقدم للحسابات النشطة.",
      profileTitle: "إكمال ملف الحساب",
      profileSubtitle: "أضف الاسم واربط ديسكورد قبل استخدام أنظمة القيادة.",
      displayName: "اسم العرض",
      discordUserRequired: "مستخدم الديسكورد",
      saveProfile: "حفظ الملف",
      profileSaved: "تم حفظ الملف.",
      profileBlocked: "أكمل الاسم وربط ديسكورد قبل استخدام هذا النظام.",
      linkDiscordRequired: "اربط ديسكورد لإكمال ملف الحساب.",
      accountMenuLabel: "فتح الحساب",
      accountDetailsTitle: "تفاصيل الحساب",
      accountDetailsSubtitle: "إدارة الهوية والحماية والطلبات السابقة.",
      accountName: "اسم الحساب",
      accountEmail: "بريد الحساب",
      accountRole: "صلاحية الحساب",
      accountDiscord: "ديسكورد",
      discordLinked: "ديسكورد مربوط",
      discordMissing: "ديسكورد غير مربوط",
      linkDiscord: "ربط ديسكورد",
      discordLinkStarted: "تم فتح تفويض ديسكورد.",
      nameChangeTitle: "تغيير الاسم",
      newDisplayName: "اسم العرض الجديد",
      changeName: "تغيير الاسم",
      emailChangeTitle: "تغيير البريد",
      newEmail: "البريد الجديد",
      changeEmail: "تغيير البريد",
      emailUpdateSent: "تم حفظ تغيير البريد. تحقق من البريد إذا طلب Supabase التأكيد.",
      passwordChangeTitle: "تغيير كلمة المرور",
      newPassword: "كلمة المرور الجديدة",
      changePassword: "تغيير كلمة المرور",
      passwordUpdated: "تم تحديث كلمة المرور.",
      oldApplications: "الطلبات السابقة",
      noOldApplications: "لا توجد طلبات سابقة بعد.",
      userEmail: "بريد المستخدم",
      accountPassword: "كلمة مرور الحساب",
      role: "الصلاحية",
      saveRole: "حفظ الحساب",
      configuredUsers: "الحسابات المسجلة",
      noUsers: "لا توجد حسابات مسجلة بعد.",
      validationError: "أكمل الحقول المطلوبة قبل المتابعة.",
      loginSuccess: "تم تسجيل الدخول.",
      logoutSuccess: "تم تسجيل الخروج.",
      accountCreated: "تم إنشاء الحساب.",
      invalidLogin: "البريد أو كلمة المرور غير صحيحة.",
      accountExists: "يوجد حساب بهذا البريد مسبقاً.",
      webhookSent: "تم تنبيه ويب هوك ديسكورد.",
      webhookSkipped: "رابط ويب هوك ديسكورد غير مضبوط.",
      savedApplication: "تم إرسال الطلب وتحديث السجلات.",
      savedDecision: "تم حفظ القرار.",
      savedRole: "تم تحديث الصلاحية.",
      accountMustRegister: "يجب تسجيل هذا البريد أولاً قبل تعيين الصلاحية.",
      savedAsset: "تم الحفظ.",
      savedStream: "تم حفظ البث.",
      editMode: "تم فتح وضع تعديل العنصر.",
      reorderSaved: "تم تحديث الترتيب.",
      removed: "تم الحذف.",
      settingsTitle: "الإعدادات الشخصية",
      settingsSubtitle: "خصص واجهة القيادة المحلية.",
      settingsOpen: "فتح الإعدادات",
      sfxSetting: "المؤثرات الصوتية",
      sfxOn: "تشغيل",
      sfxOff: "إيقاف",
      fontSetting: "الخط",
      tabOrderSetting: "ترتيب التبويبات",
      colorRedSetting: "لون الأحمر",
      colorBlueSetting: "لون الأزرق",
      colorBgSetting: "الخلفية",
      colorTextSetting: "النص",
      resetUi: "إعادة ضبط الواجهة",
      moveUp: "رفع",
      moveDown: "خفض",
      settingsSaved: "تم حفظ الإعدادات.",
      deleteArchive: "حذف الأرشيف",
      confirmDeleteArchive: "حذف هذا السجل المؤرشف فقط؟",
      archiveDeleted: "تم حذف السجل المؤرشف.",
      databaseError: "فشل إجراء قاعدة البيانات. تحقق من أسماء الجداول وبيانات Supabase.",
      resetDone: "تم تصفير الأرشيف وفترات الانتظار.",
      pendingCleared: "تم مسح الطلبات المعلقة.",
      confirmClear: "هل تريد مسح كل الطلبات المعلقة في هذه القائمة؟",
      confirmReset: "هل تريد مسح سجلات القبول والرفض وتصفير فترات الانتظار؟",
      noPermission: "صلاحيتك الحالية لا تسمح بهذا الإجراء.",
      recruitmentLabel: "توظيف",
      transferLabel: "نقل",
      pending: "معلق",
      accepted: "مقبول",
      rejected: "مرفوض",
      submittedBy: "مقدم بواسطة {email}",
      submittedAt: "أرسل في {date}",
      decidedAt: "صدر القرار في {date}",
      decisionMessage: "رسالة القرار",
      interviewDates: "مواعيد المقابلة",
      reason: "السبب"
    }
  };

  const questionBank = {
    recruitment: [
      [
        q("full_name", "Full legal RP name", "الاسم الكامل داخل الرول بلاي", "text", true),
        q("contact_email", "Contact email", "البريد الإلكتروني للتواصل", "email", true),
        q("discord_id", "Discord ID", "معرف الديسكورد", "text", true),
        q("age", "Age", "العمر", "number", true),
        q("weekly_hours", "Expected weekly activity hours", "عدد ساعات النشاط الأسبوعية المتوقعة", "number", true),
        q("past_experience", "Past law enforcement or emergency service experience", "خبراتك السابقة في الشرطة أو الطوارئ", "textarea", true)
      ],
      [
        q("scenario_traffic_stop", "A driver refuses to exit during a felony traffic stop. What do you do?", "سائق يرفض النزول أثناء استيقاف جنائي. ماذا تفعل؟", "textarea", true),
        q("scenario_hostage", "How would you handle a hostage scene before SWAT or command arrives?", "كيف تتعامل مع حالة رهائن قبل وصول السوات أو القيادة؟", "textarea", true),
        q("lethal_force_policy", "When is lethal force justified under LSPD policy?", "متى يكون استخدام القوة القاتلة مبرراً وفق سياسة LSPD؟", "textarea", true),
        q("department_policy", "Explain why chain of command and radio discipline matter.", "اشرح أهمية التسلسل القيادي وانضباط الراديو.", "textarea", true),
        q("agreement", "I confirm that all answers are true and I agree to follow LSPD regulations.", "أقر بأن جميع الإجابات صحيحة وأوافق على الالتزام بلوائح LSPD.", "checkbox", true)
      ]
    ],
    transfer: [
      [
        q("full_name", "Full legal RP name", "الاسم الكامل داخل الرول بلاي", "text", true),
        q("contact_email", "Contact email", "البريد الإلكتروني للتواصل", "email", true),
        q("discord_id", "Discord ID", "معرف الديسكورد", "text", true),
        q("current_department", "Current or previous department", "القسم الحالي أو السابق", "text", true),
        q("current_rank", "Current or previous rank", "الرتبة الحالية أو السابقة", "text", true),
        q("weekly_hours", "Expected weekly activity hours", "عدد ساعات النشاط الأسبوعية المتوقعة", "number", true),
        q("transfer_reason", "Why are you requesting transfer into LSPD?", "لماذا ترغب في النقل إلى LSPD؟", "textarea", true)
      ],
      [
        q("scenario_internal_conflict", "A former colleague breaks policy in front of you. What do you do?", "زميل سابق يخالف السياسة أمامك. ماذا تفعل؟", "textarea", true),
        q("scenario_pursuit", "Describe safe pursuit spacing and when a PIT is appropriate.", "اشرح مسافة المطاردة الآمنة ومتى تكون PIT مناسبة.", "textarea", true),
        q("lethal_force_policy", "When is lethal force justified under LSPD policy?", "متى يكون استخدام القوة القاتلة مبرراً وفق سياسة LSPD؟", "textarea", true),
        q("department_policy", "How will you adapt to LSPD chain of command and SOP?", "كيف ستتأقلم مع التسلسل القيادي ودليل الإجراءات في LSPD؟", "textarea", true),
        q("agreement", "I confirm that all transfer details are true and I accept LSPD command review.", "أقر بصحة تفاصيل النقل وأوافق على مراجعة قيادة LSPD.", "checkbox", true)
      ]
    ]
  };

  function q(key, en, ar, type, required) {
    return { key, label: { en, ar }, type, required: Boolean(required) };
  }

  function getLang() {
    return typeof currentLanguage !== "undefined" ? currentLanguage : "en";
  }

  function tr(key, values) {
    const lang = getLang();
    const source = (portalCopy[lang] && portalCopy[lang][key]) || (portalCopy.en && portalCopy.en[key]) || key;
    return source.replace(/\{(\w+)\}/g, function (_, token) {
      return values && values[token] != null ? values[token] : "";
    });
  }

  function installPortalDom() {
    applyPublicConfig();
    installStylesheet();
    extendCopy();
    installFirstTownBrand();
    installWorkspaceNav();
    installIdentityBar();
    installViews();
    installRegulationManager();
    installSettingsPanel();
    installFooterCredits();
    overrideLanguage();
    overrideWorkspace();
    bindPortalEvents();
  }

  function applyPublicConfig() {
    const assets = PUBLIC_CONFIG.assets || {};
    const root = document.documentElement;
    if (assets.hubBackground) root.style.setProperty("--hub-background-image", 'url("' + cssUrl(assets.hubBackground) + '")');
    if (assets.sopBackground) root.style.setProperty("--sop-background-image", 'url("' + cssUrl(assets.sopBackground) + '")');
    const portrait = document.querySelector(".chief-portrait");
    if (portrait && assets.policeChiefPortrait) portrait.src = assets.policeChiefPortrait;
  }

  function cssUrl(value) {
    return String(value || "").replace(/["'()\\\n\r]/g, "");
  }

  function installFirstTownBrand() {
    document.querySelectorAll(".first-town-header-logo").forEach(function (node) { node.remove(); });
  }

  function installStylesheet() {
    ensureStylesheet("ftlspd-portal.css?v=20260920b");
    ensureStylesheet("ftlspd-custom.css?v=20260920b");
  }

  function ensureStylesheet(href) {
    const baseHref = href.split("?")[0];
    const existing = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(function (link) {
      return String(link.getAttribute("href") || "").split("?")[0] === baseHref;
    });
    if (existing) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function extendCopy() {
    if (typeof copy === "undefined") return;
    Object.assign(copy.en, portalCopy.en);
    Object.assign(copy.ar, portalCopy.ar);
  }

  function installWorkspaceNav() {
    const nav = document.querySelector(".workspace-nav");
    if (!nav) return;
    const tabs = orderedWorkspaceTabs();
    nav.innerHTML = tabs.map(function (tab) {
      return '<button id="workspace-' + tab[0] + '" class="workspace-tab" onclick="setWorkspace(\'' + tab[0] + '\')" type="button" aria-selected="' + (tab[0] === "recruitment") + '"><i class="fa-solid ' + tab[1] + '"></i><span data-i18n="' + tab[2] + '">' + tr(tab[2]) + "</span></button>";
    }).join("");
    updateAdminTabVisibility();
  }

  function installIdentityBar() {
    const topActions = document.querySelector(".top-actions");
    if (!topActions || document.getElementById("identityBar")) return;
    const brand = document.querySelector(".brand");
    if (brand && !document.getElementById("presenceBadge")) {
      brand.insertAdjacentHTML("afterbegin", '<span id="presenceBadge" class="presence-badge" title="' + safeAttr(tr("activeUsers", { n: 1 })) + '"><i class="fa-solid fa-users"></i><strong id="presenceCount">1</strong></span>');
    }
    topActions.insertAdjacentHTML("afterbegin", [
      '<div id="identityBar" class="identity-bar">',
      '<input id="authEmailInput" class="hidden" type="email" tabindex="-1" aria-hidden="true">',
      '<input id="authPasswordInput" class="hidden" type="password" tabindex="-1" aria-hidden="true">',
      '<button id="loginButton" class="auth-mini-button" type="button" data-i18n="login">' + safe(tr("login")) + '</button>',
      '<button id="createAccountButton" class="auth-mini-button" type="button" data-i18n="createAccount">' + safe(tr("createAccount")) + '</button>',
      '<button id="accountMenuButton" class="account-circle-button hidden" type="button" aria-label="' + safeAttr(tr("accountMenuLabel")) + '"><span id="accountAvatar" class="account-avatar"><i class="fa-solid fa-user"></i></span></button>',
      '<button id="logoutButton" class="auth-mini-button hidden" type="button" data-i18n="logout">' + safe(tr("logout")) + '</button>',
      '<span id="roleBadge" class="role-badge">' + safe(tr("roleGuest")) + '</span>',
      '<button id="roleManagerButton" class="role-manage-button hidden" type="button" aria-label="' + safe(tr("roleManagerLabel")) + '"><i class="fa-solid fa-user-shield"></i></button>',
      "</div>",
    ].join(""));
    const input = document.getElementById("authEmailInput");
    if (input) input.value = state.userEmail;
  }

  function installViews() {
    if (document.getElementById("recruitmentView")) return;
    const footer = document.getElementById("regulationsFooter");
    if (!footer) return;
    footer.insertAdjacentHTML("beforebegin", [
      welcomeModalHtml(),
      recruitmentViewHtml(),
      dashboardViewHtml(),
      reviewViewHtml(),
      archivesViewHtml(),
      ftoViewHtml(),
      scheduleViewHtml(),
      crewViewHtml(),
      mediaViewHtml(),
      streamsViewHtml(),
      creditsViewHtml(),
      applicationModalHtml(),
      transferRulesModalHtml(),
      decisionModalHtml(),
      profileModalHtml(),
      accountModalHtml(),
      roleModalHtml(),
      '<div id="toastStack" class="toast-stack" aria-live="polite"></div>'
    ].join(""));
  }

  function installRegulationManager() {
    const content = document.querySelector("#regulationsView .content");
    if (!content || document.getElementById("regulationForm")) return;
    const header = content.querySelector(".content-header");
    if (!header) return;
    header.insertAdjacentHTML("afterend", [
      '<form id="regulationForm" class="asset-form regulation-admin-form hidden">',
      '<div class="form-copy"><h3 data-i18n="regulationsAdminTitle">' + safe(tr("regulationsAdminTitle")) + '</h3><p data-i18n="regulationsAdminSubtitle">' + safe(tr("regulationsAdminSubtitle")) + '</p></div>',
      '<select class="portal-select" name="degree" required>' + [1, 2, 3, 4, 5, 6, 7, 0].map(function (degree) { return '<option value="' + degree + '">' + safe(tr("regulationDegree")) + ' ' + degree + '</option>'; }).join("") + '</select>',
      '<input class="portal-input" name="title" data-i18n-placeholder="regulationTitle" placeholder="' + safe(tr("regulationTitle")) + '" required>',
      '<textarea class="portal-textarea wide" name="description" data-i18n-placeholder="regulationDescription" placeholder="' + safe(tr("regulationDescription")) + '" required></textarea>',
      '<button class="portal-button success" type="submit"><i class="fa-solid fa-plus"></i><span data-i18n="addRegulation">' + safe(tr("addRegulation")) + '</span></button>',
      '</form>'
    ].join(""));
  }

  function welcomeModalHtml() {
    return [
      '<div id="welcomeModal" class="modal-backdrop hidden">',
      '<section class="welcome-shell" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle">',
      '<div class="welcome-visual">',
      '<div class="first-town-orbit"><img class="first-town-logo first-town-logo-xl" src="lspd-shield.png" alt="First Town logo"></div>',
      '<p class="portal-kicker" data-i18n="welcomeKicker">' + safe(tr("welcomeKicker")) + '</p>',
      '<h2 id="welcomeTitle" class="welcome-title" data-i18n-html="welcomeTitle">' + tr("welcomeTitle") + '</h2>',
      '</div>',
      '<aside class="welcome-side">',
      '<div><div class="dual-badge-row"></div><p data-i18n="welcomeText">' + safe(tr("welcomeText")) + '</p></div>',
      '<div class="portal-action-row">',
      '<a class="portal-button primary" href="' + safe(SERVER_CONNECT_URL) + '"><i class="fa-solid fa-gamepad"></i><span data-i18n="connectFiveM">' + safe(tr("connectFiveM")) + '</span></a>',
      '<button id="enterPortalButton" class="portal-button ghost" type="button"><i class="fa-solid fa-right-to-bracket"></i><span data-i18n="enterPortal">' + safe(tr("enterPortal")) + '</span></button>',
      '</div>',
      '</aside>',
      '</section>',
      '</div>'
    ].join("");
  }

  function recruitmentViewHtml() {
    return [
      '<section id="recruitmentView" class="portal-view" aria-labelledby="recruitmentTitle">',
      '<div class="portal-shell">',
      '<section class="portal-hero">',
      '<div>',
      '<img class="first-town-logo hub-logo" src="lspd-shield.png" alt="First Town logo">',
      '<p class="portal-kicker" data-i18n="recruitmentKicker">' + safe(tr("recruitmentKicker")) + '</p>',
      '<h2 id="recruitmentTitle" class="portal-title" data-i18n-html="recruitmentTitle">' + tr("recruitmentTitle") + '</h2>',
      '<p class="portal-copy" data-i18n="recruitmentCopy">' + safe(tr("recruitmentCopy")) + '</p>',
      '<div class="portal-action-row">',
      '<a class="portal-button primary" href="' + safe(SERVER_CONNECT_URL) + '"><i class="fa-solid fa-gamepad"></i><span data-i18n="connectFiveM">' + safe(tr("connectFiveM")) + '</span></a>',
      '<button class="portal-button success" type="button" data-jump-fto="recruitment"><i class="fa-solid fa-user-plus"></i><span data-i18n="goToFtoRecruitment">' + safe(tr("goToFtoRecruitment")) + '</span></button>',
      '<button class="portal-button" type="button" data-jump-fto="transfer"><i class="fa-solid fa-right-left"></i><span data-i18n="goToFtoTransfer">' + safe(tr("goToFtoTransfer")) + '</span></button>',
      '</div>',
      '</div>',
      '<div class="hero-stack">',
      metricHtml("fa-database", "metricRealtime", "metricRealtimeText"),
      metricHtml("fa-user-shield", "metricRoles", "metricRolesText"),
      metricHtml("fa-hourglass-half", "metricCooldown", "metricCooldownText"),
      '</div>',
      '</section>',
      '<div id="cooldownBanner" class="cooldown-banner hidden"><i class="fa-solid fa-triangle-exclamation"></i><span></span></div>',
      '<section class="overview-box" lang="ar" dir="rtl"><h3 data-i18n="overviewTitle">' + safe(tr("overviewTitle")) + '</h3><p data-i18n="overviewText">' + safe(tr("overviewText")) + '</p></section>',
      '<section class="portal-actions-grid">',
      actionCardHtml("fa-user-plus", "goToFtoRecruitment", "ftoApplyText", "recruitment"),
      actionCardHtml("fa-right-left", "goToFtoTransfer", "ftoApplyText", "transfer"),
      '</section>',
      '<section class="status-panel"><h3 data-i18n="activeStatus">' + safe(tr("activeStatus")) + '</h3><div id="applicantStatusCards"></div></section>',
      '</div>',
      '</section>'
    ].join("");
  }

  function metricHtml(icon, titleKey, textKey) {
    return '<div class="hero-metric"><i class="fa-solid ' + icon + '"></i><div><strong data-i18n="' + titleKey + '">' + safe(tr(titleKey)) + '</strong><span data-i18n="' + textKey + '">' + safe(tr(textKey)) + "</span></div></div>";
  }

  function actionCardHtml(icon, titleKey, textKey, type) {
    return [
      '<article class="action-card">',
      '<i class="fa-solid ' + icon + '"></i>',
      '<div><h3 data-i18n="' + titleKey + '">' + safe(tr(titleKey)) + '</h3><p data-i18n="' + textKey + '">' + safe(tr(textKey)) + '</p>',
      '<button class="portal-button ghost" type="button" data-jump-fto="' + type + '"><i class="fa-solid fa-arrow-down"></i><span data-i18n="' + (type === "transfer" ? "goToFtoTransfer" : "goToFtoRecruitment") + '">' + safe(tr(type === "transfer" ? "goToFtoTransfer" : "goToFtoRecruitment")) + '</span></button></div>',
      '</article>'
    ].join("");
  }

  function dashboardViewHtml() {
    return [
      '<section id="dashboardView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="workspaceDashboard">' + safe(tr("workspaceDashboard")) + '</p><h2 data-i18n="dashboardTitle">' + safe(tr("dashboardTitle")) + '</h2><p data-i18n="dashboardSubtitle">' + safe(tr("dashboardSubtitle")) + '</p></div></div>',
      '<section class="dashboard-grid">',
      dashboardMetricHtml("dashboardPendingMetric", "fa-inbox", "dashboardApplications"),
      dashboardMetricHtml("dashboardArchiveMetric", "fa-box-archive", "dashboardArchives"),
      dashboardMetricHtml("dashboardScheduleMetric", "fa-id-card-clip", "dashboardPersonnel"),
      dashboardMetricHtml("dashboardMediaMetric", "fa-photo-film", "dashboardMedia"),
      '</section>',
      '<section class="portal-panel dashboard-controls"><h3 data-i18n="dashboardQuickActions">' + safe(tr("dashboardQuickActions")) + '</h3><div class="portal-action-row">',
      '<button class="portal-button primary" type="button" onclick="setWorkspace(\'review\')"><i class="fa-solid fa-clipboard-check"></i><span data-i18n="dashboardOpenReview">' + safe(tr("dashboardOpenReview")) + '</span></button>',
      '<button class="portal-button" type="button" onclick="setWorkspace(\'archives\')"><i class="fa-solid fa-box-archive"></i><span data-i18n="dashboardOpenArchives">' + safe(tr("dashboardOpenArchives")) + '</span></button>',
      '<button class="portal-button" type="button" onclick="setWorkspace(\'schedule\')"><i class="fa-solid fa-table-list"></i><span data-i18n="dashboardOpenSchedule">' + safe(tr("dashboardOpenSchedule")) + '</span></button>',
      '<button id="dashboardRoleButton" class="portal-button ghost" type="button"><i class="fa-solid fa-user-shield"></i><span data-i18n="dashboardOpenRoles">' + safe(tr("dashboardOpenRoles")) + '</span></button>',
      '</div></section>',
      '<section class="status-panel"><h3 data-i18n="activeStatus">' + safe(tr("activeStatus")) + '</h3><div id="dashboardRecentList" class="portal-shell"></div></section>',
      '</section>'
    ].join("");
  }

  function dashboardMetricHtml(id, icon, labelKey) {
    return '<article class="dashboard-metric"><i class="fa-solid ' + icon + '"></i><span id="' + id + '">0</span><strong data-i18n="' + labelKey + '">' + safe(tr(labelKey)) + '</strong></article>';
  }

  function reviewViewHtml() {
    return [
      '<section id="reviewView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="workspaceReview">' + safe(tr("workspaceReview")) + '</p><h2 data-i18n="reviewTitle">' + safe(tr("reviewTitle")) + '</h2><p data-i18n="reviewSubtitle">' + safe(tr("reviewSubtitle")) + '</p></div><button id="clearPendingButton" class="portal-button danger hidden" type="button"><i class="fa-solid fa-trash-can"></i><span data-i18n="clearPending">' + safe(tr("clearPending")) + '</span></button></div>',
      '<div class="subtabs"><button class="subtab" type="button" data-review-type="recruitment" aria-selected="true"><i class="fa-solid fa-user-plus"></i><span data-i18n="newRecruitment">' + safe(tr("newRecruitment")) + '</span></button><button class="subtab" type="button" data-review-type="transfer" aria-selected="false"><i class="fa-solid fa-right-left"></i><span data-i18n="transferRequests">' + safe(tr("transferRequests")) + '</span></button></div>',
      '<div class="toolbar"><input id="reviewSearchInput" class="portal-input" type="search" data-i18n-placeholder="searchApplications" placeholder="' + safe(tr("searchApplications")) + '"><span id="reviewCount" class="role-badge">0</span></div>',
      '<div id="reviewList" class="portal-shell"></div>',
      '</section>'
    ].join("");
  }

  function archivesViewHtml() {
    return [
      '<section id="archivesView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="workspaceArchives">' + safe(tr("workspaceArchives")) + '</p><h2 data-i18n="archivesTitle">' + safe(tr("archivesTitle")) + '</h2><p data-i18n="archivesSubtitle">' + safe(tr("archivesSubtitle")) + '</p></div><button id="fullResetButton" class="portal-button danger hidden" type="button"><i class="fa-solid fa-bolt"></i><span data-i18n="fullReset">' + safe(tr("fullReset")) + '</span></button></div>',
      '<div class="subtabs">',
      archiveButton("accepted-recruitment", "acceptedRecruitment", "fa-user-check", true),
      archiveButton("accepted-transfer", "acceptedTransfers", "fa-right-left", false),
      archiveButton("rejected-recruitment", "rejectedRecruitment", "fa-user-xmark", false),
      archiveButton("rejected-transfer", "rejectedTransfers", "fa-ban", false),
      '</div>',
      '<div id="archiveList" class="portal-shell"></div>',
      '</section>'
    ].join("");
  }

  function archiveButton(key, label, icon, selected) {
    return '<button class="subtab" type="button" data-archive-type="' + key + '" aria-selected="' + selected + '"><i class="fa-solid ' + icon + '"></i><span data-i18n="' + label + '">' + safe(tr(label)) + "</span></button>";
  }

  function ftoViewHtml() {
    return [
      '<section id="ftoView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="workspaceFto">' + safe(tr("workspaceFto")) + '</p><h2 data-i18n="ftoTitle">' + safe(tr("ftoTitle")) + '</h2><p data-i18n="ftoSubtitle">' + safe(tr("ftoSubtitle")) + '</p></div></div>',
      '<section id="ftoApplicationDesk" class="portal-panel fto-apply-desk"><div><h3 data-i18n="ftoApplyTitle">' + safe(tr("ftoApplyTitle")) + '</h3><p data-i18n="ftoApplyText">' + safe(tr("ftoApplyText")) + '</p></div><div class="portal-action-row"><button class="portal-button success" type="button" data-open-application="recruitment"><i class="fa-solid fa-user-plus"></i><span data-i18n="applyRecruitment">' + safe(tr("applyRecruitment")) + '</span></button><button class="portal-button" type="button" data-open-application="transfer"><i class="fa-solid fa-right-left"></i><span data-i18n="submitTransfer">' + safe(tr("submitTransfer")) + '</span></button></div></section>',
      '<div class="fto-grid">',
      ftoCard("fa-compass", "ftoPhaseOne", "ftoPhaseOneText"),
      ftoCard("fa-car-side", "ftoPhaseTwo", "ftoPhaseTwoText"),
      ftoCard("fa-file", "ftoPhaseThree", "ftoPhaseThreeText"),
      '</div>',
      '</section>'
    ].join("");
  }

  function ftoCard(icon, titleKey, textKey) {
    return '<article class="fto-card"><i class="fa-solid ' + icon + '"></i><h3 data-i18n="' + titleKey + '">' + safe(tr(titleKey)) + '</h3><p data-i18n="' + textKey + '">' + safe(tr(textKey)) + "</p></article>";
  }

  function scheduleViewHtml() {
    return [
      '<section id="scheduleView" class="portal-view hidden">',
      '<div class="section-head schedule-head"><div><p class="portal-kicker" data-i18n="workspaceSchedule">' + safe(tr("workspaceSchedule")) + '</p><h2 data-i18n="scheduleTitle">' + safe(tr("scheduleTitle")) + '</h2><p data-i18n="scheduleSubtitle">' + safe(tr("scheduleSubtitle")) + '</p></div><span id="scheduleTotalBadge" class="role-badge">0</span></div>',
      '<form id="scheduleForm" class="asset-form schedule-form hidden">',
      '<input class="portal-input" name="badge_number" data-i18n-placeholder="badgeNumber" placeholder="' + safe(tr("badgeNumber")) + '" required>',
      '<input class="portal-input" name="name" data-i18n-placeholder="name" placeholder="' + safe(tr("name")) + '" required>',
      '<select class="portal-select" name="rank" required>' + policeRanks.map(function (rank) { return '<option value="' + safeAttr(rank) + '">' + safe(rank) + '</option>'; }).join("") + '</select>',
      '<input class="portal-input" name="department" data-i18n-placeholder="department" placeholder="' + safe(tr("department")) + '">',
      '<input class="portal-input" name="admin_rank" data-i18n-placeholder="adminRank" placeholder="' + safe(tr("adminRank")) + '">',
      '<select class="portal-select" name="status"><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="LOA">LOA</option><option value="SUSPENDED">SUSPENDED</option></select>',
      '<input class="portal-input" name="punishment" data-i18n-placeholder="punishment" placeholder="' + safe(tr("punishment")) + '">',
      '<input class="portal-input" name="last_promotion" data-i18n-placeholder="lastPromotion" placeholder="' + safe(tr("lastPromotion")) + '">',
      '<input class="portal-input" name="discord_user" data-i18n-placeholder="discordUser" placeholder="' + safe(tr("discordUser")) + '">',
      '<input class="portal-input" name="points" data-i18n-placeholder="points" placeholder="' + safe(tr("points")) + '">',
      '<input class="portal-input" name="privilege_points" data-i18n-placeholder="privilegePoints" placeholder="' + safe(tr("privilegePoints")) + '">',
      '<input class="portal-input wide" name="insignia_url" data-i18n-placeholder="scheduleInsigniaUrl" placeholder="' + safe(tr("scheduleInsigniaUrl")) + '">',
      '<label class="file-field"><span data-i18n="scheduleInsigniaFile">' + safe(tr("scheduleInsigniaFile")) + '</span><input name="insignia_file" type="file" accept="image/png,image/*"></label>',
      '<fieldset class="wing-field"><legend data-i18n="wings">' + safe(tr("wings")) + '</legend>' + scheduleWings.map(function (wing) { return '<label><input type="checkbox" name="wing_' + safeAttr(wing[0]) + '"><span>' + safe(wing[1]) + '</span></label>'; }).join("") + '</fieldset>',
      '<button id="scheduleSaveButton" class="portal-button success" type="submit"><i class="fa-solid fa-plus"></i><span data-i18n="scheduleAdd">' + safe(tr("scheduleAdd")) + '</span></button>',
      '<button id="scheduleCancelEditButton" class="portal-button ghost hidden" type="button"><i class="fa-solid fa-ban"></i><span data-i18n="cancel">' + safe(tr("cancel")) + '</span></button>',
      '</form>',
      '<div class="schedule-table-wrap"><table class="schedule-table"><thead><tr><th>#BN</th><th data-i18n="name">' + safe(tr("name")) + '</th><th>INSIGNIA</th><th data-i18n="rank">' + safe(tr("rank")) + '</th><th data-i18n="department">' + safe(tr("department")) + '</th><th data-i18n="adminRank">' + safe(tr("adminRank")) + '</th><th data-i18n="status">' + safe(tr("status")) + '</th><th data-i18n="punishment">' + safe(tr("punishment")) + '</th><th data-i18n="lastPromotion">' + safe(tr("lastPromotion")) + '</th><th>USER</th><th data-i18n="points">' + safe(tr("points")) + '</th><th>PRIVILEGE</th><th class="schedule-admin-col"></th></tr></thead><tbody id="scheduleTableBody"></tbody></table></div>',
      '</section>'
    ].join("");
  }

  function crewViewHtml() {
    return [
      '<section id="crewView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="workspaceCrew">' + safe(tr("workspaceCrew")) + '</p><h2 data-i18n="crewTitle">' + safe(tr("crewTitle")) + '</h2><p data-i18n="crewSubtitle">' + safe(tr("crewSubtitle")) + '</p></div></div>',
      policeChiefFeatureHtml(),
      '<div class="crew-directory-head"><div><p class="portal-kicker" data-i18n="workspaceCrew">' + safe(tr("workspaceCrew")) + '</p><h3 data-i18n="crewDirectoryTitle">' + safe(tr("crewDirectoryTitle")) + '</h3><p data-i18n="crewDirectorySubtitle">' + safe(tr("crewDirectorySubtitle")) + '</p></div></div>',
      '<form id="crewForm" class="asset-form hidden">',
      '<input class="portal-input" name="title" data-i18n-placeholder="name" placeholder="' + safe(tr("name")) + '" required>',
      '<input class="portal-input" name="subtitle" data-i18n-placeholder="rank" placeholder="' + safe(tr("rank")) + '" required>',
      '<input class="portal-input" name="discord_id" data-i18n-placeholder="discordId" placeholder="' + safe(tr("discordId")) + '" required>',
      '<input class="portal-input wide" name="photo_url" data-i18n-placeholder="photoUrl" placeholder="' + safe(tr("photoUrl")) + '" required>',
      '<button id="crewSaveButton" class="portal-button success" type="submit"><i class="fa-solid fa-plus"></i><span data-i18n="addCrew">' + safe(tr("addCrew")) + '</span></button>',
      '<button id="crewCancelEditButton" class="portal-button ghost hidden" type="button" data-cancel-asset-edit="crew"><i class="fa-solid fa-ban"></i><span data-i18n="cancel">' + safe(tr("cancel")) + '</span></button>',
      '</form>',
      '<div id="crewGrid" class="asset-grid"></div>',
      '</section>'
    ].join("");
  }

  function policeChiefFeatureHtml() {
    const chief = PUBLIC_CONFIG.policeChief || {};
    const assets = PUBLIC_CONFIG.assets || {};
    const firstName = chief.firstName || "MURPHY";
    const lastName = chief.lastName || "EDWARD";
    const title = chief.title || (firstName + " " + lastName);
    const details = Array.isArray(chief.details) ? chief.details.slice(0, 3) : [];
    const detailHtml = details.map(function (detail) {
      return '<div class="chief-detail"><dt>' + safe(detail.label || "DETAIL") + '</dt><dd>' + safe(detail.value || "Placeholder") + '</dd></div>';
    }).join("");

    return [
      '<section class="crew-chief-feature" aria-labelledby="policeChiefTitle">',
      '<div class="police-chief-hero" data-chief-hero>',
      '<div class="chief-background-name" aria-hidden="true"><span>' + safe(firstName) + '</span><span>' + safe(lastName) + '</span></div>',
      '<div class="chief-information">',
      '<p class="chief-rank">' + safe(chief.rank || "CHIEF OF POLICE") + '</p>',
      '<h2 id="policeChiefTitle">' + safe(title) + '</h2>',
      '<p class="chief-introduction">' + safe(chief.introduction || "") + '</p>',
      '<dl class="chief-detail-list">' + detailHtml + '</dl>',
      '</div>',
      '<div class="chief-portrait-wrap" aria-hidden="true"><div class="chief-portrait-aura"></div><img class="chief-portrait" src="' + safeAttr(assets.policeChiefPortrait || "murphy-edward-cutout.webp") + '" alt="' + safeAttr(title + ", Chief of Police") + '"></div>',
      '<p class="chief-serial" aria-hidden="true">LSPD // OFFICE OF THE CHIEF // 01</p>',
      '</div>',
      '</section>'
    ].join("");
  }

  function mediaViewHtml() {
    return [
      '<section id="mediaView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="workspaceMedia">' + safe(tr("workspaceMedia")) + '</p><h2 data-i18n="mediaTitle">' + safe(tr("mediaTitle")) + '</h2><p data-i18n="mediaSubtitle">' + safe(tr("mediaSubtitle")) + '</p></div></div>',
      '<form id="mediaForm" class="asset-form hidden">',
      '<input class="portal-input" name="title" data-i18n-placeholder="title" placeholder="' + safe(tr("title")) + '" required>',
      '<input class="portal-input wide" name="photo_url" data-i18n-placeholder="mediaUrl" placeholder="' + safe(tr("mediaUrl")) + '">',
      '<label class="file-field"><span data-i18n="mediaFile">' + safe(tr("mediaFile")) + '</span><input name="media_file" type="file" accept="image/*,image/gif,video/mp4"></label>',
      '<input class="portal-input wide" name="caption" data-i18n-placeholder="caption" placeholder="' + safe(tr("caption")) + '">',
      '<button id="mediaSaveButton" class="portal-button success" type="submit"><i class="fa-solid fa-plus"></i><span data-i18n="addMedia">' + safe(tr("addMedia")) + '</span></button>',
      '<button id="mediaCancelEditButton" class="portal-button ghost hidden" type="button" data-cancel-asset-edit="media"><i class="fa-solid fa-ban"></i><span data-i18n="cancel">' + safe(tr("cancel")) + '</span></button>',
      '</form>',
      '<div id="mediaGrid" class="asset-grid"></div>',
      '</section>'
    ].join("");
  }

  function streamsViewHtml() {
    return [
      '<section id="streamsView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="workspaceStreams">' + safe(tr("workspaceStreams")) + '</p><h2 data-i18n="streamsTitle">' + safe(tr("streamsTitle")) + '</h2><p data-i18n="streamsSubtitle">' + safe(tr("streamsSubtitle")) + '</p></div><span class="role-badge"><i class="fa-solid fa-arrows-rotate"></i><span data-i18n="streamAutoRefresh">' + safe(tr("streamAutoRefresh")) + '</span></span></div>',
      '<form id="streamForm" class="asset-form hidden">',
      '<input class="portal-input" name="name" data-i18n-placeholder="name" placeholder="' + safe(tr("name")) + '" required>',
      '<input class="portal-input wide" name="logo_url" data-i18n-placeholder="logoUrl" placeholder="' + safe(tr("logoUrl")) + '" required>',
      '<input class="portal-input wide" name="kick_url" data-i18n-placeholder="kickUrl" placeholder="' + safe(tr("kickUrl")) + '" required>',
      '<button id="streamSaveButton" class="portal-button success" type="submit"><i class="fa-solid fa-plus"></i><span data-i18n="addStream">' + safe(tr("addStream")) + '</span></button>',
      '<button id="streamCancelEditButton" class="portal-button ghost hidden" type="button"><i class="fa-solid fa-ban"></i><span data-i18n="cancel">' + safe(tr("cancel")) + '</span></button>',
      '</form>',
      '<div id="streamsGrid" class="stream-grid"></div>',
      '</section>'
    ].join("");
  }

  function creditsViewHtml() {
    return [
      '<section id="creditsView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="creditsKicker">' + safe(tr("creditsKicker")) + '</p><h2 data-i18n="creditsTitle">' + safe(tr("creditsTitle")) + '</h2><p data-i18n="creditsSubtitle">' + safe(tr("creditsSubtitle")) + '</p></div></div>',
      '<section class="credits-command">',
      '<article class="credit-card primary-credit"><i class="fa-solid fa-code"></i><span>HEAD DEVELOPER</span><h3 data-i18n="creditMajedTitle">' + safe(tr("creditMajedTitle")) + '</h3><p data-i18n="creditMajedRole">' + safe(tr("creditMajedRole")) + '</p></article>',
      '<article class="credit-card primary-credit"><i class="fa-solid fa-star"></i><span>CHIEF COMMAND</span><h3 data-i18n="creditMurphyTitle">' + safe(tr("creditMurphyTitle")) + '</h3><p data-i18n="creditMurphyRole">' + safe(tr("creditMurphyRole")) + '</p></article>',
      '<article class="credit-card primary-credit"><i class="fa-solid fa-code"></i><span>DEV SUPPORT</span><h3 data-i18n="creditMohsenTitle">' + safe(tr("creditMohsenTitle")) + '</h3><p data-i18n="creditMohsenRole">' + safe(tr("creditMohsenRole")) + '</p></article>',
      '<article class="credit-brief"><p data-i18n="creditBody">' + safe(tr("creditBody")) + '</p><div class="credit-chips"><span data-i18n="creditLocal">' + safe(tr("creditLocal")) + '</span><span data-i18n="creditStack">' + safe(tr("creditStack")) + '</span></div></article>',
      '</section>',
      '</section>'
    ].join("");
  }

  function installSettingsPanel() {
    if (document.getElementById("uiSettingsDock")) return;
    document.body.insertAdjacentHTML("beforeend", [
      '<aside id="uiSettingsDock" class="settings-dock">',
      '<button id="settingsToggleButton" class="settings-toggle" type="button" aria-label="' + safeAttr(tr("settingsOpen")) + '"><i class="fa-solid fa-sliders"></i></button>',
      '<section id="settingsPanel" class="settings-panel hidden">',
      '<header><div><h3 data-i18n="settingsTitle">' + safe(tr("settingsTitle")) + '</h3><p data-i18n="settingsSubtitle">' + safe(tr("settingsSubtitle")) + '</p></div><button class="icon-action" id="settingsCloseButton" type="button"><i class="fa-solid fa-xmark"></i></button></header>',
      '<div class="settings-grid">',
      '<label><span data-i18n="fontSetting">' + safe(tr("fontSetting")) + '</span><select id="fontSettingInput" class="portal-select"><option value="Inter, Arial, sans-serif">Inter</option><option value="Orbitron, Inter, sans-serif">Orbitron</option><option value="Share Tech Mono, monospace">Share Tech Mono</option><option value="Cairo, Arial, sans-serif">Cairo</option><option value="Arial, sans-serif">Arial</option></select></label>',
      '<label><span data-i18n="colorRedSetting">' + safe(tr("colorRedSetting")) + '</span><input id="redSettingInput" type="color" value="#e7515a"></label>',
      '<label><span data-i18n="colorBlueSetting">' + safe(tr("colorBlueSetting")) + '</span><input id="blueSettingInput" type="color" value="#3aa7ff"></label>',
      '<label><span data-i18n="colorBgSetting">' + safe(tr("colorBgSetting")) + '</span><input id="bgSettingInput" type="color" value="#01040b"></label>',
      '<label><span data-i18n="colorTextSetting">' + safe(tr("colorTextSetting")) + '</span><input id="textSettingInput" type="color" value="#edf7ff"></label>',
      '</div>',
      '<label class="sfx-toggle-row"><span class="sfx-setting-label"><i class="fa-solid fa-wave-square"></i><span data-i18n="sfxSetting">' + safe(tr("sfxSetting")) + '</span></span><button id="sfxToggleButton" class="sfx-toggle" type="button" aria-pressed="true" aria-label="' + safeAttr(tr("sfxSetting")) + '"><i class="fa-solid fa-volume-high"></i><span id="sfxToggleText">' + safe(tr("sfxOn")) + '</span></button></label>',
      '<div class="tab-order-head"><span data-i18n="tabOrderSetting">' + safe(tr("tabOrderSetting")) + '</span></div>',
      '<div id="tabOrderList" class="tab-order-list"></div>',
      '<button id="resetUiButton" class="portal-button danger" type="button"><i class="fa-solid fa-rotate-left"></i><span data-i18n="resetUi">' + safe(tr("resetUi")) + '</span></button>',
      '</section>',
      '</aside>'
    ].join(""));
    renderSettingsPanel();
  }

  function applicationModalHtml() {
    return [
      '<div id="applicationModal" class="modal-backdrop hidden">',
      '<form id="applicationForm" class="modal-shell" novalidate>',
      '<header class="modal-head"><div><h2 id="applicationModalTitle"></h2><p id="applicationStepText"></p></div><button class="icon-action" type="button" data-close-modal="applicationModal" aria-label="' + safe(tr("close")) + '"><i class="fa-solid fa-xmark"></i></button></header>',
      '<div id="applicationFields" class="modal-body field-grid"></div>',
      '<div class="modal-actions"><button id="applicationBackButton" class="portal-button ghost" type="button"><i class="fa-solid fa-arrow-left"></i><span data-i18n="back">' + safe(tr("back")) + '</span></button><button id="applicationNextButton" class="portal-button primary" type="button"><span data-i18n="next">' + safe(tr("next")) + '</span><i class="fa-solid fa-arrow-right"></i></button><button id="applicationSubmitButton" class="portal-button success hidden" type="submit"><i class="fa-solid fa-paper-plane"></i><span data-i18n="submitApplication">' + safe(tr("submitApplication")) + '</span></button></div>',
      '</form>',
      '</div>'
    ].join("");
  }

  function transferRulesModalHtml() {
    return [
      '<div id="transferRulesModal" class="modal-backdrop hidden">',
      '<section class="modal-shell transfer-rules-shell" role="dialog" aria-modal="true">',
      '<header class="modal-head"><div><h2 data-i18n="transferRulesTitle">' + safe(tr("transferRulesTitle")) + '</h2><p data-i18n="transferRulesSubtitle">' + safe(tr("transferRulesSubtitle")) + '</p></div><button class="icon-action" type="button" data-close-modal="transferRulesModal" aria-label="' + safe(tr("close")) + '"><i class="fa-solid fa-xmark"></i></button></header>',
      '<div class="modal-body transfer-rules-body" lang="ar" dir="rtl">',
      '<h3>Police Department - Transfer Division Announcement</h3>',
      '<p>تعلن ادارة الشرطة عن فتح باب الانضمام للشرطة عن طريق ( النقل الشرطي )</p>',
      '<ul>',
      '<li>ان يكون المتقدم للنقل عمره 17 سنه فأعلى</li>',
      '<li>ان يكون صاحب خبره اداريه في اغلب الاقسام</li>',
      '<li>ان يكون متفاعل ومتواجد بشكل يومي</li>',
      '<li>أن يكون الشخص حسن ألاسلوب</li>',
      '<li>أن يكون لديه CV كامل مكمل</li>',
      '<li>يجب أن يكون المتقدم برتبة محددة في جدول الشرطة فما فوق</li>',
      '<li>اعلى رتبة للنقل Officer 2</li>',
      '</ul>',
      '<label class="check-field transfer-agree"><input id="transferRulesAgreeInput" type="checkbox"><span data-i18n="transferRulesAgree">' + safe(tr("transferRulesAgree")) + '</span></label>',
      '</div>',
      '<div class="modal-actions"><button id="continueTransferButton" class="portal-button success" type="button" disabled><i class="fa-solid fa-check"></i><span data-i18n="continueTransfer">' + safe(tr("continueTransfer")) + '</span></button></div>',
      '</section>',
      '</div>'
    ].join("");
  }

  function profileModalHtml() {
    return [
      '<div id="profileModal" class="modal-backdrop hidden">',
      '<form id="profileForm" class="modal-shell" novalidate>',
      '<header class="modal-head"><div><h2 data-i18n="profileTitle">' + safe(tr("profileTitle")) + '</h2><p data-i18n="profileSubtitle">' + safe(tr("profileSubtitle")) + '</p></div></header>',
      '<div class="modal-body field-grid">',
      '<label><span data-i18n="displayName">' + safe(tr("displayName")) + '</span><input id="profileDisplayNameInput" class="portal-input" type="text" required></label>',
      '<label><span data-i18n="discordUserRequired">' + safe(tr("discordUserRequired")) + '</span><input id="profileDiscordInput" class="portal-input" type="text" readonly></label>',
      '<div id="profileDiscordStatus" class="account-link-status full"></div>',
      '</div>',
      '<div class="modal-actions"><button id="profileLinkDiscordButton" class="portal-button primary" type="button"><i class="fa-brands fa-discord"></i><span data-i18n="linkDiscord">' + safe(tr("linkDiscord")) + '</span></button><button class="portal-button success" type="submit"><i class="fa-solid fa-floppy-disk"></i><span data-i18n="saveProfile">' + safe(tr("saveProfile")) + '</span></button></div>',
      '</form>',
      '</div>'
    ].join("");
  }

  function accountModalHtml() {
    return [
      '<div id="accountModal" class="modal-backdrop hidden">',
      '<section class="modal-shell account-shell" role="dialog" aria-modal="true">',
      '<header class="modal-head"><div><h2 data-i18n="accountDetailsTitle">' + safe(tr("accountDetailsTitle")) + '</h2><p data-i18n="accountDetailsSubtitle">' + safe(tr("accountDetailsSubtitle")) + '</p></div><button class="icon-action" type="button" data-close-modal="accountModal" aria-label="' + safe(tr("close")) + '"><i class="fa-solid fa-xmark"></i></button></header>',
      '<div class="modal-body account-modal-body">',
      '<section id="accountSummary" class="account-summary-panel"></section>',
      '<div class="account-settings-grid">',
      '<form id="accountNameForm" class="account-setting-card"><h3 data-i18n="nameChangeTitle">' + safe(tr("nameChangeTitle")) + '</h3><label><span data-i18n="newDisplayName">' + safe(tr("newDisplayName")) + '</span><input id="accountNameInput" class="portal-input" type="text" required></label><button class="portal-button success" type="submit"><i class="fa-solid fa-floppy-disk"></i><span data-i18n="changeName">' + safe(tr("changeName")) + '</span></button></form>',
      '<form id="accountEmailForm" class="account-setting-card"><h3 data-i18n="emailChangeTitle">' + safe(tr("emailChangeTitle")) + '</h3><label><span data-i18n="newEmail">' + safe(tr("newEmail")) + '</span><input id="accountEmailInput" class="portal-input" type="email" required></label><button class="portal-button primary" type="submit"><i class="fa-solid fa-envelope"></i><span data-i18n="changeEmail">' + safe(tr("changeEmail")) + '</span></button></form>',
      '<form id="accountPasswordForm" class="account-setting-card"><h3 data-i18n="passwordChangeTitle">' + safe(tr("passwordChangeTitle")) + '</h3><label><span data-i18n="newPassword">' + safe(tr("newPassword")) + '</span><input id="accountPasswordChangeInput" class="portal-input" type="password" autocomplete="new-password" required></label><button class="portal-button primary" type="submit"><i class="fa-solid fa-key"></i><span data-i18n="changePassword">' + safe(tr("changePassword")) + '</span></button></form>',
      '<section class="account-setting-card"><h3 data-i18n="accountDiscord">' + safe(tr("accountDiscord")) + '</h3><div id="accountDiscordPanel" class="account-link-status"></div><button id="accountLinkDiscordButton" class="portal-button primary" type="button"><i class="fa-brands fa-discord"></i><span data-i18n="linkDiscord">' + safe(tr("linkDiscord")) + '</span></button></section>',
      '</div>',
      '<section class="account-applications-panel"><h3 data-i18n="oldApplications">' + safe(tr("oldApplications")) + '</h3><div id="accountApplicationsList" class="portal-shell"></div></section>',
      '</div>',
      '</section>',
      '</div>'
    ].join("");
  }

  function decisionModalHtml() {
    return [
      '<div id="decisionModal" class="modal-backdrop hidden">',
      '<form id="decisionForm" class="modal-shell">',
      '<header class="modal-head"><div><h2 id="decisionTitle"></h2><p id="decisionSubject"></p></div><button class="icon-action" type="button" data-close-modal="decisionModal" aria-label="' + safe(tr("close")) + '"><i class="fa-solid fa-xmark"></i></button></header>',
      '<div class="modal-body field-grid">',
      '<label id="approvalMessageWrap" class="full"><span data-i18n="approvalMessage">' + safe(tr("approvalMessage")) + '</span><textarea id="approvalMessageInput" class="portal-textarea"></textarea></label>',
      '<label id="mondayDateWrap"><span data-i18n="mondayDate">' + safe(tr("mondayDate")) + '</span><input id="mondayDateInput" class="portal-input" type="date"></label>',
      '<label id="fridayDateWrap"><span data-i18n="fridayDate">' + safe(tr("fridayDate")) + '</span><input id="fridayDateInput" class="portal-input" type="date"></label>',
      '<label id="rejectionReasonWrap" class="full hidden"><span data-i18n="rejectionReason">' + safe(tr("rejectionReason")) + '</span><textarea id="rejectionReasonInput" class="portal-textarea"></textarea></label>',
      '</div>',
      '<div class="modal-actions"><button class="portal-button success" type="submit"><i class="fa-solid fa-floppy-disk"></i><span data-i18n="saveDecision">' + safe(tr("saveDecision")) + '</span></button></div>',
      '</form>',
      '</div>'
    ].join("");
  }

  function roleModalHtml() {
    return [
      '<div id="roleModal" class="modal-backdrop hidden">',
      '<section class="modal-shell" role="dialog" aria-modal="true">',
      '<header class="modal-head"><div><h2 data-i18n="roleManagement">' + safe(tr("roleManagement")) + '</h2><p data-i18n="roleManagementText">' + safe(tr("roleManagementText")) + '</p></div><button class="icon-action" type="button" data-close-modal="roleModal" aria-label="' + safe(tr("close")) + '"><i class="fa-solid fa-xmark"></i></button></header>',
      '<div class="modal-body">',
      '<form id="roleForm" class="field-grid">',
      '<label><span data-i18n="userEmail">' + safe(tr("userEmail")) + '</span><input id="roleEmailInput" class="portal-input" type="email" required></label>',
      '<label><span data-i18n="role">' + safe(tr("role")) + '</span><select id="roleSelectInput" class="portal-select">' + roleOptions.map(function (role) { return '<option value="' + safeAttr(role) + '">' + safe(roleLabel(role)) + '</option>'; }).join("") + '</select></label>',
      '<div class="modal-actions" style="grid-column:1/-1;padding:0"><button class="portal-button success" type="submit"><i class="fa-solid fa-user-plus"></i><span data-i18n="saveRole">' + safe(tr("saveRole")) + '</span></button></div>',
      '</form>',
      '<section class="status-panel" style="margin-top:14px"><h3 data-i18n="configuredUsers">' + safe(tr("configuredUsers")) + '</h3><div id="roleList" class="portal-shell"></div></section>',
      '</div>',
      '</section>',
      '</div>'
    ].join("");
  }

  function installFooterCredits() {
    const footer = document.getElementById("regulationsFooter");
    if (!footer) return;
    footer.classList.remove("hidden");
    const left = footer.querySelector("span:first-child");
    const right = footer.querySelector("span:last-child span");
    if (left) {
      left.dataset.i18n = "footerLeft";
      left.textContent = tr("footerLeft");
    }
    if (right) {
      right.dataset.i18n = "footerRight";
      right.textContent = tr("footerRight");
    }
  }

  function overrideLanguage() {
    const baseApply = typeof applyLanguage === "function" ? applyLanguage : null;
    const enhanced = function () {
      if (baseApply) baseApply();
      document.querySelectorAll("[data-i18n-placeholder]").forEach(function (node) {
        node.placeholder = tr(node.dataset.i18nPlaceholder);
      });
      renderSettingsPanel();
      renderAllPortal();
    };
    try { applyLanguage = enhanced; } catch (error) { window.applyLanguage = enhanced; }
    window.applyLanguage = enhanced;
  }

  function overrideWorkspace() {
    const enhanced = function (workspace) {
      let next = workspace || "recruitment";
      if ((next === "review" || next === "archives") && !canViewRecords()) {
        toast(tr("accessRequired"), "error");
        next = "recruitment";
      }
      if (next === "dashboard" && !canAdmin()) {
        toast(tr("accessRequired"), "error");
        next = "recruitment";
      }
      document.body.classList.add("workspace-switching");
      try { currentWorkspace = next; } catch (error) {}
      const isRegulations = next === "regulations";
      const isSop = next === "sop";
      toggleById("regulationsView", isRegulations);
      toggleById("sopView", isSop);
      portalWorkspaces.forEach(function (name) { toggleById(name + "View", next === name); });
      document.querySelectorAll(".workspace-tab").forEach(function (tab) {
        tab.setAttribute("aria-selected", String(tab.id === "workspace-" + next));
      });
      const topbar = document.querySelector(".topbar");
      if (topbar) topbar.classList.toggle("sop-mode", isSop);
      const topSearch = document.querySelector(".top-search");
      if (topSearch) topSearch.classList.toggle("hidden", !isRegulations);
      const footer = document.getElementById("regulationsFooter");
      if (footer) footer.classList.remove("hidden");
      if (isSop && typeof renderSop === "function") renderSop();
      if (next === "dashboard") renderDashboard();
      if (next === "review") renderReview();
      if (next === "archives") renderArchives();
      if (next === "schedule") renderSchedule();
      if (next === "crew") renderAssets("crew");
      if (next === "media") renderAssets("media");
      if (next === "streams") renderStreams();
      window.scrollTo({ top: 0, behavior: "smooth" });
      const activeView = document.getElementById(next + "View") || (isRegulations ? document.getElementById("regulationsView") : document.getElementById("sopView"));
      if (activeView) {
        activeView.classList.remove("section-entering");
        void activeView.offsetWidth;
        activeView.classList.add("section-entering");
      }
      playSound("navigation");
      setTimeout(function () {
        document.body.classList.remove("workspace-switching");
        activeView?.classList.remove("section-entering");
      }, 280);
    };
    try { setWorkspace = enhanced; } catch (error) { window.setWorkspace = enhanced; }
    window.setWorkspace = enhanced;
  }

  function bindPortalEvents() {
    if (!LIGHTWEIGHT_UI) {
      bindChiefParallax();
      document.addEventListener("pointerdown", primeAudio, { once: true });
      document.addEventListener("pointermove", trackPointerGlow);
      document.addEventListener("pointermove", handleReactivePointer);
      document.addEventListener("pointerout", clearReactivePointer);
      document.addEventListener("pointerover", function (event) {
        const interactive = event.target.closest("button, a, .subtab, .workspace-tab, input, select, textarea, .asset-card, .review-card, .fto-card, .hero-metric, .action-card, .stream-card, .credit-card, .chief-detail, .regulation-card");
        if (interactive && !interactive.contains(event.relatedTarget)) playSound("hover");
      });
    }
    document.addEventListener("click", function (event) {
      const target = event.target.closest("button, a, .subtab, .workspace-tab, .asset-card, .review-card, .fto-card, .hero-metric");
      if (!target) return;
      if (target.matches("a[href^='fivem:']")) playSound("connect");
      else if (target.id === "roleManagerButton" || target.id === "fullResetButton" || target.id === "clearPendingButton") playSound("admin");
      else if (target.classList.contains("workspace-tab") || target.classList.contains("subtab")) playSound("navigation");
      else if (target.classList.contains("danger")) playSound("error");
      else if (target.classList.contains("success") || target.classList.contains("primary")) playSound("success");
      else playSound("click");
      if (!LIGHTWEIGHT_UI) spawnRipple(event, target);
    });
    if (!LIGHTWEIGHT_UI) {
      document.addEventListener("focusin", function (event) {
        if (event.target.matches("input, select, textarea, button, a")) playSound("focus");
      });
      document.addEventListener("input", function (event) {
        if (event.target.matches("input, textarea")) playSound(event.target.type === "color" ? "tick" : "type");
      });
      document.addEventListener("change", function (event) {
        if (event.target.matches("input, select, textarea")) playSound("toggle");
      });
      document.addEventListener("keydown", function (event) {
        if (event.repeat || !event.target.matches("input, select, textarea")) return;
        if (event.key === "Enter") playSound("confirm");
        else if (event.key === "Escape") playSound("close");
      });
    }

    document.getElementById("enterPortalButton")?.addEventListener("click", function () {
      closeModal("welcomeModal");
      playSound("success");
    });
    document.querySelectorAll("[data-open-application]").forEach(function (button) {
      button.addEventListener("click", function () { openApplicationModal(button.dataset.openApplication); });
    });
    document.querySelectorAll("[data-jump-fto]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.setWorkspace("fto");
        setTimeout(function () {
          document.getElementById("ftoApplicationDesk")?.scrollIntoView({ behavior: "smooth", block: "center" });
          document.getElementById("ftoApplicationDesk")?.classList.add("pulse-once");
          setTimeout(function () { document.getElementById("ftoApplicationDesk")?.classList.remove("pulse-once"); }, 900);
        }, 120);
      });
    });
    document.querySelectorAll("[data-close-modal]").forEach(function (button) {
      button.addEventListener("click", function () { closeModal(button.dataset.closeModal); });
    });
    document.getElementById("transferRulesAgreeInput")?.addEventListener("change", function (event) {
      const button = document.getElementById("continueTransferButton");
      if (button) button.disabled = !event.target.checked;
    });
    document.getElementById("continueTransferButton")?.addEventListener("click", continueTransferAfterRules);
    document.getElementById("profileForm")?.addEventListener("submit", saveAccountProfile);
    document.getElementById("profileLinkDiscordButton")?.addEventListener("click", linkDiscordIdentity);
    document.getElementById("accountMenuButton")?.addEventListener("click", openAccountModal);
    document.getElementById("accountLinkDiscordButton")?.addEventListener("click", linkDiscordIdentity);
    document.getElementById("accountNameForm")?.addEventListener("submit", saveAccountName);
    document.getElementById("accountEmailForm")?.addEventListener("submit", saveAccountEmail);
    document.getElementById("accountPasswordForm")?.addEventListener("submit", saveAccountPassword);
    document.getElementById("loginButton")?.addEventListener("click", function () { openAuthBranch("login"); });
    document.getElementById("createAccountButton")?.addEventListener("click", function () { openAuthBranch("register"); });
    document.getElementById("logoutButton")?.addEventListener("click", logoutAccount);
    document.getElementById("authPasswordInput")?.addEventListener("keydown", function (event) {
      if (event.key === "Enter") openAuthBranch("login");
    });
    document.getElementById("roleManagerButton")?.addEventListener("click", openRoleModal);
    document.getElementById("applicationBackButton")?.addEventListener("click", function () {
      Object.assign(state.applicationDraft, collectStepData(document.getElementById("applicationForm"), state.applicationType, state.applicationStep));
      state.applicationStep = 1;
      renderApplicationFields();
    });
    document.getElementById("applicationNextButton")?.addEventListener("click", function () {
      if (!validateApplicationStep()) return;
      Object.assign(state.applicationDraft, collectStepData(document.getElementById("applicationForm"), state.applicationType, state.applicationStep));
      state.applicationStep = 2;
      renderApplicationFields();
    });
    document.getElementById("applicationForm")?.addEventListener("submit", submitApplication);
    document.querySelectorAll("[data-review-type]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.activeReviewType = button.dataset.reviewType;
        renderReview();
      });
    });
    document.getElementById("reviewSearchInput")?.addEventListener("input", renderReview);
    document.getElementById("clearPendingButton")?.addEventListener("click", clearPending);
    document.querySelectorAll("[data-archive-type]").forEach(function (button) {
      button.addEventListener("click", function () {
        state.activeArchive = button.dataset.archiveType;
        renderArchives();
      });
    });
    document.getElementById("fullResetButton")?.addEventListener("click", resetSystem);
    document.getElementById("decisionForm")?.addEventListener("submit", saveDecision);
    document.getElementById("roleForm")?.addEventListener("submit", saveRole);
    document.getElementById("dashboardRoleButton")?.addEventListener("click", openRoleModal);
    document.getElementById("regulationForm")?.addEventListener("submit", saveCustomRegulation);
    document.getElementById("scheduleForm")?.addEventListener("submit", saveScheduleRow);
    document.getElementById("scheduleCancelEditButton")?.addEventListener("click", cancelScheduleEdit);
    document.getElementById("crewForm")?.addEventListener("submit", function (event) { saveAsset(event, "crew"); });
    document.getElementById("mediaForm")?.addEventListener("submit", function (event) { saveAsset(event, "media"); });
    document.getElementById("streamForm")?.addEventListener("submit", saveStream);
    document.getElementById("streamCancelEditButton")?.addEventListener("click", cancelStreamEdit);
    document.getElementById("settingsToggleButton")?.addEventListener("click", toggleSettingsPanel);
    document.getElementById("settingsCloseButton")?.addEventListener("click", closeSettingsPanel);
    document.getElementById("resetUiButton")?.addEventListener("click", resetUiPrefs);
    document.getElementById("sfxToggleButton")?.addEventListener("click", toggleSfxPreference);
    ["fontSettingInput", "redSettingInput", "blueSettingInput", "bgSettingInput", "textSettingInput"].forEach(function (id) {
      document.getElementById(id)?.addEventListener("input", saveUiPrefsFromControls);
    });
    document.querySelectorAll("[data-cancel-asset-edit]").forEach(function (button) {
      button.addEventListener("click", function () { cancelAssetEdit(button.dataset.cancelAssetEdit); });
    });
    document.addEventListener("dragstart", handleAssetDragStart);
    document.addEventListener("dragover", handleAssetDragOver);
    document.addEventListener("drop", handleAssetDrop);
    document.addEventListener("dragend", handleAssetDragEnd);
    document.addEventListener("error", handlePortalImageError, true);
    document.addEventListener("click", function (event) {
      const reaction = event.target.closest("[data-media-reaction]");
      if (reaction) toggleMediaReaction(reaction.dataset.mediaId, reaction.dataset.mediaReaction);
    });
  }

  function handlePortalImageError(event) {
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || !image.matches(".asset-card img, .stream-shot img, .stream-logo, .schedule-insignia")) return;
    if (image.dataset.fallbackApplied === "true") return;
    image.dataset.fallbackApplied = "true";
    image.src = (PUBLIC_CONFIG.assets || {}).crewFallback || "image2.webp";
  }

  function bindChiefParallax() {
    const hero = document.querySelector("[data-chief-hero]");
    if (!hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    hero.addEventListener("pointermove", function (event) {
      const rect = hero.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - .5) * 2;
      const y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - .5) * 2;
      hero.style.setProperty("--chief-x", x.toFixed(3));
      hero.style.setProperty("--chief-y", y.toFixed(3));
    });
    hero.addEventListener("pointerleave", function () {
      hero.style.setProperty("--chief-x", "0");
      hero.style.setProperty("--chief-y", "0");
    });
  }

  function trackPointerGlow(event) {
    const x = Math.round((event.clientX / Math.max(window.innerWidth, 1)) * 100);
    const y = Math.round((event.clientY / Math.max(window.innerHeight, 1)) * 100);
    document.documentElement.style.setProperty("--pointer-x", x + "%");
    document.documentElement.style.setProperty("--pointer-y", y + "%");
  }

  function handleReactivePointer(event) {
    const target = event.target.closest(".asset-card, .review-card, .fto-card, .hero-metric, .action-card, .stream-card, .credit-card, .portal-panel, .status-panel, .sop-stat, .regulation-card, .chief-detail");
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const px = (event.clientX - rect.left) / Math.max(rect.width, 1);
    const py = (event.clientY - rect.top) / Math.max(rect.height, 1);
    target.style.setProperty("--react-x", Math.round(px * 100) + "%");
    target.style.setProperty("--react-y", Math.round(py * 100) + "%");
    target.style.setProperty("--tilt-x", ((py - .5) * -7).toFixed(2) + "deg");
    target.style.setProperty("--tilt-y", ((px - .5) * 7).toFixed(2) + "deg");
    target.classList.add("is-reacting");
  }

  function clearReactivePointer(event) {
    const target = event.target.closest?.(".asset-card, .review-card, .fto-card, .hero-metric, .action-card, .stream-card, .credit-card, .portal-panel, .status-panel, .sop-stat, .regulation-card, .chief-detail");
    if (!target || target.contains(event.relatedTarget)) return;
    target.classList.remove("is-reacting");
    target.style.removeProperty("--tilt-x");
    target.style.removeProperty("--tilt-y");
  }

  function spawnRipple(event, target) {
    if (!target || target.querySelector(".fx-ripple")) return;
    const rect = target.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "fx-ripple";
    ripple.style.left = (event.clientX - rect.left) + "px";
    ripple.style.top = (event.clientY - rect.top) + "px";
    target.appendChild(ripple);
    setTimeout(function () { ripple.remove(); }, 680);
  }

  async function initPortal() {
    try {
      loadLocalData();
      applyUiPrefs();
      updateRole();
      renderAllPortal();
      window.setWorkspace("recruitment");
      startStreamPolling();
      startPresence();
      await initSupabase();
    } finally {
      window.LSPD_BOOT?.finish();
    }
  }

  async function initSupabase() {
    if (!isSupabaseConfigured()) {
      updateDatabaseBadge();
      return;
    }
    try {
      await loadSupabaseSdk();
      state.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, SUPABASE_AUTH_OPTIONS);
      state.databaseMode = "live";
      updateDatabaseBadge();
      fetchAll({ publicOnly: true });
      const sessionResult = await state.client.auth.getSession();
      await syncAuthUser(sessionResult.data?.session?.user || null);
      state.client.auth.onAuthStateChange(function (_event, session) {
        window.setTimeout(async function () {
          await syncAuthUser(session?.user || null);
          await fetchAll();
        }, 0);
      });
      await fetchAll();
      subscribeRealtime();
      startAutoRefresh();
      startPresence();
      toast(tr("liveMode"), "success");
    } catch (error) {
      console.warn(error);
      state.databaseMode = "local";
      updateDatabaseBadge();
      toast(tr("databaseError"), "warn");
    }
  }

  async function syncAuthUser(user) {
    if (!user || !state.client) {
      state.authUser = null;
      state.accountProfile = null;
      updateRole();
      return;
    }
    try {
      const freshUser = await state.client.auth.getUser();
      if (!freshUser.error && freshUser.data?.user) user = freshUser.data.user;
    } catch (error) {
      console.warn(error);
    }
    let profile = await state.client
      .from(tableName("accounts"))
      .select("id,auth_user_id,email,role,display_name,discord_user,discord_avatar_url,discord_provider_id,discord_linked")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profile.error && /display_name|discord_user|discord_avatar_url|discord_provider_id|discord_linked|schema cache|column/i.test(String(profile.error.message || profile.error.details || profile.error.code || ""))) {
      profile = await state.client
        .from(tableName("accounts"))
        .select("id,email,role")
        .eq("auth_user_id", user.id)
        .maybeSingle();
    }
    if (profile.error) console.warn(profile.error);
    const meta = user.user_metadata || {};
    const discordIdentity = findDiscordIdentity(user);
    const discordData = discordIdentity?.identity_data || {};
    const pendingName = readPendingDisplayName();
    const displayName = profile.data?.display_name || pendingName || meta.display_name || meta.full_name || meta.name || meta.global_name || meta.user_name || "";
    const discordUser = profile.data?.discord_user || discordData.preferred_username || discordData.user_name || discordData.name || meta.preferred_username || meta.user_name || meta.name || "";
    const discordAvatar = profile.data?.discord_avatar_url || discordData.avatar_url || discordData.picture || meta.avatar_url || meta.picture || "";
    const discordProviderId = profile.data?.discord_provider_id || discordData.provider_id || discordData.sub || discordIdentity?.id || "";
    const discordLinked = Boolean(profile.data?.discord_linked || discordIdentity);
    if (state.authUser?.id !== user.id) state.profilePromptShown = false;
    state.authUser = {
      id: user.id,
      account_id: profile.data?.id || "",
      email: String(profile.data?.email || user.email || "").toLowerCase(),
      role: normalizeRole(profile.data?.role || "applicant"),
      display_name: displayName,
      discord_user: discordUser,
      discord_avatar_url: discordAvatar,
      discord_provider_id: discordProviderId,
      discord_linked: discordLinked
    };
    state.accountProfile = profile.data
      ? normalizeAccount(Object.assign({}, profile.data, {
        auth_user_id: user.id,
        email: state.authUser.email,
        role: state.authUser.role,
        display_name: state.authUser.display_name,
        discord_user: state.authUser.discord_user,
        discord_avatar_url: state.authUser.discord_avatar_url,
        discord_provider_id: state.authUser.discord_provider_id,
        discord_linked: state.authUser.discord_linked
      }))
      : null;
    if (state.authUser.email) localStorage.setItem(STORAGE_KEYS.userEmail, state.authUser.email);
    if (profile.data?.id) await syncOwnAccountProfile(profile.data.id);
    clearPendingDisplayName();
    updateRole();
    renderAccountModal();
    renderProfileRequirementState();
    window.setTimeout(requireAccountProfile, 150);
  }

  function findDiscordIdentity(user) {
    return (user?.identities || []).find(function (identity) { return identity.provider === "discord"; }) || null;
  }

  function readPendingDisplayName() {
    try {
      return (sessionStorage.getItem(PENDING_DISPLAY_NAME_KEY) || "").trim();
    } catch (error) {
      return "";
    }
  }

  function clearPendingDisplayName() {
    try { sessionStorage.removeItem(PENDING_DISPLAY_NAME_KEY); } catch (error) {}
  }

  async function syncOwnAccountProfile(accountId) {
    if (!accountId || !state.client || !state.authUser) return;
    const current = state.accountProfile || {};
    const patch = {
      display_name: state.authUser.display_name || null,
      discord_user: state.authUser.discord_user || null,
      discord_avatar_url: state.authUser.discord_avatar_url || null,
      discord_provider_id: state.authUser.discord_provider_id || null,
      discord_linked: Boolean(state.authUser.discord_linked),
      updated_at: new Date().toISOString()
    };
    const changed = ["display_name", "discord_user", "discord_avatar_url", "discord_provider_id", "discord_linked"].some(function (key) {
      return String(current[key] ?? "") !== String(patch[key] ?? "");
    });
    if (!changed) return;
    try {
      const result = await state.client.from(tableName("accounts")).update(patch).eq("id", accountId);
      if (result.error && !/discord_avatar_url|discord_provider_id|discord_linked|schema cache|column/i.test(String(result.error.message || result.error.details || result.error.code || ""))) {
        console.warn(result.error);
      }
      state.accountProfile = normalizeAccount(Object.assign({}, state.accountProfile || {}, patch));
    } catch (error) {
      console.warn(error);
    }
  }

  function openAuthBranch(mode) {
    const branch = mode === "register" ? "register" : "login";
    window.location.href = branch + "/index.html";
  }

  async function logoutAccount() {
    await sendAuditEvent("auth.logout", "session", { email: state.userEmail }, "auth");
    if (state.client) await state.client.auth.signOut();
    state.authUser = null;
    state.accountProfile = null;
    state.profilePromptShown = false;
    closeModal("accountModal");
    closeModal("profileModal");
    const emailInput = document.getElementById("authEmailInput");
    const passInput = document.getElementById("authPasswordInput");
    if (emailInput) emailInput.disabled = false;
    if (passInput) {
      passInput.disabled = false;
      passInput.value = "";
    }
    updateRole();
    renderAllPortal();
    toast(tr("logoutSuccess"), "success");
  }

  function requireAccountProfile(force) {
    if (!state.authUser) return;
    if (hasCompleteAccountProfile()) {
      closeModal("profileModal");
      return;
    }
    if (state.profilePromptShown && !force) return;
    const name = document.getElementById("profileDisplayNameInput");
    const discord = document.getElementById("profileDiscordInput");
    if (name) name.value = state.authUser.display_name || "";
    if (discord) discord.value = state.authUser.discord_user || "";
    renderProfileRequirementState();
    state.profilePromptShown = true;
    openModal("profileModal");
  }

  async function saveAccountProfile(event) {
    event.preventDefault();
    if (!state.authUser) {
      toast(tr("loginRequired"), "warn");
      return;
    }
    const displayName = document.getElementById("profileDisplayNameInput")?.value.trim() || "";
    const discordUser = document.getElementById("profileDiscordInput")?.value.trim() || "";
    if (!displayName || (isDiscordLinked() && !discordUser)) {
      toast(tr("validationError"), "error");
      return;
    }
    if (!isDiscordLinked()) {
      await updateOwnAccountProfile({ display_name: displayName, updated_at: new Date().toISOString() });
      renderProfileRequirementState();
      toast(tr("linkDiscordRequired"), "warn");
      return;
    }
    const ok = await updateOwnAccountProfile({
      display_name: displayName,
      discord_user: discordUser || state.authUser.discord_user,
      discord_avatar_url: state.authUser.discord_avatar_url || "",
      discord_provider_id: state.authUser.discord_provider_id || "",
      discord_linked: true,
      updated_at: new Date().toISOString()
    });
    if (!ok) return;
    closeModal("profileModal");
    toast(tr("profileSaved"), "success");
    await refreshAfterMutation();
  }

  function isDiscordLinked() {
    return Boolean(state.authUser?.discord_linked);
  }

  function hasCompleteAccountProfile() {
    return Boolean(state.authUser?.display_name && state.authUser?.discord_user && isDiscordLinked());
  }

  function currentAccountProfile() {
    if (!state.authUser) return null;
    return state.accountProfile || state.accounts.find(function (entry) {
      return entry.auth_user_id === state.authUser.id || (entry.email || "").toLowerCase() === state.authUser.email;
    }) || state.authUser;
  }

  async function updateOwnAccountProfile(patch) {
    const account = currentAccountProfile();
    if (!account?.id) {
      toast(tr("databaseError"), "error");
      return false;
    }
    const ok = await updateRow("accounts", account.id, patch);
    if (!ok) return false;
    state.authUser = Object.assign({}, state.authUser, patch);
    state.accountProfile = normalizeAccount(Object.assign({}, state.accountProfile || account, patch));
    state.accounts = state.accounts.map(function (entry) {
      return entry.id === account.id ? normalizeAccount(Object.assign({}, entry, patch)) : entry;
    });
    updateRole();
    renderAccountModal();
    renderProfileRequirementState();
    return true;
  }

  function renderProfileRequirementState() {
    const status = document.getElementById("profileDiscordStatus");
    const linkButton = document.getElementById("profileLinkDiscordButton");
    const discord = document.getElementById("profileDiscordInput");
    if (discord) discord.value = state.authUser?.discord_user || "";
    if (status) {
      const linked = isDiscordLinked();
      status.innerHTML = '<i class="fa-brands fa-discord"></i><span>' + safe(tr(linked ? "discordLinked" : "discordMissing")) + '</span>' + (state.authUser?.discord_user ? '<strong>' + safe(state.authUser.discord_user) + '</strong>' : "");
      status.dataset.state = linked ? "linked" : "missing";
    }
    if (linkButton) linkButton.classList.toggle("hidden", isDiscordLinked());
  }

  async function linkDiscordIdentity() {
    if (!state.client || !state.authUser) {
      toast(tr("loginRequired"), "warn");
      return;
    }
    const pendingName = (document.getElementById("profileDisplayNameInput")?.value || document.getElementById("accountNameInput")?.value || state.authUser.display_name || "").trim();
    if (pendingName) {
      try { sessionStorage.setItem(PENDING_DISPLAY_NAME_KEY, pendingName); } catch (error) {}
    }
    const result = await state.client.auth.linkIdentity({
      provider: "discord",
      options: { redirectTo: currentPortalUrl() }
    });
    if (result.error) {
      console.warn(result.error);
      toast(result.error.message || tr("databaseError"), "error");
      return;
    }
    toast(tr("discordLinkStarted"), "success");
  }

  function currentPortalUrl() {
    return new URL("ftlspd-portal.html", window.location.href).href;
  }

  function openAccountModal() {
    if (!state.authUser) {
      toast(tr("loginRequired"), "warn");
      return;
    }
    renderAccountModal();
    openModal("accountModal");
  }

  function renderAccountModal() {
    const summary = document.getElementById("accountSummary");
    if (!summary || !state.authUser) return;
    const linked = isDiscordLinked();
    summary.innerHTML = [
      '<div class="account-summary-avatar">' + accountAvatarHtml(state.authUser, "large") + '</div>',
      '<div class="account-summary-copy">',
      '<h3>' + safe(state.authUser.display_name || state.userEmail || tr("accountDetailsTitle")) + '</h3>',
      '<dl>',
      '<div><dt data-i18n="accountEmail">' + safe(tr("accountEmail")) + '</dt><dd>' + safe(state.userEmail || "-") + '</dd></div>',
      '<div><dt data-i18n="accountRole">' + safe(tr("accountRole")) + '</dt><dd>' + safe(roleLabel(state.role)) + '</dd></div>',
      '<div><dt data-i18n="accountDiscord">' + safe(tr("accountDiscord")) + '</dt><dd>' + safe(state.authUser.discord_user || "-") + '</dd></div>',
      '</dl>',
      '</div>',
      '<span class="account-link-pill" data-state="' + (linked ? "linked" : "missing") + '">' + safe(tr(linked ? "discordLinked" : "discordMissing")) + '</span>'
    ].join("");
    const name = document.getElementById("accountNameInput");
    const email = document.getElementById("accountEmailInput");
    if (name) name.value = state.authUser.display_name || "";
    if (email) email.value = state.userEmail || "";
    const discordPanel = document.getElementById("accountDiscordPanel");
    if (discordPanel) {
      discordPanel.dataset.state = linked ? "linked" : "missing";
      discordPanel.innerHTML = '<i class="fa-brands fa-discord"></i><span>' + safe(tr(linked ? "discordLinked" : "discordMissing")) + '</span>' + (state.authUser.discord_user ? '<strong>' + safe(state.authUser.discord_user) + '</strong>' : "");
    }
    document.getElementById("accountLinkDiscordButton")?.classList.toggle("hidden", linked);
    renderAccountApplications();
  }

  function renderAccountApplications() {
    const list = document.getElementById("accountApplicationsList");
    if (!list) return;
    const records = getApplicantRecords().slice().sort(function (a, b) {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    list.innerHTML = records.length ? records.map(accountApplicationHtml).join("") : '<div class="empty-portal">' + safe(tr("noOldApplications")) + '</div>';
  }

  function accountApplicationHtml(app) {
    return [
      '<article class="account-application-row">',
      '<div><strong>' + safe(app.kind === "transfer" ? tr("transferLabel") : tr("recruitmentLabel")) + '</strong><span>' + safe(formatDateTime(app.created_at)) + '</span></div>',
      '<span class="status-pill ' + safeAttr(app.status || "pending") + '">' + safe(tr(app.status || "pending")) + '</span>',
      '</article>'
    ].join("");
  }

  async function saveAccountName(event) {
    event.preventDefault();
    const displayName = document.getElementById("accountNameInput")?.value.trim() || "";
    if (!displayName) {
      toast(tr("validationError"), "error");
      return;
    }
    if (state.client) {
      const result = await state.client.auth.updateUser({ data: { display_name: displayName, full_name: displayName } });
      if (result.error) {
        toast(result.error.message || tr("databaseError"), "error");
        return;
      }
    }
    const ok = await updateOwnAccountProfile({ display_name: displayName, updated_at: new Date().toISOString() });
    if (!ok) return;
    toast(tr("profileSaved"), "success");
    if (hasCompleteAccountProfile()) closeModal("profileModal");
    await refreshAfterMutation();
  }

  async function saveAccountEmail(event) {
    event.preventDefault();
    if (!state.client) {
      toast(tr("databaseError"), "error");
      return;
    }
    const email = document.getElementById("accountEmailInput")?.value.trim().toLowerCase() || "";
    if (!email) {
      toast(tr("validationError"), "error");
      return;
    }
    const result = await state.client.auth.updateUser({ email: email }, { emailRedirectTo: currentPortalUrl() });
    if (result.error) {
      toast(result.error.message || tr("databaseError"), "error");
      return;
    }
    if ((result.data?.user?.email || "").toLowerCase() === email) {
      await updateOwnAccountProfile({ email: email, updated_at: new Date().toISOString() });
      state.userEmail = email;
      localStorage.setItem(STORAGE_KEYS.userEmail, email);
    }
    toast(tr("emailUpdateSent"), "success");
    await refreshAfterMutation();
  }

  async function saveAccountPassword(event) {
    event.preventDefault();
    if (!state.client) {
      toast(tr("databaseError"), "error");
      return;
    }
    const password = document.getElementById("accountPasswordChangeInput")?.value || "";
    if (password.length < Number(PUBLIC_CONFIG.security?.minimumPasswordLength || 10)) {
      toast(tr("validationError"), "error");
      return;
    }
    const result = await state.client.auth.updateUser({ password: password });
    if (result.error) {
      toast(result.error.message || tr("databaseError"), "error");
      return;
    }
    event.currentTarget.reset();
    toast(tr("passwordUpdated"), "success");
  }

  function isSupabaseConfigured() {
    return /^https:\/\/.+\.supabase\.co/i.test(SUPABASE_CONFIG.url || "") && Boolean(SUPABASE_CONFIG.anonKey);
  }

  function loadSupabaseSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      const existing = document.querySelector('script[data-supabase-sdk="true"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      script.dataset.supabaseSdk = "true";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function subscribeRealtime() {
    if (!state.client || state.realtimeChannel) return;
    if (!ENABLE_REALTIME) return;
    state.realtimeChannel = state.client.channel("lspd-portal-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("applications") }, scheduleFetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("accounts") }, scheduleFetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("roles") }, scheduleFetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("assets") }, scheduleFetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("mediaReactions") }, scheduleFetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("regulations") }, scheduleFetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("schedule") }, scheduleFetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("streams") }, scheduleFetchAll)
      .subscribe();
  }

  function startAutoRefresh() {
    if (state.autoRefreshTimer) clearInterval(state.autoRefreshTimer);
    if (!state.client || !AUTO_REFRESH_INTERVAL_MS || AUTO_REFRESH_INTERVAL_MS < 30000) return;
    state.autoRefreshTimer = setInterval(function () {
      if (!document.hidden) scheduleFetchAll();
    }, AUTO_REFRESH_INTERVAL_MS);
  }

  function scheduleFetchAll() {
    if (!state.client) return;
    window.clearTimeout(state.fetchTimer);
    state.fetchTimer = window.setTimeout(fetchAll, 350);
  }

  async function fetchAll(options) {
    if (!state.client) return;
    if (state.fetchInFlight) {
      state.fetchQueued = true;
      return;
    }
    state.fetchInFlight = true;
    try {
      const settings = options || {};
      const jobs = buildFetchJobs(settings.publicOnly !== true);
      const results = await Promise.allSettled(jobs.map(runFetchJob));
      const failed = results.some(function (result) {
        return result.status === "rejected" || result.value === false;
      });
      syncCurrentAccountFromRows();
      saveLocalData();
      updateRole();
      renderAllPortal();
      if (failed) scheduleFetchRetry();
      else state.fetchRetryCount = 0;
    } catch (error) {
      console.warn(error);
      toast(tr("databaseError"), "error");
    } finally {
      state.fetchInFlight = false;
      if (state.fetchQueued) {
        state.fetchQueued = false;
        scheduleFetchAll();
      }
    }
  }

  function buildFetchJobs(includeSecure) {
    const jobs = [];
    const assetColumns = "id,category,title,subtitle,discord_id,photo_url,storage_path,caption,display_order,media_type,created_by,created_at,updated_at";
    jobs.push({
      name: "assets",
      timeout: 12000,
      query: function () {
        return assetsFetchQuery(assetColumns);
      },
      fallbackWhen: function (error) {
        return /storage_path|schema cache|column/i.test(errorText(error));
      },
      fallbackQuery: function () {
        return assetsFetchQuery("id,category,title,subtitle,discord_id,photo_url,caption,display_order,media_type,created_by,created_at,updated_at");
      },
      apply: function (rows) {
        state.assets = rows.map(normalizeAsset);
        if (Date.now() > state.assetOrderLockUntil) syncAssetOrderFromRows();
      }
    });
    jobs.push({
      name: "media reactions",
      timeout: 12000,
      query: function () {
        return state.client.from(tableName("mediaReactions")).select("id,asset_id,reaction,user_key,user_email,created_at").order("created_at", { ascending: false });
      },
      apply: function (rows) { state.mediaReactions = rows.map(normalizeMediaReaction); }
    });
    jobs.push({
      name: "regulations",
      timeout: 12000,
      query: function () {
        return state.client.from(tableName("regulations")).select("id,degree,title,description,created_by,created_at,updated_at").order("created_at", { ascending: false });
      },
      apply: function (rows) { state.customRegulations = rows.map(normalizeRegulation); }
    });
    jobs.push({
      name: "schedule",
      timeout: 12000,
      query: function () {
        return state.client.from(tableName("schedule")).select("id,badge_number,name,insignia_url,rank,department,admin_rank,status,punishment,last_promotion,discord_user,points,privilege_points,wings,created_by,created_at,updated_at").order("created_at", { ascending: true });
      },
      apply: function (rows) { state.schedule = rows.map(normalizeScheduleRow); }
    });
    jobs.push({
      name: "streams",
      timeout: 12000,
      query: function () {
        return state.client.from(tableName("streams")).select("id,name,logo_url,kick_url,created_by,created_at,updated_at").order("created_at", { ascending: false });
      },
      apply: function (rows) { state.streams = rows.map(normalizeStream); }
    });
    if (!includeSecure || !state.authUser) return jobs;
    jobs.push({
      name: "applications",
      timeout: 22000,
      query: function () {
        return state.client.from(tableName("applications")).select("*").order("created_at", { ascending: false });
      },
      apply: function (rows) { state.applications = rows.map(normalizeApplication); }
    });
    const accountColumns = "id,auth_user_id,email,role,display_name,discord_user,discord_avatar_url,discord_provider_id,discord_linked,created_at,updated_at";
    jobs.push({
      name: "accounts",
      timeout: 16000,
      query: function () {
        let query = state.client.from(tableName("accounts")).select(accountColumns);
        if (canAdmin()) return query.order("email", { ascending: true });
        return query.eq("auth_user_id", state.authUser.id).order("email", { ascending: true });
      },
      fallbackWhen: function (error) {
        return /display_name|discord_user|discord_avatar_url|discord_provider_id|discord_linked|schema cache|column/i.test(errorText(error));
      },
      fallbackQuery: function () {
        let query = state.client.from(tableName("accounts")).select("id,auth_user_id,email,role,created_at,updated_at");
        if (canAdmin()) return query.order("email", { ascending: true });
        return query.eq("auth_user_id", state.authUser.id).order("email", { ascending: true });
      },
      apply: function (rows) {
        state.accounts = rows.map(normalizeAccount);
        syncCurrentAccountFromRows();
      }
    });
    if (state.role === "owner") {
      jobs.push({
        name: "roles",
        timeout: 12000,
        query: function () {
          return state.client.from(tableName("roles")).select("*").order("email", { ascending: true });
        },
        apply: function (rows) { state.roles = rows; }
      });
    }
    return jobs;
  }

  function assetsFetchQuery(columns) {
    let query = state.client.from(tableName("assets")).select(columns);
    if (SKIP_EMBEDDED_ASSET_ROWS) query = query.not("photo_url", "like", "data:%");
    return query.order("created_at", { ascending: false });
  }

  async function runFetchJob(job) {
    let result = await runSupabaseQuery(job.query(), job.name, job.timeout);
    if (result.error && job.fallbackWhen && job.fallbackWhen(result.error) && job.fallbackQuery) {
      result = await runSupabaseQuery(job.fallbackQuery(), job.name + " fallback", job.timeout);
    }
    if (result.error) {
      console.warn("LSPD fetch failed:", job.name, result.error);
      return false;
    }
    job.apply(result.data || []);
    saveLocalData();
    updateRole();
    renderAllPortal();
    return true;
  }

  async function runSupabaseQuery(builder, label, timeoutMs) {
    const timeout = Number(timeoutMs || 15000);
    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    const query = controller && builder && typeof builder.abortSignal === "function" ? builder.abortSignal(controller.signal) : builder;
    let timer = null;
    const timeoutResult = new Promise(function (resolve) {
      timer = window.setTimeout(function () {
        if (controller) controller.abort();
        resolve({ data: null, error: new Error(label + " timed out after " + timeout + "ms") });
      }, timeout);
    });
    try {
      return await Promise.race([Promise.resolve(query), timeoutResult]);
    } catch (error) {
      return { data: null, error: error };
    } finally {
      window.clearTimeout(timer);
    }
  }

  function scheduleFetchRetry() {
    if (!state.client || state.fetchRetryCount >= 3) return;
    state.fetchRetryCount += 1;
    window.clearTimeout(state.fetchRetryTimer);
    state.fetchRetryTimer = window.setTimeout(fetchAll, 5000 * state.fetchRetryCount);
  }

  function errorText(error) {
    return String((error && (error.message || error.details || error.hint || error.code || error.name)) || "");
  }

  function tableName(key) {
    return (SUPABASE_CONFIG.tables && SUPABASE_CONFIG.tables[key]) || key;
  }

  function syncCurrentAccountFromRows() {
    if (!state.authUser) return;
    const own = state.accounts.find(function (entry) {
      return entry.auth_user_id === state.authUser.id || (entry.email || "").toLowerCase() === state.authUser.email;
    });
    if (!own) return;
    if (!own.auth_user_id && own.id !== state.authUser.account_id) return;
    state.accountProfile = own;
    state.authUser = Object.assign({}, state.authUser, {
      account_id: own.id || state.authUser.account_id || "",
      email: own.email || state.authUser.email,
      role: normalizeRole(own.role || state.authUser.role),
      display_name: own.display_name || state.authUser.display_name,
      discord_user: own.discord_user || state.authUser.discord_user,
      discord_avatar_url: own.discord_avatar_url || state.authUser.discord_avatar_url,
      discord_provider_id: own.discord_provider_id || state.authUser.discord_provider_id,
      discord_linked: Boolean(own.discord_linked || state.authUser.discord_linked)
    });
  }

  function loadLocalData() {
    state.applications = REQUIRE_SECURE_MUTATIONS ? [] : readJson(STORAGE_KEYS.applications).map(normalizeApplication);
    state.accounts = REQUIRE_SECURE_MUTATIONS ? [] : readJson(STORAGE_KEYS.accounts).map(normalizeAccount);
    state.roles = REQUIRE_SECURE_MUTATIONS ? [] : readJson(STORAGE_KEYS.roles);
    state.assets = readJson(STORAGE_KEYS.assets).map(normalizeAsset);
    state.mediaReactions = readJson(STORAGE_KEYS.mediaReactions).map(normalizeMediaReaction);
    state.customRegulations = readJson(STORAGE_KEYS.regulations).map(normalizeRegulation);
    state.schedule = readJson(STORAGE_KEYS.schedule).map(normalizeScheduleRow);
    state.assetOrder = readOrder();
    state.streams = readJson(STORAGE_KEYS.streams).map(normalizeStream);
    state.uiPrefs = readUiPrefs();
    state.visitorId = ensureVisitorId();
    state.authUser = null;
    if (REQUIRE_SECURE_MUTATIONS) localStorage.removeItem(STORAGE_KEYS.session);
  }

  function saveLocalData() {
    if (REQUIRE_SECURE_MUTATIONS) {
      localStorage.removeItem(STORAGE_KEYS.applications);
      localStorage.removeItem(STORAGE_KEYS.accounts);
      localStorage.removeItem(STORAGE_KEYS.roles);
    } else {
      localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(state.applications));
      localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(state.accounts));
      localStorage.setItem(STORAGE_KEYS.roles, JSON.stringify(state.roles));
    }
    localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(state.assets));
    localStorage.setItem(STORAGE_KEYS.mediaReactions, JSON.stringify(state.mediaReactions));
    localStorage.setItem(STORAGE_KEYS.regulations, JSON.stringify(state.customRegulations));
    localStorage.setItem(STORAGE_KEYS.schedule, JSON.stringify(state.schedule));
    localStorage.setItem(STORAGE_KEYS.assetOrder, JSON.stringify(state.assetOrder));
    localStorage.setItem(STORAGE_KEYS.streams, JSON.stringify(state.streams));
    if (state.uiPrefs) localStorage.setItem(STORAGE_KEYS.uiPrefs, JSON.stringify(state.uiPrefs));
  }

  function readJson(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function readOrder() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.assetOrder) || "{}");
      return {
        crew: Array.isArray(parsed.crew) ? parsed.crew : [],
        media: Array.isArray(parsed.media) ? parsed.media : []
      };
    } catch (error) {
      return { crew: [], media: [] };
    }
  }

  function defaultUiPrefs() {
    return {
      font: "Inter, Arial, sans-serif",
      red: "#e7515a",
      blue: "#3aa7ff",
      bg: "#01040b",
      text: "#edf7ff",
      sfx: true,
      tabOrder: defaultWorkspaceTabs.map(function (tab) { return tab[0]; })
    };
  }

  function readUiPrefs() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.uiPrefs) || "{}");
      const defaults = defaultUiPrefs();
      const validTabs = new Set(defaults.tabOrder);
      const tabOrder = Array.isArray(saved.tabOrder)
        ? saved.tabOrder.filter(function (id) { return validTabs.has(id); })
        : [];
      defaults.tabOrder.forEach(function (id) {
        if (!tabOrder.includes(id)) tabOrder.push(id);
      });
      return Object.assign(defaults, saved, { tabOrder: tabOrder });
    } catch (error) {
      return defaultUiPrefs();
    }
  }

  function normalizeApplication(row) {
    const answers = typeof row.answers === "string" ? parseJsonObject(row.answers) : (row.answers || {});
    const questionLabels = typeof row.question_labels === "string" ? parseJsonObject(row.question_labels) : (row.question_labels || {});
    return Object.assign({}, row, {
      id: row.id || uid(),
      kind: row.kind || row.type || "recruitment",
      status: row.status || "pending",
      applicant_email: (row.applicant_email || answers.contact_email || "").toLowerCase(),
      applicant_name: row.applicant_name || answers.full_name || "",
      discord_id: row.discord_id || answers.discord_id || "",
      answers: answers,
      question_labels: questionLabels
    });
  }

  function normalizeAccount(row) {
    return Object.assign({}, row, {
      id: row.id || uid(),
      email: (row.email || "").toLowerCase(),
      role: normalizeRole(row.role || "applicant"),
      display_name: row.display_name || "",
      discord_user: row.discord_user || "",
      discord_avatar_url: row.discord_avatar_url || "",
      discord_provider_id: row.discord_provider_id || "",
      discord_linked: Boolean(row.discord_linked)
    });
  }

  function normalizeAsset(row) {
    const order = Number(row.display_order);
    return Object.assign({}, row, {
      id: row.id || uid(),
      category: row.category === "media" ? "media" : "crew",
      title: row.title || row.name || "",
      subtitle: row.subtitle || row.rank || "",
      discord_id: row.discord_id || "",
      photo_url: row.photo_url || "",
      storage_path: row.storage_path || "",
      caption: row.caption || "",
      media_type: row.media_type || detectMediaType(row.photo_url || ""),
      display_order: Number.isFinite(order) ? order : null
    });
  }

  function normalizeMediaReaction(row) {
    return Object.assign({}, row, {
      id: row.id || uid(),
      asset_id: row.asset_id || "",
      reaction: row.reaction || "👍",
      user_key: row.user_key || "",
      user_email: row.user_email || "",
      created_at: row.created_at || new Date().toISOString()
    });
  }

  function normalizeRegulation(row) {
    return Object.assign({}, row, {
      id: row.id || uid(),
      degree: Number.isFinite(Number(row.degree)) ? Number(row.degree) : 1,
      title: row.title || "",
      description: row.description || row.desc || "",
      created_by: row.created_by || "",
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString()
    });
  }

  function normalizeScheduleRow(row) {
    const wings = typeof row.wings === "string" ? parseJsonObject(row.wings) : (row.wings || {});
    return Object.assign({}, row, {
      id: row.id || uid(),
      badge_number: row.badge_number || row.bn || "",
      name: row.name || "",
      insignia_url: row.insignia_url || "",
      rank: row.rank || policeRanks[policeRanks.length - 1],
      department: row.department || "",
      admin_rank: row.admin_rank || "",
      status: row.status || "ACTIVE",
      punishment: row.punishment || "",
      last_promotion: row.last_promotion || "",
      discord_user: row.discord_user || "",
      points: row.points || "",
      privilege_points: row.privilege_points || "",
      wings: wings,
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString()
    });
  }

  function normalizeStream(row) {
    return Object.assign({}, row, {
      id: row.id || uid(),
      name: row.name || row.title || "",
      logo_url: row.logo_url || row.photo_url || "",
      kick_url: row.kick_url || row.url || "",
      created_by: row.created_by || "",
      created_at: row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString()
    });
  }

  function detectMediaType(value) {
    const source = String(value || "").toLowerCase();
    if (/^data:video\/mp4/.test(source) || /\.mp4(?:[?#]|$)/.test(source)) return "video";
    if (/^data:image\/gif/.test(source) || /\.gif(?:[?#]|$)/.test(source)) return "gif";
    return "image";
  }

  function roleLabel(role) {
    return tr("role" + cap(normalizeRole(role)));
  }

  function orderedWorkspaceTabs() {
    const prefs = state.uiPrefs || readUiPrefs();
    const byId = new Map(defaultWorkspaceTabs.map(function (tab) { return [tab[0], tab]; }));
    const ordered = [];
    (prefs.tabOrder || []).forEach(function (id) {
      if (byId.has(id)) ordered.push(byId.get(id));
    });
    defaultWorkspaceTabs.forEach(function (tab) {
      if (!ordered.some(function (entry) { return entry[0] === tab[0]; })) ordered.push(tab);
    });
    return ordered;
  }

  function syncAssetOrderFromRows() {
    ["crew", "media"].forEach(function (category) {
      const ordered = state.assets
        .filter(function (asset) { return asset.category === category; })
        .filter(function (asset) { return Number.isFinite(Number(asset.display_order)); })
        .sort(function (a, b) { return Number(a.display_order) - Number(b.display_order); })
        .map(function (asset) { return asset.id; });
      if (ordered.length) state.assetOrder[category] = ordered;
    });
  }

  function orderedAssets(category) {
    const manual = state.assetOrder[category] || [];
    const manualIndex = new Map(manual.map(function (id, index) { return [id, index]; }));
    return state.assets
      .filter(function (asset) { return asset.category === category; })
      .map(normalizeAsset)
      .sort(function (a, b) {
        const aManual = manualIndex.has(a.id) ? manualIndex.get(a.id) : Infinity;
        const bManual = manualIndex.has(b.id) ? manualIndex.get(b.id) : Infinity;
        if (aManual !== bManual) return aManual - bManual;
        const aOrder = Number.isFinite(Number(a.display_order)) ? Number(a.display_order) : Infinity;
        const bOrder = Number.isFinite(Number(b.display_order)) ? Number(b.display_order) : Infinity;
        if (aOrder !== bOrder) return aOrder - bOrder;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }

  function normalizeRole(role) {
    if (role === "editor") return "admin";
    if (role === "viewer") return "applicant";
    return role === "owner" || role === "admin" || role === "fto" || role === "media" || role === "ia" || role === "applicant" ? role : "applicant";
  }

  function parseJsonObject(value) {
    try {
      const parsed = JSON.parse(value || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function updateRole() {
    if (state.authUser) {
      state.userEmail = state.authUser.email;
      state.role = normalizeRole(state.authUser.role);
    } else {
      state.userEmail = "";
      state.role = "guest";
    }
    const badge = document.getElementById("roleBadge");
    if (badge) badge.textContent = tr("role" + cap(state.role));
    const emailInput = document.getElementById("authEmailInput");
    const passInput = document.getElementById("authPasswordInput");
    const loggedIn = Boolean(state.authUser);
    if (emailInput && loggedIn) emailInput.value = state.userEmail;
    if (emailInput) emailInput.disabled = loggedIn;
    if (passInput) {
      passInput.disabled = loggedIn;
      if (loggedIn) passInput.value = "";
    }
    emailInput?.classList.add("hidden");
    passInput?.classList.add("hidden");
    document.getElementById("loginButton")?.classList.toggle("hidden", loggedIn);
    document.getElementById("createAccountButton")?.classList.toggle("hidden", loggedIn);
    document.getElementById("logoutButton")?.classList.toggle("hidden", !loggedIn);
    const accountButton = document.getElementById("accountMenuButton");
    if (accountButton) {
      accountButton.classList.toggle("hidden", !loggedIn);
      accountButton.classList.toggle("needs-profile", loggedIn && !hasCompleteAccountProfile());
      accountButton.title = loggedIn ? (state.authUser.display_name || state.userEmail || tr("accountMenuLabel")) : tr("accountMenuLabel");
    }
    const avatar = document.getElementById("accountAvatar");
    if (avatar) avatar.innerHTML = accountAvatarHtml(state.authUser, "small");
    const manager = document.getElementById("roleManagerButton");
    if (manager) manager.classList.toggle("hidden", !canAdmin());
    updateAdminTabVisibility();
  }

  function accountAvatarHtml(account, size) {
    const avatar = account?.discord_avatar_url || "";
    const label = account?.display_name || account?.email || tr("accountMenuLabel");
    const fallbackClass = size === "large" ? "account-avatar-fallback large" : "account-avatar-fallback";
    if (avatar) return '<img src="' + safeAttr(avatar) + '" alt="' + safeAttr(label) + '">';
    return '<span class="' + fallbackClass + '">' + safe(initials(label)) + '</span>';
  }

  function initials(value) {
    const text = String(value || "").trim();
    if (!text) return "U";
    const parts = text.replace(/@.*/, "").split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return text.slice(0, 2).toUpperCase();
  }

  function updateAdminTabVisibility() {
    const allowed = canViewRecords();
    document.getElementById("workspace-dashboard")?.classList.toggle("hidden", !canAdmin());
    ["review", "archives"].forEach(function (workspace) {
      document.getElementById("workspace-" + workspace)?.classList.toggle("hidden", !allowed);
    });
    if ((!allowed && (getCurrentWorkspaceName() === "review" || getCurrentWorkspaceName() === "archives")) || (!canAdmin() && getCurrentWorkspaceName() === "dashboard")) {
      window.setWorkspace?.("recruitment");
    }
  }

  function getCurrentWorkspaceName() {
    try { return currentWorkspace; } catch (error) { return "recruitment"; }
  }

  function updateDatabaseBadge() {
    const badge = document.getElementById("databaseBadge");
    if (!badge) return;
    badge.dataset.state = state.databaseMode;
    badge.textContent = state.databaseMode === "live" ? tr("liveMode") : tr("localMode");
  }

  function renderAllPortal() {
    updateRole();
    updateDatabaseBadge();
    updatePresenceBadge();
    syncCustomRegulationsToRegistry();
    renderCooldown();
    renderApplicantStatus();
    renderDashboard();
    renderReview();
    renderArchives();
    renderSchedule();
    renderAssets("crew");
    renderAssets("media");
    renderStreams();
    renderRoleList();
    renderAccountModal();
    renderProfileRequirementState();
    const crewForm = document.getElementById("crewForm");
    const mediaForm = document.getElementById("mediaForm");
    const regulationForm = document.getElementById("regulationForm");
    const scheduleForm = document.getElementById("scheduleForm");
    if (crewForm) crewForm.classList.toggle("hidden", !canManageCrew());
    if (mediaForm) mediaForm.classList.toggle("hidden", !canAddMedia());
    if (regulationForm) regulationForm.classList.toggle("hidden", !canAddRegulations());
    if (scheduleForm) scheduleForm.classList.toggle("hidden", !canManageSchedule());
    const streamForm = document.getElementById("streamForm");
    if (streamForm) streamForm.classList.toggle("hidden", !canAdmin());
    updateAssetFormState("crew");
    updateAssetFormState("media");
    updateScheduleFormState();
    updateStreamFormState();
    const clear = document.getElementById("clearPendingButton");
    if (clear) clear.classList.toggle("hidden", !canAdmin());
    const reset = document.getElementById("fullResetButton");
    if (reset) reset.classList.toggle("hidden", !canAdmin());
  }

  function renderCooldown() {
    const banner = document.getElementById("cooldownBanner");
    if (!banner) return;
    const cooldown = getCurrentCooldown();
    const pending = getApplicantRecords().find(function (record) { return record.status === "pending"; });
    if (cooldown) {
      banner.classList.remove("hidden");
      banner.querySelector("span").textContent = tr(cooldown.status === "accepted" ? "cooldownAccepted" : "cooldownRejected", { date: formatDate(cooldown.cooldown_until) });
    } else if (pending) {
      banner.classList.remove("hidden");
      banner.querySelector("span").textContent = tr("pendingWarning", { type: pending.kind === "transfer" ? tr("transferLabel") : tr("recruitmentLabel") });
    } else {
      banner.classList.add("hidden");
    }
  }

  function renderApplicantStatus() {
    const target = document.getElementById("applicantStatusCards");
    if (!target) return;
    const records = getApplicantRecords().slice(0, 4);
    if (!state.userEmail || !records.length) {
      target.innerHTML = '<div class="empty-portal">' + safe(tr("noApplicantRecords")) + "</div>";
      return;
    }
    target.innerHTML = records.map(applicationCardHtml).join("");
  }

  function renderReview() {
    const list = document.getElementById("reviewList");
    if (!list) return;
    document.querySelectorAll("[data-review-type]").forEach(function (button) {
      button.setAttribute("aria-selected", String(button.dataset.reviewType === state.activeReviewType));
    });
    if (!canViewRecords()) {
      list.innerHTML = '<div class="empty-portal">' + safe(tr("accessRequired")) + "</div>";
      setCount("reviewCount", 0);
      return;
    }
    const query = (document.getElementById("reviewSearchInput")?.value || "").trim().toLowerCase();
    const records = state.applications.filter(function (app) {
      return app.status === "pending" && app.kind === state.activeReviewType && matchesApplication(app, query);
    });
    setCount("reviewCount", records.length);
    list.innerHTML = records.length ? records.map(applicationCardHtml).join("") : '<div class="empty-portal">' + safe(tr("noPending")) + "</div>";
  }

  function renderArchives() {
    const list = document.getElementById("archiveList");
    if (!list) return;
    document.querySelectorAll("[data-archive-type]").forEach(function (button) {
      button.setAttribute("aria-selected", String(button.dataset.archiveType === state.activeArchive));
    });
    if (!canViewRecords()) {
      list.innerHTML = '<div class="empty-portal">' + safe(tr("accessRequired")) + "</div>";
      return;
    }
    const parts = state.activeArchive.split("-");
    const status = parts[0];
    const kind = parts[1];
    const records = state.applications.filter(function (app) {
      return app.status === status && app.kind === kind;
    });
    list.innerHTML = records.length ? records.map(applicationCardHtml).join("") : '<div class="empty-portal">' + safe(tr("noArchive")) + "</div>";
  }

  function renderDashboard() {
    setCount("dashboardPendingMetric", state.applications.filter(function (app) { return app.status === "pending"; }).length);
    setCount("dashboardArchiveMetric", state.applications.filter(function (app) { return app.status === "accepted" || app.status === "rejected"; }).length);
    setCount("dashboardScheduleMetric", state.schedule.length);
    setCount("dashboardMediaMetric", state.assets.filter(function (asset) { return asset.category === "media"; }).length);
    const list = document.getElementById("dashboardRecentList");
    if (!list) return;
    if (!canAdmin()) {
      list.innerHTML = '<div class="empty-portal">' + safe(tr("accessRequired")) + "</div>";
      return;
    }
    const recent = state.applications.slice(0, 4);
    list.innerHTML = recent.length ? recent.map(applicationCardHtml).join("") : '<div class="empty-portal">' + safe(tr("noApplicantRecords")) + "</div>";
    document.getElementById("dashboardRoleButton")?.classList.toggle("hidden", !canAdmin());
  }

  function renderSchedule() {
    const body = document.getElementById("scheduleTableBody");
    if (!body) return;
    const rows = orderedScheduleRows();
    setCount("scheduleTotalBadge", rows.length);
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="13" class="schedule-empty">' + safe(tr("scheduleEmpty")) + "</td></tr>";
      return;
    }
    body.innerHTML = scheduleRowsBySection(rows).map(function (entry) {
      if (entry.type === "section") {
        return '<tr class="schedule-section-row"><td colspan="13">// ' + safe(entry.title) + '</td></tr>';
      }
      return scheduleRowHtml(entry.row);
    }).join("");
  }

  function orderedScheduleRows() {
    return state.schedule.slice().map(normalizeScheduleRow).sort(function (a, b) {
      const rankDiff = rankIndex(a.rank) - rankIndex(b.rank);
      if (rankDiff) return rankDiff;
      const badgeDiff = Number(a.badge_number || 0) - Number(b.badge_number || 0);
      if (Number.isFinite(badgeDiff) && badgeDiff) return badgeDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  function scheduleRowsBySection(rows) {
    const output = [];
    const used = new Set();
    scheduleSections.forEach(function (section) {
      const sectionRows = rows.filter(function (row) { return section[2].includes(row.rank); });
      if (!sectionRows.length) return;
      if (section[1]) output.push({ type: "section", key: section[0], title: section[1] });
      sectionRows.forEach(function (row) {
        used.add(row.id);
        output.push({ type: "row", row: row });
      });
    });
    rows.forEach(function (row) {
      if (!used.has(row.id)) output.push({ type: "row", row: row });
    });
    return output;
  }

  function scheduleRowHtml(row) {
    const insignia = row.insignia_url ? '<img class="schedule-insignia" src="' + safeAttr(row.insignia_url) + '" alt="">' : '<span class="schedule-dash">-</span>';
    const actions = canManageSchedule() ? '<div class="schedule-actions"><button class="icon-action" type="button" onclick="window.editScheduleRow(\'' + safeAttr(row.id) + '\')"><i class="fa-solid fa-pen"></i></button><button class="icon-action danger" type="button" onclick="window.removeScheduleRow(\'' + safeAttr(row.id) + '\')"><i class="fa-solid fa-trash"></i></button></div>' : "";
    return [
      '<tr>',
      '<td>' + safe(row.badge_number || "-") + '</td>',
      '<td class="schedule-name">' + safe(row.name || "-") + '</td>',
      '<td>' + insignia + '</td>',
      '<td>' + safe(row.rank || "-") + '</td>',
      '<td>' + safe(row.department || "-") + '</td>',
      '<td>' + safe(row.admin_rank || "-") + '</td>',
      '<td><span class="schedule-status ' + safeAttr(String(row.status || "").toLowerCase()) + '">' + safe(row.status || "-") + '</span></td>',
      '<td>' + safe(row.punishment || "-") + '</td>',
      '<td>' + safe(row.last_promotion || "-") + '</td>',
      '<td>' + safe(row.discord_user || "-") + '</td>',
      '<td>' + safe(row.points || "-") + '</td>',
      '<td>' + safe(row.privilege_points || "-") + '</td>',
      '<td class="schedule-admin-col">' + actions + '</td>',
      '</tr>'
    ].join("");
  }

  function rankIndex(rank) {
    const index = policeRanks.indexOf(rank);
    return index >= 0 ? index : policeRanks.length + 1;
  }

  function applicationCardHtml(app) {
    const statusClass = app.status === "accepted" ? "accepted" : app.status === "rejected" ? "rejected" : "";
    const labels = app.question_labels || {};
    const questionHtml = Object.keys(app.answers || {}).map(function (key) {
      const label = labels[key] || getQuestionLabel(app.kind, key);
      const value = app.answers[key] === true ? "Yes" : app.answers[key];
      if (value == null || value === "") return "";
      return '<div class="question-pair"><strong>' + safe(label) + '</strong><span>' + safe(String(value)) + "</span></div>";
    }).filter(Boolean).join("");
    const decisionHtml = decisionDetailsHtml(app);
    let actions = "";
    if (app.status === "pending" && canReviewApplications()) {
      actions = '<div class="review-actions"><button class="portal-button success" type="button" onclick="window.openDecisionModal(\'' + safeAttr(app.id) + '\',\'accepted\')"><i class="fa-solid fa-check"></i><span data-i18n="approve">' + safe(tr("approve")) + '</span></button><button class="portal-button danger" type="button" onclick="window.openDecisionModal(\'' + safeAttr(app.id) + '\',\'rejected\')"><i class="fa-solid fa-xmark"></i><span data-i18n="reject">' + safe(tr("reject")) + '</span></button></div>';
    } else if (app.status !== "pending" && canAdmin()) {
      actions = '<div class="review-actions"><button class="portal-button danger" type="button" onclick="window.deleteArchiveRecord(\'' + safeAttr(app.id) + '\')"><i class="fa-solid fa-trash-can"></i><span data-i18n="deleteArchive">' + safe(tr("deleteArchive")) + '</span></button></div>';
    }
    return [
      '<article class="review-card">',
      '<div class="review-top"><div><h3 class="review-title">' + safe(app.applicant_name || "Unknown applicant") + '</h3><div class="review-meta">' + safe(tr("submittedBy", { email: app.applicant_email || "-" })) + ' · ' + safe(app.discord_id || "-") + ' · ' + safe(tr("submittedAt", { date: formatDateTime(app.created_at) })) + '</div></div><span class="status-pill ' + statusClass + '">' + safe(tr(app.status)) + " · " + safe(app.kind === "transfer" ? tr("transferLabel") : tr("recruitmentLabel")) + "</span></div>",
      '<div class="question-list">' + questionHtml + decisionHtml + "</div>",
      actions,
      "</article>"
    ].join("");
  }

  function decisionDetailsHtml(app) {
    if (app.status === "pending") return "";
    const chunks = [];
    if (app.decision_message) chunks.push(pairHtml(tr("decisionMessage"), app.decision_message));
    if (app.interview_dates) {
      const dates = typeof app.interview_dates === "string" ? parseJsonObject(app.interview_dates) : app.interview_dates;
      chunks.push(pairHtml(tr("interviewDates"), [dates.monday, dates.friday].filter(Boolean).join(" / ")));
    }
    if (app.rejection_reason) chunks.push(pairHtml(tr("reason"), app.rejection_reason));
    if (app.decided_at) chunks.push(pairHtml(tr("decidedAt", { date: formatDateTime(app.decided_at) }), app.decided_by || ""));
    return chunks.join("");
  }

  function pairHtml(label, value) {
    return '<div class="question-pair"><strong>' + safe(label) + '</strong><span>' + safe(value || "-") + "</span></div>";
  }

  function renderAssets(category) {
    const grid = document.getElementById(category === "crew" ? "crewGrid" : "mediaGrid");
    if (!grid) return;
    const records = orderedAssets(category);
    const editable = category === "media" ? canEditMedia() : canManageCrew();
    grid.classList.toggle("drag-enabled", editable);
    if (!records.length) {
      grid.innerHTML = '<div class="empty-portal">' + safe(tr(category === "crew" ? "noCrew" : "noMedia")) + "</div>";
      return;
    }
    grid.innerHTML = records.map(function (asset, index) {
      const title = asset.title || asset.name || "";
      const subtitle = asset.subtitle || asset.rank || asset.caption || "";
      const discord = asset.discord_id ? '<span>' + safe(tr("discordId")) + ": " + safe(asset.discord_id) + "</span>" : "";
      const caption = category === "media" && asset.caption ? '<p class="asset-caption">' + safe(asset.caption) + "</p>" : "";
      const drag = editable ? '<button class="asset-drag-handle" type="button" aria-label="' + safeAttr(tr("dragAsset")) + '" title="' + safeAttr(tr("dragAsset")) + '"><i class="fa-solid fa-grip-lines"></i></button>' : "";
      const actions = editable ? '<div class="asset-card-actions"><button class="portal-button ghost" type="button" onclick="window.editAsset(\'' + safeAttr(asset.id) + '\')"><i class="fa-solid fa-pen-to-square"></i><span data-i18n="edit">' + safe(tr("edit")) + '</span></button><button class="portal-button danger" type="button" onclick="window.removeAsset(\'' + safeAttr(asset.id) + '\')"><i class="fa-solid fa-trash-can"></i><span data-i18n="remove">' + safe(tr("remove")) + "</span></button></div>" : "";
      const reactions = category === "media" ? mediaReactionsHtml(asset.id) : "";
      return '<article class="asset-card" data-asset-id="' + safeAttr(asset.id) + '" data-asset-category="' + safeAttr(category) + '" data-asset-index="' + index + '" draggable="' + (editable ? "true" : "false") + '">' + drag + assetMediaHtml(asset, title) + '<div class="asset-card-body"><h3>' + safe(title) + '</h3><p>' + safe(subtitle || "") + '</p>' + caption + discord + reactions + actions + "</div></article>";
    }).join("");
  }

  function assetMediaHtml(asset, title) {
    const fallback = (PUBLIC_CONFIG.assets || {}).crewFallback || "image2.webp";
    const source = asset.photo_url || fallback;
    if (detectMediaType(source) === "video") {
      return '<video class="asset-media" src="' + safeAttr(source) + '" controls muted playsinline preload="metadata"></video>';
    }
    return '<img class="asset-media" src="' + safeAttr(source) + '" alt="' + safeAttr(title) + '">';
  }

  function mediaReactionsHtml(assetId) {
    const userKey = currentReactionUserKey();
    return '<div class="media-reactions">' + mediaReactionTypes.map(function (reaction) {
      const records = state.mediaReactions.filter(function (entry) { return entry.asset_id === assetId && entry.reaction === reaction; });
      const active = userKey && records.some(function (entry) { return entry.user_key === userKey; });
      return '<button class="reaction-button' + (active ? " active" : "") + '" type="button" data-media-id="' + safeAttr(assetId) + '" data-media-reaction="' + safeAttr(reaction) + '" aria-pressed="' + String(Boolean(active)) + '"><span>' + safe(reaction) + '</span><strong>' + records.length + '</strong></button>';
    }).join("") + '</div>';
  }

  function currentReactionUserKey() {
    if (state.authUser?.id) return state.authUser.id;
    return state.client ? "" : ensureVisitorId();
  }

  async function toggleMediaReaction(assetId, reaction) {
    const asset = state.assets.find(function (entry) { return entry.id === assetId && entry.category === "media"; });
    if (!asset || !mediaReactionTypes.includes(reaction)) return;
    const userKey = currentReactionUserKey();
    if (!userKey) {
      toast(tr("reactLoginRequired"), "warn");
      return;
    }
    const existing = state.mediaReactions.find(function (entry) {
      return entry.asset_id === assetId && entry.reaction === reaction && entry.user_key === userKey;
    });
    const ok = existing
      ? await deleteRows("mediaReactions", [existing.id])
      : await insertRow("mediaReactions", {
        id: uid(),
        asset_id: assetId,
        reaction: reaction,
        user_key: userKey,
        user_email: state.userEmail || "",
        created_at: new Date().toISOString()
      });
    if (!ok) return;
    toast(tr("reactionSaved"), "success");
    await refreshAfterMutation();
  }

  function renderStreams() {
    const grid = document.getElementById("streamsGrid");
    if (!grid) return;
    if (!state.streams.length) {
      grid.innerHTML = '<div class="empty-portal">' + safe(tr("noStreams")) + "</div>";
      return;
    }
    grid.innerHTML = state.streams.map(function (stream) {
      const status = state.streamStatus[stream.id] || { state: "loading" };
      const isLive = status.state === "live";
      const isOffline = status.state === "offline";
      const title = isLive ? (status.title || tr("live")) : (isOffline ? tr("offline") : tr("streamUnavailable"));
      const viewers = isLive ? tr("viewers", { n: formatNumber(status.viewers || 0) }) : tr("offline");
      const thumb = isLive && status.thumbnail ? status.thumbnail + (status.thumbnail.includes("?") ? "&" : "?") + "t=" + Date.now() : (stream.logo_url || (PUBLIC_CONFIG.assets || {}).crewFallback || "image2.webp");
      const actions = canAdmin() ? '<div class="asset-card-actions"><button class="portal-button ghost" type="button" onclick="window.editStream(\'' + safeAttr(stream.id) + '\')"><i class="fa-solid fa-pen-to-square"></i><span data-i18n="edit">' + safe(tr("edit")) + '</span></button><button class="portal-button danger" type="button" onclick="window.removeStream(\'' + safeAttr(stream.id) + '\')"><i class="fa-solid fa-trash-can"></i><span data-i18n="remove">' + safe(tr("remove")) + "</span></button></div>" : "";
      return [
        '<article class="stream-card ' + (isLive ? "is-live" : "is-offline") + '">',
        '<div class="stream-shot"><img src="' + safeAttr(thumb) + '" alt="' + safeAttr(stream.name) + '"><span class="stream-state">' + safe(isLive ? tr("live") : tr("offline")) + "</span></div>",
        '<div class="stream-body">',
        '<img class="stream-logo" src="' + safeAttr(stream.logo_url || "lspd-shield.png") + '" alt="">',
        '<div><div class="stream-name-row"><h3>' + safe(stream.name || "-") + '</h3><span class="stream-viewers"><i class="fa-solid fa-eye"></i>' + safe(viewers) + '</span></div><p>' + safe(title) + "</p></div>",
        '</div>',
        '<div class="stream-actions"><a class="portal-button primary" href="' + safeAttr(stream.kick_url) + '" target="_blank" rel="noopener"><i class="fa-solid fa-up-right-from-square"></i><span data-i18n="streamOpen">' + safe(tr("streamOpen")) + "</span></a>" + actions + "</div>",
        "</article>"
      ].join("");
    }).join("");
  }

  async function saveStream(event) {
    event.preventDefault();
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const patch = {
      name: (data.name || "").trim(),
      logo_url: (data.logo_url || "").trim(),
      kick_url: normalizeKickUrl((data.kick_url || "").trim()),
      updated_at: new Date().toISOString()
    };
    if (!patch.name || !patch.logo_url || !patch.kick_url) {
      toast(tr("validationError"), "error");
      return;
    }
    let ok;
    if (state.streamEditing) {
      ok = await updateRow("streams", state.streamEditing, patch);
    } else {
      ok = await insertRow("streams", Object.assign({ id: uid(), created_by: state.userEmail, created_at: new Date().toISOString() }, patch));
    }
    if (!ok) return;
    state.streamEditing = null;
    form.reset();
    updateStreamFormState();
    toast(tr("savedStream"), "success");
    await refreshAfterMutation();
    refreshStreamStatuses();
  }

  function updateStreamFormState() {
    const editing = Boolean(state.streamEditing);
    const saveButton = document.getElementById("streamSaveButton");
    const cancelButton = document.getElementById("streamCancelEditButton");
    if (saveButton) {
      const icon = saveButton.querySelector("i");
      const label = saveButton.querySelector("span");
      if (icon) icon.className = "fa-solid " + (editing ? "fa-floppy-disk" : "fa-plus");
      if (label) {
        label.dataset.i18n = editing ? "updateStream" : "addStream";
        label.textContent = tr(label.dataset.i18n);
      }
    }
    if (cancelButton) cancelButton.classList.toggle("hidden", !editing);
  }

  function cancelStreamEdit() {
    state.streamEditing = null;
    document.getElementById("streamForm")?.reset();
    updateStreamFormState();
  }

  window.editStream = function (id) {
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const stream = state.streams.find(function (entry) { return entry.id === id; });
    const form = document.getElementById("streamForm");
    if (!stream || !form) return;
    state.streamEditing = id;
    if (form.elements.name) form.elements.name.value = stream.name || "";
    if (form.elements.logo_url) form.elements.logo_url.value = stream.logo_url || "";
    if (form.elements.kick_url) form.elements.kick_url.value = stream.kick_url || "";
    updateStreamFormState();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    toast(tr("editMode"), "success");
  };

  window.removeStream = async function (id) {
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const ok = await deleteRows("streams", [id]);
    if (!ok) return;
    delete state.streamStatus[id];
    toast(tr("removed"), "success");
    await refreshAfterMutation();
  };

  function startStreamPolling() {
    if (state.streamTimer) clearInterval(state.streamTimer);
    refreshStreamStatuses();
    state.streamTimer = setInterval(refreshStreamStatuses, 60000);
  }

  async function refreshStreamStatuses() {
    if (!state.streams.length) return;
    await Promise.all(state.streams.map(refreshStreamStatus));
    renderStreams();
  }

  async function refreshStreamStatus(stream) {
    const slug = kickSlug(stream.kick_url);
    if (!slug) {
      state.streamStatus[stream.id] = { state: "offline" };
      return;
    }
    try {
      const response = await fetch("https://kick.com/api/v2/channels/" + encodeURIComponent(slug), { cache: "no-store" });
      if (!response.ok) throw new Error("Kick request failed");
      const data = await response.json();
      const live = data.livestream || null;
      if (!live) {
        state.streamStatus[stream.id] = { state: "offline" };
        return;
      }
      state.streamStatus[stream.id] = {
        state: "live",
        title: live.session_title || live.stream_title || live.title || data.user?.username || stream.name,
        viewers: Number(live.viewer_count || live.viewers || 0),
        thumbnail: thumbnailFromKick(live)
      };
    } catch (error) {
      console.warn(error);
      state.streamStatus[stream.id] = { state: "unavailable" };
    }
  }

  function thumbnailFromKick(live) {
    if (!live) return "";
    if (typeof live.thumbnail === "string") return live.thumbnail;
    if (live.thumbnail && typeof live.thumbnail === "object") return live.thumbnail.url || live.thumbnail.src || "";
    return live.thumbnail_url || live.preview || "";
  }

  function kickSlug(url) {
    const clean = String(url || "").trim();
    if (!clean) return "";
    const match = clean.match(/kick\.com\/([^/?#]+)/i);
    return (match ? match[1] : clean).replace(/^@/, "").trim();
  }

  function normalizeKickUrl(url) {
    const slug = kickSlug(url);
    return slug ? "https://kick.com/" + slug : "";
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(getLang() === "ar" ? "ar" : "en").format(Number(value || 0));
  }

  function applyUiPrefs() {
    state.uiPrefs = state.uiPrefs || readUiPrefs();
    const root = document.documentElement;
    root.style.setProperty("--user-font", state.uiPrefs.font);
    root.style.setProperty("--critical", state.uiPrefs.red);
    root.style.setProperty("--accent-cyan", state.uiPrefs.blue);
    root.style.setProperty("--page", state.uiPrefs.bg);
    root.style.setProperty("--text", state.uiPrefs.text);
    root.style.setProperty("--custom-bg", state.uiPrefs.bg);
    document.body.style.fontFamily = "var(--user-font)";
    installWorkspaceNav();
    renderSettingsPanel();
  }

  function renderSettingsPanel() {
    const prefs = state.uiPrefs || readUiPrefs();
    const font = document.getElementById("fontSettingInput");
    const red = document.getElementById("redSettingInput");
    const blue = document.getElementById("blueSettingInput");
    const bg = document.getElementById("bgSettingInput");
    const text = document.getElementById("textSettingInput");
    const sfx = document.getElementById("sfxToggleButton");
    const sfxText = document.getElementById("sfxToggleText");
    if (font) font.value = prefs.font;
    if (red) red.value = prefs.red;
    if (blue) blue.value = prefs.blue;
    if (bg) bg.value = prefs.bg;
    if (text) text.value = prefs.text;
    if (sfx) {
      sfx.setAttribute("aria-pressed", String(prefs.sfx !== false));
      sfx.classList.toggle("is-off", prefs.sfx === false);
      const icon = sfx.querySelector("i");
      if (icon) icon.className = "fa-solid " + (prefs.sfx === false ? "fa-volume-xmark" : "fa-volume-high");
    }
    if (sfxText) sfxText.textContent = prefs.sfx === false ? tr("sfxOff") : tr("sfxOn");
    const list = document.getElementById("tabOrderList");
    if (!list) return;
    const byId = new Map(defaultWorkspaceTabs.map(function (tab) { return [tab[0], tab]; }));
    list.innerHTML = (prefs.tabOrder || []).map(function (id, index, arr) {
      const tab = byId.get(id);
      if (!tab) return "";
      return '<div class="tab-order-item"><span><i class="fa-solid ' + tab[1] + '"></i>' + safe(tr(tab[2])) + '</span><div><button class="icon-action" type="button" onclick="window.moveWorkspaceTab(\'' + safeAttr(id) + '\',-1)" title="' + safeAttr(tr("moveUp")) + '"' + (index === 0 ? " disabled" : "") + '><i class="fa-solid fa-arrow-up"></i></button><button class="icon-action" type="button" onclick="window.moveWorkspaceTab(\'' + safeAttr(id) + '\',1)" title="' + safeAttr(tr("moveDown")) + '"' + (index === arr.length - 1 ? " disabled" : "") + '><i class="fa-solid fa-arrow-down"></i></button></div></div>';
    }).join("");
  }

  function saveUiPrefsFromControls() {
    state.uiPrefs = state.uiPrefs || readUiPrefs();
    state.uiPrefs.font = document.getElementById("fontSettingInput")?.value || state.uiPrefs.font;
    state.uiPrefs.red = document.getElementById("redSettingInput")?.value || state.uiPrefs.red;
    state.uiPrefs.blue = document.getElementById("blueSettingInput")?.value || state.uiPrefs.blue;
    state.uiPrefs.bg = document.getElementById("bgSettingInput")?.value || state.uiPrefs.bg;
    state.uiPrefs.text = document.getElementById("textSettingInput")?.value || state.uiPrefs.text;
    saveLocalData();
    applyUiPrefs();
    toast(tr("settingsSaved"), "success");
  }

  function toggleSfxPreference() {
    state.uiPrefs = state.uiPrefs || readUiPrefs();
    state.uiPrefs.sfx = state.uiPrefs.sfx === false;
    saveLocalData();
    renderSettingsPanel();
    if (state.uiPrefs.sfx) {
      primeAudio();
      playSound("settings");
    }
    toast(tr("settingsSaved"), "success");
  }

  window.moveWorkspaceTab = function (id, direction) {
    state.uiPrefs = state.uiPrefs || readUiPrefs();
    const order = state.uiPrefs.tabOrder.slice();
    const index = order.indexOf(id);
    const target = index + Number(direction);
    if (index < 0 || target < 0 || target >= order.length) return;
    order.splice(index, 1);
    order.splice(target, 0, id);
    state.uiPrefs.tabOrder = order;
    saveLocalData();
    applyUiPrefs();
    updateAdminTabVisibility();
    toast(tr("settingsSaved"), "success");
  };

  function resetUiPrefs() {
    state.uiPrefs = defaultUiPrefs();
    saveLocalData();
    applyUiPrefs();
    toast(tr("settingsSaved"), "success");
  }

  function toggleSettingsPanel() {
    const panel = document.getElementById("settingsPanel");
    if (!panel) return;
    panel.classList.toggle("hidden");
    playSound("settings");
  }

  function closeSettingsPanel() {
    document.getElementById("settingsPanel")?.classList.add("hidden");
  }

  function renderRoleList() {
    const target = document.getElementById("roleList");
    if (!target) return;
    const activeAccounts = state.accounts.filter(function (entry) { return entry.auth_user_id; });
    if (!activeAccounts.length) {
      target.innerHTML = '<div class="empty-portal">' + safe(tr("noUsers")) + "</div>";
      return;
    }
    target.innerHTML = activeAccounts.map(function (entry) {
      const locked = entry.role === "owner";
      const profile = [entry.display_name || "-", entry.discord_user || tr("discordMissing")].filter(Boolean).join(" · ");
      const avatar = '<span class="role-account-avatar">' + accountAvatarHtml(entry, "small") + '</span>';
      const options = roleOptions.map(function (role) {
        return '<option value="' + safeAttr(role) + '"' + (normalizeRole(entry.role) === role ? " selected" : "") + '>' + safe(roleLabel(role)) + '</option>';
      }).join("");
      const controls = locked
        ? '<span class="role-badge">' + safe(roleLabel("owner")) + '</span>'
        : '<div class="role-row-controls"><select id="roleSelect-' + safeAttr(entry.id) + '" class="portal-select">' + options + '</select><button class="portal-button success" type="button" onclick="window.updateAccountRole(\'' + safeAttr(entry.id) + '\')"><i class="fa-solid fa-floppy-disk"></i><span data-i18n="saveRole">' + safe(tr("saveRole")) + '</span></button><button class="portal-button ghost" type="button" onclick="window.removeRole(\'' + safeAttr(entry.email) + '\')"><i class="fa-solid fa-rotate-left"></i><span data-i18n="resetAccess">' + safe(tr("resetAccess")) + "</span></button></div>";
      const status = entry.discord_linked ? tr("discordLinked") : tr("discordMissing");
      return '<article class="review-card role-account-card"><div class="review-top"><div class="role-account-main">' + avatar + '<div><h3 class="review-title">' + safe(entry.display_name || entry.email) + '</h3><div class="review-meta">' + safe(entry.email) + ' · ' + safe(roleLabel(entry.role)) + ' · ' + safe(profile) + ' · ' + safe(status) + '</div></div></div>' + controls + '</div></article>';
    }).join("");
  }

  function openApplicationModal(type) {
    if (!state.authUser) {
      toast(tr("loginRequired"), "warn");
      document.getElementById("authEmailInput")?.focus();
      return;
    }
    if (!hasCompleteAccountProfile()) {
      requireAccountProfile(true);
      toast(tr("profileBlocked"), "warn");
      return;
    }
    if (getCurrentCooldown()) {
      renderCooldown();
      toast(document.getElementById("cooldownBanner").textContent.trim(), "warn");
      return;
    }
    const pending = getApplicantRecords().find(function (record) { return record.status === "pending"; });
    if (pending) {
      renderCooldown();
      toast(tr("pendingWarning", { type: pending.kind === "transfer" ? tr("transferLabel") : tr("recruitmentLabel") }), "warn");
      return;
    }
    if (type === "transfer" && !state.transferGateOpen) {
      state.pendingApplicationType = "transfer";
      const agree = document.getElementById("transferRulesAgreeInput");
      const button = document.getElementById("continueTransferButton");
      if (agree) agree.checked = false;
      if (button) button.disabled = true;
      openModal("transferRulesModal");
      return;
    }
    state.applicationType = type === "transfer" ? "transfer" : "recruitment";
    state.applicationStep = 1;
    state.applicationDraft = {};
    state.transferGateOpen = false;
    state.pendingApplicationType = null;
    const form = document.getElementById("applicationForm");
    if (form) form.reset();
    renderApplicationFields();
    openModal("applicationModal");
  }

  function continueTransferAfterRules() {
    const agree = document.getElementById("transferRulesAgreeInput");
    if (!agree?.checked) {
      toast(tr("validationError"), "error");
      return;
    }
    closeModal("transferRulesModal");
    state.transferGateOpen = true;
    openApplicationModal(state.pendingApplicationType || "transfer");
  }

  function renderApplicationFields() {
    const title = document.getElementById("applicationModalTitle");
    const step = document.getElementById("applicationStepText");
    const fields = document.getElementById("applicationFields");
    if (!title || !step || !fields) return;
    title.textContent = tr(state.applicationType === "transfer" ? "applicationModalTitleTransfer" : "applicationModalTitleRecruitment");
    step.textContent = tr("applicationStep", { step: state.applicationStep });
    const defs = questionBank[state.applicationType][state.applicationStep - 1];
    fields.innerHTML = defs.map(fieldHtml).join("");
    defs.forEach(function (def) {
      const node = fields.querySelector('[name="' + def.key + '"]');
      if (!node) return;
      if (def.type === "checkbox") node.checked = Boolean(state.applicationDraft[def.key]);
      else if (state.applicationDraft[def.key] != null) node.value = state.applicationDraft[def.key];
    });
    const emailField = fields.querySelector('[name="contact_email"]');
    if (emailField && state.userEmail && !state.applicationDraft.contact_email) emailField.value = state.userEmail;
    const nameField = fields.querySelector('[name="full_name"]');
    if (nameField && state.authUser?.display_name && !state.applicationDraft.full_name) nameField.value = state.authUser.display_name;
    const discordField = fields.querySelector('[name="discord_id"]');
    if (discordField && state.authUser?.discord_user && !state.applicationDraft.discord_id) discordField.value = state.authUser.discord_user;
    document.getElementById("applicationBackButton").classList.toggle("hidden", state.applicationStep === 1);
    document.getElementById("applicationNextButton").classList.toggle("hidden", state.applicationStep === 2);
    document.getElementById("applicationSubmitButton").classList.toggle("hidden", state.applicationStep !== 2);
  }

  function fieldHtml(field) {
    const label = getLocalizedLabel(field);
    if (field.type === "textarea") {
      return '<label class="full"><span>' + safe(label) + '</span><textarea class="portal-textarea" name="' + safeAttr(field.key) + '" ' + requiredAttr(field) + "></textarea></label>";
    }
    if (field.type === "checkbox") {
      return '<label class="check-field"><input type="checkbox" name="' + safeAttr(field.key) + '" ' + requiredAttr(field) + '><span>' + safe(label) + "</span></label>";
    }
    return '<label><span>' + safe(label) + '</span><input class="portal-input" name="' + safeAttr(field.key) + '" type="' + safeAttr(field.type) + '" ' + requiredAttr(field) + "></label>";
  }

  function requiredAttr(field) {
    return field.required ? "required" : "";
  }

  function validateApplicationStep() {
    const form = document.getElementById("applicationForm");
    const defs = questionBank[state.applicationType][state.applicationStep - 1];
    for (const def of defs) {
      const field = form.elements[def.key];
      if (!field) continue;
      const valid = def.type === "checkbox" ? field.checked : Boolean(String(field.value || "").trim());
      if (def.required && !valid) {
        field.focus();
        toast(tr("validationError"), "error");
        playSound("error");
        return false;
      }
    }
    return true;
  }

  async function submitApplication(event) {
    event.preventDefault();
    if (!validateApplicationStep()) return;
    const form = event.currentTarget;
    Object.assign(state.applicationDraft, collectStepData(form, state.applicationType, state.applicationStep));
    const data = collectApplicationData();
    const applicantEmail = (state.userEmail || data.contact_email || "").trim().toLowerCase();
    if (!applicantEmail) {
      toast(tr("validationError"), "error");
      return;
    }
    const now = new Date().toISOString();
    const row = {
      id: uid(),
      kind: state.applicationType,
      status: "pending",
      applicant_email: applicantEmail,
      applicant_name: state.authUser?.display_name || data.full_name || "",
      discord_id: state.authUser?.discord_user || data.discord_id || "",
      answers: Object.assign({}, data, {
        full_name: state.authUser?.display_name || data.full_name || "",
        discord_id: state.authUser?.discord_user || data.discord_id || ""
      }),
      question_labels: collectQuestionLabels(state.applicationType),
      decision_message: null,
      rejection_reason: null,
      interview_dates: null,
      cooldown_until: null,
      decided_at: null,
      decided_by: null,
      created_at: now,
      updated_at: now
    };
    const ok = await insertRow("applications", row);
    if (!ok) return;
    await sendAuditEvent("application.submit", row.id, {
      applicant_name: row.applicant_name,
      applicant_email: row.applicant_email,
      discord_id: row.discord_id,
      kind: row.kind,
      submitted_at: row.created_at
    }, "application");
    state.userEmail = applicantEmail;
    localStorage.setItem(STORAGE_KEYS.userEmail, applicantEmail);
    const input = document.getElementById("authEmailInput");
    if (input) input.value = applicantEmail;
    closeModal("applicationModal");
    toast(tr("savedApplication"), "success");
    await refreshAfterMutation();
  }

  async function sendAuditEvent(action, target, details, eventType) {
    if (!state.client || !state.authUser || !AUDIT_FUNCTION_NAME) return false;
    const limit = Number(PUBLIC_CONFIG.security?.maxAuditDetailLength || 1800);
    const sanitized = {};
    Object.entries(details || {}).forEach(function (entry) {
      if (/password|secret|token|webhook/i.test(entry[0])) return;
      const value = typeof entry[1] === "string" ? entry[1].slice(0, limit) : entry[1];
      sanitized[entry[0]] = value;
    });
    try {
      const result = await state.client.functions.invoke(AUDIT_FUNCTION_NAME, {
        body: {
          action: String(action || "unknown").slice(0, 96),
          target: String(target || "portal").slice(0, 180),
          eventType: eventType || "admin",
          details: sanitized,
          source: "web-portal"
        }
      });
      if (result.error) throw result.error;
      return true;
    } catch (error) {
      console.warn("LSPD audit delivery failed", error);
      return false;
    }
  }

  function collectStepData(form, type, step) {
    const data = {};
    questionBank[type][step - 1].forEach(function (def) {
      const field = form.elements[def.key];
      if (!field) return;
      data[def.key] = def.type === "checkbox" ? field.checked : String(field.value || "").trim();
    });
    return data;
  }

  function collectApplicationData() {
    const data = {};
    questionBank[state.applicationType].flat().forEach(function (def) {
      data[def.key] = state.applicationDraft[def.key] != null ? state.applicationDraft[def.key] : (def.type === "checkbox" ? false : "");
    });
    return data;
  }

  function collectQuestionLabels(type) {
    const labels = {};
    questionBank[type].flat().forEach(function (def) {
      labels[def.key] = getLocalizedLabel(def);
    });
    return labels;
  }

  function getQuestionLabel(type, key) {
    const field = (questionBank[type] || []).flat().find(function (def) { return def.key === key; });
    return field ? getLocalizedLabel(field) : key;
  }

  function getLocalizedLabel(field) {
    return field.label[getLang()] || field.label.en;
  }

  window.openDecisionModal = function (id, action) {
    if (!canReviewApplications()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const app = state.applications.find(function (record) { return record.id === id; });
    if (!app) return;
    state.pendingDecision = { id, action };
    document.getElementById("decisionTitle").textContent = tr(action === "accepted" ? "decisionApproveTitle" : "decisionRejectTitle");
    document.getElementById("decisionSubject").textContent = app.applicant_name + " - " + app.applicant_email;
    document.getElementById("approvalMessageInput").value = tr("defaultApproval");
    document.getElementById("rejectionReasonInput").value = "";
    document.getElementById("mondayDateInput").value = "";
    document.getElementById("fridayDateInput").value = "";
    const approving = action === "accepted";
    document.getElementById("approvalMessageWrap").classList.toggle("hidden", !approving);
    document.getElementById("mondayDateWrap").classList.toggle("hidden", !approving);
    document.getElementById("fridayDateWrap").classList.toggle("hidden", !approving);
    document.getElementById("rejectionReasonWrap").classList.toggle("hidden", approving);
    document.getElementById("rejectionReasonInput").required = !approving;
    openModal("decisionModal");
  };

  async function saveDecision(event) {
    event.preventDefault();
    if (!canReviewApplications() || !state.pendingDecision) {
      toast(tr("noPermission"), "error");
      return;
    }
    const action = state.pendingDecision.action;
    const now = new Date();
    const patch = {
      status: action,
      updated_at: now.toISOString(),
      decided_at: now.toISOString(),
      decided_by: state.userEmail,
      cooldown_until: addDays(now, action === "accepted" ? 7 : 3).toISOString()
    };
    if (action === "accepted") {
      patch.decision_message = document.getElementById("approvalMessageInput").value.trim() || tr("defaultApproval");
      patch.interview_dates = {
        monday: formatDateForSave(document.getElementById("mondayDateInput").value),
        friday: formatDateForSave(document.getElementById("fridayDateInput").value)
      };
      patch.rejection_reason = null;
    } else {
      const reason = document.getElementById("rejectionReasonInput").value.trim();
      if (!reason) {
        toast(tr("validationError"), "error");
        return;
      }
      patch.rejection_reason = reason;
      patch.decision_message = null;
      patch.interview_dates = null;
    }
    const ok = await updateRow("applications", state.pendingDecision.id, patch);
    if (!ok) return;
    closeModal("decisionModal");
    state.pendingDecision = null;
    toast(tr("savedDecision"), "success");
    await refreshAfterMutation();
  }

  async function clearPending() {
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    if (!confirm(tr("confirmClear"))) return;
    const ids = state.applications.filter(function (app) {
      return app.status === "pending" && app.kind === state.activeReviewType;
    }).map(function (app) { return app.id; });
    const ok = await deleteRows("applications", ids);
    if (!ok) return;
    toast(tr("pendingCleared"), "success");
    await refreshAfterMutation();
  }

  async function resetSystem() {
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    if (!confirm(tr("confirmReset"))) return;
    const ids = state.applications.filter(function (app) {
      return app.status === "accepted" || app.status === "rejected";
    }).map(function (app) { return app.id; });
    const ok = await deleteRows("applications", ids);
    if (!ok) return;
    toast(tr("resetDone"), "success");
    await refreshAfterMutation();
  }

  function openRoleModal() {
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    renderRoleList();
    openModal("roleModal");
  }

  async function saveRole(event) {
    event.preventDefault();
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const email = document.getElementById("roleEmailInput").value.trim().toLowerCase();
    const role = document.getElementById("roleSelectInput").value;
    if (!email) {
      toast(tr("validationError"), "error");
      return;
    }
    const existing = state.accounts.find(function (entry) { return (entry.email || "").toLowerCase() === email; });
    if (!existing) {
      toast(tr("accountMustRegister"), "warn");
      return;
    }
    if (existing.role === "owner") {
      toast(tr("noPermission"), "error");
      return;
    }
    const patch = {
      role: normalizeRole(role),
      updated_at: new Date().toISOString()
    };
    const ok = await updateRow("accounts", existing.id, patch);
    if (!ok) return;
    event.currentTarget.reset();
    toast(tr("savedRole"), "success");
    await refreshAfterMutation();
  }

  window.updateAccountRole = async function (id) {
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const existing = state.accounts.find(function (entry) { return entry.id === id; });
    if (!existing || existing.role === "owner") return;
    const select = document.getElementById("roleSelect-" + id);
    const role = normalizeRole(select?.value || "applicant");
    const ok = await updateRow("accounts", existing.id, { role: role, updated_at: new Date().toISOString() });
    if (!ok) return;
    toast(tr("savedRole"), "success");
    await refreshAfterMutation();
  };

  window.removeRole = async function (email) {
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const existing = state.accounts.find(function (entry) { return (entry.email || "").toLowerCase() === email.toLowerCase(); });
    if (!existing || existing.role === "owner") return;
    const ok = await updateRow("accounts", existing.id, { role: "applicant", updated_at: new Date().toISOString() });
    if (!ok) {
      toast(tr("databaseError"), "error");
      return;
    }
    toast(tr("removed"), "success");
    await refreshAfterMutation();
  };

  async function saveCustomRegulation(event) {
    event.preventDefault();
    if (!canAddRegulations()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const row = {
      id: uid(),
      degree: Number(data.degree),
      title: (data.title || "").trim(),
      description: (data.description || "").trim(),
      created_by: state.userEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    if (!row.title || !row.description || !Number.isFinite(row.degree)) {
      toast(tr("validationError"), "error");
      return;
    }
    const ok = await insertRow("regulations", row);
    if (!ok) return;
    event.currentTarget.reset();
    syncCustomRegulationsToRegistry();
    toast(tr("savedRegulation"), "success");
    await refreshAfterMutation();
  }

  function syncCustomRegulationsToRegistry() {
    try {
      if (typeof regulationsData === "undefined" || !Array.isArray(regulationsData)) return;
      for (let index = regulationsData.length - 1; index >= 0; index -= 1) {
        if (String(regulationsData[index].source || "").indexOf("custom:") === 0) regulationsData.splice(index, 1);
      }
      state.customRegulations.map(normalizeRegulation).forEach(function (entry) {
        regulationsData.push({
          degree: entry.degree,
          id: "IA-" + String(entry.id).slice(0, 8),
          title: entry.title,
          desc: entry.description,
          source: "custom:" + entry.id
        });
      });
      if (typeof updateCounts === "function") updateCounts();
      if (typeof renderCards === "function") renderCards();
    } catch (error) {
      console.warn("LSPD regulation sync failed", error);
    }
  }

  async function saveScheduleRow(event) {
    event.preventDefault();
    if (!canManageSchedule()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const fileUrl = await readSelectedFile(form.elements.insignia_file);
    const patch = {
      badge_number: (data.badge_number || "").trim(),
      name: (data.name || "").trim(),
      insignia_url: (fileUrl || data.insignia_url || "").trim(),
      rank: (data.rank || "").trim(),
      department: (data.department || "").trim(),
      admin_rank: (data.admin_rank || "").trim(),
      status: (data.status || "ACTIVE").trim(),
      punishment: (data.punishment || "").trim(),
      last_promotion: (data.last_promotion || "").trim(),
      discord_user: (data.discord_user || "").trim(),
      points: (data.points || "").trim(),
      privilege_points: (data.privilege_points || "").trim(),
      wings: collectWings(form),
      updated_at: new Date().toISOString()
    };
    if (!patch.badge_number || !patch.name || !patch.rank) {
      toast(tr("validationError"), "error");
      return;
    }
    const ok = state.scheduleEditing
      ? await updateRow("schedule", state.scheduleEditing, patch)
      : await insertRow("schedule", Object.assign({ id: uid(), created_at: new Date().toISOString(), created_by: state.userEmail }, patch));
    if (!ok) return;
    state.scheduleEditing = null;
    form.reset();
    updateScheduleFormState();
    toast(tr("savedAsset"), "success");
    await refreshAfterMutation();
  }

  function collectWings(form) {
    return scheduleWings.reduce(function (output, wing) {
      output[wing[0]] = Boolean(form.elements["wing_" + wing[0]]?.checked);
      return output;
    }, {});
  }

  function updateScheduleFormState() {
    const editing = Boolean(state.scheduleEditing);
    const saveButton = document.getElementById("scheduleSaveButton");
    const cancelButton = document.getElementById("scheduleCancelEditButton");
    if (saveButton) {
      const icon = saveButton.querySelector("i");
      const label = saveButton.querySelector("span");
      if (icon) icon.className = "fa-solid " + (editing ? "fa-floppy-disk" : "fa-plus");
      if (label) {
        label.dataset.i18n = editing ? "scheduleUpdate" : "scheduleAdd";
        label.textContent = tr(label.dataset.i18n);
      }
    }
    if (cancelButton) cancelButton.classList.toggle("hidden", !editing);
  }

  function cancelScheduleEdit() {
    state.scheduleEditing = null;
    document.getElementById("scheduleForm")?.reset();
    updateScheduleFormState();
  }

  window.editScheduleRow = function (id) {
    if (!canManageSchedule()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const row = state.schedule.find(function (entry) { return entry.id === id; });
    const form = document.getElementById("scheduleForm");
    if (!row || !form) return;
    state.scheduleEditing = id;
    ["badge_number", "name", "rank", "department", "admin_rank", "status", "punishment", "last_promotion", "discord_user", "points", "privilege_points", "insignia_url"].forEach(function (key) {
      if (form.elements[key]) form.elements[key].value = row[key] || "";
    });
    scheduleWings.forEach(function (wing) {
      const input = form.elements["wing_" + wing[0]];
      if (input) input.checked = Boolean(row.wings && row.wings[wing[0]]);
    });
    updateScheduleFormState();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    toast(tr("editMode"), "success");
  };

  window.removeScheduleRow = async function (id) {
    if (!canManageSchedule()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const ok = await deleteRows("schedule", [id]);
    if (!ok) return;
    toast(tr("removed"), "success");
    await refreshAfterMutation();
  };

  async function saveAsset(event, category) {
    event.preventDefault();
    if ((category === "crew" && !canManageCrew()) || (category === "media" && !canAddMedia())) {
      toast(tr("noPermission"), "error");
      return;
    }
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const editingId = state.assetEditing[category];
    const existing = editingId ? state.assets.find(function (asset) { return asset.id === editingId && asset.category === category; }) : null;
    if (existing && (category === "media" ? !canEditMedia() : !canManageCrew())) {
      toast(tr("noPermission"), "error");
      return;
    }
    let uploaded = { url: "", path: "" };
    try {
      uploaded = category === "media" ? await uploadSelectedFile(form.elements.media_file, "media") : uploaded;
    } catch (error) {
      console.warn(error);
      toast(tr("databaseError"), "error");
      return;
    }
    const typedPhotoUrl = (data.photo_url || "").trim();
    const existingPhotoUrl = (existing && existing.photo_url) || "";
    const photoUrl = (uploaded.url || typedPhotoUrl || existingPhotoUrl).trim();
    const storagePath = uploaded.path || (photoUrl === existingPhotoUrl ? ((existing && existing.storage_path) || "") : "");
    if (category === "media" && !photoUrl) {
      toast(tr("validationError"), "error");
      return;
    }
    const patch = {
      title: (data.title || "").trim(),
      subtitle: (data.subtitle || "").trim(),
      discord_id: (data.discord_id || "").trim(),
      photo_url: photoUrl,
      storage_path: storagePath,
      caption: (data.caption || "").trim(),
      media_type: category === "media" ? detectMediaType(photoUrl) : "image",
      updated_at: new Date().toISOString()
    };
    let ok;
    if (existing) {
      ok = await updateRow("assets", existing.id, patch);
    } else {
      const order = orderedAssets(category).length;
      ok = await insertRow("assets", Object.assign({
        id: uid(),
        category,
        created_by: state.userEmail,
        created_at: new Date().toISOString(),
        display_order: order
      }, patch));
    }
    if (!ok) return;
    form.reset();
    state.assetEditing[category] = null;
    updateAssetFormState(category);
    toast(tr("savedAsset"), "success");
    await refreshAfterMutation();
  }

  function updateAssetFormState(category) {
    const form = document.getElementById(category === "crew" ? "crewForm" : "mediaForm");
    if (!form) return;
    const editing = Boolean(state.assetEditing[category]);
    form.classList.toggle("editing-asset", editing);
    const saveButton = document.getElementById(category + "SaveButton");
    const cancelButton = document.getElementById(category + "CancelEditButton");
    if (saveButton) {
      const icon = saveButton.querySelector("i");
      const label = saveButton.querySelector("span");
      if (icon) icon.className = "fa-solid " + (editing ? "fa-floppy-disk" : "fa-plus");
      if (label) {
        label.dataset.i18n = editing ? (category === "crew" ? "updateCrew" : "updateMedia") : (category === "crew" ? "addCrew" : "addMedia");
        label.textContent = tr(label.dataset.i18n);
      }
    }
    if (cancelButton) cancelButton.classList.toggle("hidden", !editing);
  }

  function cancelAssetEdit(category) {
    state.assetEditing[category] = null;
    const form = document.getElementById(category === "crew" ? "crewForm" : "mediaForm");
    if (form) form.reset();
    updateAssetFormState(category);
  }

  window.editAsset = function (id) {
    const asset = state.assets.find(function (entry) { return entry.id === id; });
    if (!asset) return;
    const category = asset.category === "media" ? "media" : "crew";
    if ((category === "media" && !canEditMedia()) || (category === "crew" && !canManageCrew())) {
      toast(tr("noPermission"), "error");
      return;
    }
    const form = document.getElementById(category === "crew" ? "crewForm" : "mediaForm");
    if (!form) return;
    state.assetEditing[category] = id;
    if (form.elements.title) form.elements.title.value = asset.title || "";
    if (form.elements.subtitle) form.elements.subtitle.value = asset.subtitle || "";
    if (form.elements.discord_id) form.elements.discord_id.value = asset.discord_id || "";
    if (form.elements.photo_url) form.elements.photo_url.value = asset.photo_url || "";
    if (form.elements.caption) form.elements.caption.value = asset.caption || "";
    updateAssetFormState(category);
    form.scrollIntoView({ behavior: "smooth", block: "center" });
    toast(tr("editMode"), "success");
  };

  window.removeAsset = async function (id) {
    const asset = state.assets.find(function (entry) { return entry.id === id; });
    const category = asset && asset.category === "media" ? "media" : "crew";
    if ((category === "media" && !canEditMedia()) || (category === "crew" && !canManageCrew())) {
      toast(tr("noPermission"), "error");
      return;
    }
    const ok = await deleteRows("assets", [id]);
    if (!ok) return;
    toast(tr("removed"), "success");
    await refreshAfterMutation();
  };

  window.deleteArchiveRecord = async function (id) {
    if (!canAdmin()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const record = state.applications.find(function (app) { return app.id === id; });
    if (!record || record.status === "pending") return;
    if (!confirm(tr("confirmDeleteArchive"))) return;
    const ok = await deleteRows("applications", [id]);
    if (!ok) return;
    toast(tr("archiveDeleted"), "success");
    await refreshAfterMutation();
  };

  function handleAssetDragStart(event) {
    const card = event.target.closest(".asset-card[data-asset-id]");
    if (!card || (card.dataset.assetCategory === "media" ? !canEditMedia() : !canManageCrew())) return;
    state.dragAsset = {
      id: card.dataset.assetId,
      category: card.dataset.assetCategory
    };
    playSound("drag");
    card.classList.add("dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", state.dragAsset.id);
  }

  function handleAssetDragOver(event) {
    const card = event.target.closest(".asset-card[data-asset-id]");
    if (!card || !state.dragAsset || card.dataset.assetCategory !== state.dragAsset.category) return;
    event.preventDefault();
    card.classList.add("drag-over");
    event.dataTransfer.dropEffect = "move";
  }

  async function handleAssetDrop(event) {
    const card = event.target.closest(".asset-card[data-asset-id]");
    if (!card || !state.dragAsset || card.dataset.assetCategory !== state.dragAsset.category) return;
    event.preventDefault();
    document.querySelectorAll(".asset-card.drag-over").forEach(function (node) { node.classList.remove("drag-over"); });
    if (card.dataset.assetId === state.dragAsset.id) return;
    await moveAssetBefore(state.dragAsset.category, state.dragAsset.id, card.dataset.assetId);
    playSound("success");
  }

  function handleAssetDragEnd() {
    document.querySelectorAll(".asset-card.dragging, .asset-card.drag-over").forEach(function (node) {
      node.classList.remove("dragging", "drag-over");
    });
    state.dragAsset = null;
  }

  async function moveAssetBefore(category, draggedId, targetId) {
    const ids = orderedAssets(category).map(function (asset) { return asset.id; });
    const from = ids.indexOf(draggedId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, draggedId);
    state.assetOrderLockUntil = Date.now() + 30000;
    state.assetOrder[category] = ids;
    state.assets = state.assets.map(function (asset) {
      if (asset.category !== category) return asset;
      const index = ids.indexOf(asset.id);
      return index >= 0 ? Object.assign({}, asset, { display_order: index, updated_at: new Date().toISOString() }) : asset;
    });
    saveLocalData();
    renderAssets(category);
    toast(tr("reorderSaved"), "success");
    if (state.client) await persistAssetOrder(category, ids);
  }

  async function persistAssetOrder(category, ids) {
    for (let index = 0; index < ids.length; index += 1) {
      const ok = await updateRow("assets", ids[index], { display_order: index, updated_at: new Date().toISOString() }, { quiet: true });
      if (!ok) return;
    }
  }

  async function insertRow(table, row) {
    if (REQUIRE_SECURE_MUTATIONS && !state.client) {
      toast(tr("databaseError"), "error");
      return false;
    }
    if (state.client) {
      let result = await state.client.from(tableName(table)).insert(row);
      if (result.error && table === "assets" && row) {
        const fallback = assetFallbackPayload(row, result.error);
        if (fallback) result = await state.client.from(tableName(table)).insert(fallback);
      }
      if (result.error) {
        console.warn(result.error);
        toast(tr("databaseError"), "error");
        return false;
      }
      applyLocalInsert(table, row);
      saveLocalData();
      if (canEdit()) await sendAuditEvent(table + ".insert", row.id || table, auditPayload(row), "admin");
      return true;
    }
    applyLocalInsert(table, row);
    saveLocalData();
    return true;
  }

  async function updateRow(table, id, patch, options) {
    const settings = options || {};
    if (REQUIRE_SECURE_MUTATIONS && !state.client) {
      if (!settings.quiet) toast(tr("databaseError"), "error");
      return false;
    }
    if (state.client) {
      let result = await state.client.from(tableName(table)).update(patch).eq("id", id);
      if (result.error && table === "assets" && patch) {
        const fallback = assetFallbackPayload(patch, result.error);
        if (fallback) result = Object.keys(fallback).length ? await state.client.from(tableName(table)).update(fallback).eq("id", id) : { error: null };
      }
      if (result.error) {
        console.warn(result.error);
        if (!settings.quiet) toast(tr("databaseError"), "error");
        return false;
      }
      applyLocalUpdate(table, id, patch);
      saveLocalData();
      if (canEdit()) await sendAuditEvent(table + ".update", id, auditPayload(patch), "admin");
      return true;
    }
    applyLocalUpdate(table, id, patch);
    saveLocalData();
    return true;
  }

  function assetFallbackPayload(payload, error) {
    const message = String((error && (error.message || error.details || error.hint || error.code)) || "");
    if (!/display_order|storage_path|schema cache|column/i.test(message)) return null;
    const fallback = Object.assign({}, payload);
    let changed = false;
    if (Object.prototype.hasOwnProperty.call(fallback, "display_order") && /display_order|schema cache|column/i.test(message)) {
      delete fallback.display_order;
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(fallback, "storage_path") && /storage_path|schema cache|column/i.test(message)) {
      delete fallback.storage_path;
      changed = true;
    }
    return changed ? fallback : null;
  }

  function applyLocalInsert(table, row) {
    if (table === "applications") state.applications.unshift(normalizeApplication(row));
    if (table === "accounts") state.accounts.push(normalizeAccount(row));
    if (table === "roles") state.roles.push(row);
    if (table === "assets") state.assets.unshift(normalizeAsset(row));
    if (table === "mediaReactions") state.mediaReactions.unshift(normalizeMediaReaction(row));
    if (table === "regulations") state.customRegulations.unshift(normalizeRegulation(row));
    if (table === "schedule") state.schedule.unshift(normalizeScheduleRow(row));
    if (table === "streams") state.streams.unshift(normalizeStream(row));
  }

  function applyLocalUpdate(table, id, patch) {
    if (table === "applications") {
      state.applications = state.applications.map(function (row) { return row.id === id ? normalizeApplication(Object.assign({}, row, patch)) : row; });
    }
    if (table === "accounts") {
      state.accounts = state.accounts.map(function (row) { return row.id === id ? normalizeAccount(Object.assign({}, row, patch)) : row; });
      const own = state.accounts.find(function (row) {
        return row.id === id && state.authUser && (row.auth_user_id === state.authUser.id || row.email === state.authUser.email);
      });
      if (own) {
        state.accountProfile = own;
        state.authUser = Object.assign({}, state.authUser, {
          account_id: own.id,
          email: own.email || state.authUser.email,
          role: normalizeRole(own.role || state.authUser.role),
          display_name: own.display_name || state.authUser.display_name,
          discord_user: own.discord_user || state.authUser.discord_user,
          discord_avatar_url: own.discord_avatar_url || state.authUser.discord_avatar_url,
          discord_provider_id: own.discord_provider_id || state.authUser.discord_provider_id,
          discord_linked: Boolean(own.discord_linked || state.authUser.discord_linked)
        });
      }
    }
    if (table === "assets") {
      state.assets = state.assets.map(function (row) { return row.id === id ? normalizeAsset(Object.assign({}, row, patch)) : row; });
    }
    if (table === "mediaReactions") {
      state.mediaReactions = state.mediaReactions.map(function (row) { return row.id === id ? normalizeMediaReaction(Object.assign({}, row, patch)) : row; });
    }
    if (table === "regulations") {
      state.customRegulations = state.customRegulations.map(function (row) { return row.id === id ? normalizeRegulation(Object.assign({}, row, patch)) : row; });
    }
    if (table === "schedule") {
      state.schedule = state.schedule.map(function (row) { return row.id === id ? normalizeScheduleRow(Object.assign({}, row, patch)) : row; });
    }
    if (table === "streams") {
      state.streams = state.streams.map(function (row) { return row.id === id ? normalizeStream(Object.assign({}, row, patch)) : row; });
    }
  }

  function isMissingDisplayOrderError(error) {
    const message = String((error && (error.message || error.details || error.hint || error.code)) || "");
    return /display_order|schema cache|column/i.test(message);
  }

  async function deleteRows(table, ids) {
    if (!ids.length) return true;
    if (REQUIRE_SECURE_MUTATIONS && !state.client) {
      toast(tr("databaseError"), "error");
      return false;
    }
    if (state.client) {
      const result = await state.client.from(tableName(table)).delete().in("id", ids);
      if (result.error) {
        console.warn(result.error);
        toast(tr("databaseError"), "error");
        return false;
      }
      applyLocalDelete(table, ids);
      saveLocalData();
      if (canEdit()) await sendAuditEvent(table + ".delete", ids.join(","), { count: ids.length, ids: ids.slice(0, 50) }, "admin");
      return true;
    }
    applyLocalDelete(table, ids);
    saveLocalData();
    return true;
  }

  function applyLocalDelete(table, ids) {
    if (table === "applications") state.applications = state.applications.filter(function (row) { return !ids.includes(row.id); });
    if (table === "accounts") state.accounts = state.accounts.filter(function (row) { return !ids.includes(row.id); });
    if (table === "assets") {
      state.assets = state.assets.filter(function (row) { return !ids.includes(row.id); });
      state.assetOrder.crew = state.assetOrder.crew.filter(function (id) { return !ids.includes(id); });
      state.assetOrder.media = state.assetOrder.media.filter(function (id) { return !ids.includes(id); });
    }
    if (table === "mediaReactions") state.mediaReactions = state.mediaReactions.filter(function (row) { return !ids.includes(row.id); });
    if (table === "regulations") state.customRegulations = state.customRegulations.filter(function (row) { return !ids.includes(row.id); });
    if (table === "schedule") state.schedule = state.schedule.filter(function (row) { return !ids.includes(row.id); });
    if (table === "streams") state.streams = state.streams.filter(function (row) { return !ids.includes(row.id); });
  }

  function auditPayload(value) {
    const allowed = [
      "id", "kind", "status", "applicant_email", "applicant_name", "decision_message",
      "rejection_reason", "interview_dates", "cooldown_until", "decided_by", "email",
      "role", "display_name", "discord_user", "discord_avatar_url", "discord_provider_id", "discord_linked", "category", "title", "subtitle", "discord_id", "caption", "display_order", "storage_path",
      "media_type", "asset_id", "reaction", "degree", "description", "badge_number", "rank", "department",
      "admin_rank", "status", "punishment", "last_promotion", "points", "privilege_points", "wings",
      "name", "kick_url", "created_by", "created_at", "updated_at"
    ];
    return allowed.reduce(function (output, key) {
      if (value && Object.prototype.hasOwnProperty.call(value, key)) output[key] = value[key];
      return output;
    }, {});
  }

  async function refreshAfterMutation() {
    renderAllPortal();
    if (state.client) scheduleFetchAll();
  }

  function getApplicantRecords() {
    const email = state.userEmail.toLowerCase();
    if (!email) return [];
    return state.applications.filter(function (app) { return (app.applicant_email || "").toLowerCase() === email; });
  }

  function getCurrentCooldown() {
    const now = Date.now();
    return getApplicantRecords()
      .filter(function (app) { return app.cooldown_until && new Date(app.cooldown_until).getTime() > now; })
      .sort(function (a, b) { return new Date(b.cooldown_until).getTime() - new Date(a.cooldown_until).getTime(); })[0];
  }

  function matchesApplication(app, query) {
    if (!query) return true;
    const haystack = [
      app.applicant_email,
      app.applicant_name,
      app.discord_id,
      app.kind,
      app.status,
      JSON.stringify(app.answers || {})
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  }

  function canViewRecords() {
    return canAdmin() || state.role === "fto";
  }

  function canEdit() {
    return canAdmin();
  }

  function canAdmin() {
    return state.role === "owner" || state.role === "admin";
  }

  function canReviewApplications() {
    return canAdmin() || state.role === "fto";
  }

  function canManageCrew() {
    return canAdmin();
  }

  function canAddMedia() {
    return canAdmin() || state.role === "media";
  }

  function canEditMedia() {
    return canAdmin();
  }

  function canAddRegulations() {
    return canAdmin() || state.role === "ia";
  }

  function canManageSchedule() {
    return canAdmin();
  }

  function openModal(id) {
    document.getElementById(id)?.classList.remove("hidden");
    playSound("open");
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.add("hidden");
    playSound("close");
  }

  function toggleById(id, show) {
    const node = document.getElementById(id);
    if (node) node.classList.toggle("hidden", !show);
  }

  function safe(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  }

  function safeAttr(value) {
    return safe(value).replace(/`/g, "&#096;");
  }

  function uid() {
    if (crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }

  function ensureVisitorId() {
    if (state.visitorId) return state.visitorId;
    state.visitorId = uid();
    localStorage.setItem(STORAGE_KEYS.visitorId, state.visitorId);
    return state.visitorId;
  }

  function readSelectedFile(input) {
    const file = input && input.files && input.files[0];
    if (!file) return Promise.resolve({ url: "", path: "" });
    return uploadSelectedFile(input, "media");
  }

  async function uploadSelectedFile(input, category) {
    const file = input && input.files && input.files[0];
    if (!file) return { url: "", path: "" };
    if (!state.client || !state.client.storage) throw new Error("Supabase Storage is not connected.");

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "video/mp4"];
    if (file.type && !allowedTypes.includes(file.type)) {
      throw new Error("Unsupported media file type: " + file.type);
    }

    const safeName = String(file.name || "upload")
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(-96) || "upload";
    const folder = category === "crew" ? "crew" : "media";
    const day = new Date().toISOString().slice(0, 10);
    const path = folder + "/" + day + "/" + uid() + "-" + safeName;

    const upload = await state.client.storage.from(MEDIA_STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false
    });
    if (upload.error) throw upload.error;

    const publicUrl = state.client.storage.from(MEDIA_STORAGE_BUCKET).getPublicUrl(path);
    const url = publicUrl && publicUrl.data && publicUrl.data.publicUrl;
    if (!url) throw new Error("Storage upload succeeded but no public URL was returned.");
    return { url, path };
  }

  function startPresence() {
    ensureVisitorId();
    updatePresenceBadge();
    if (state.presenceTimer) clearInterval(state.presenceTimer);
    if (!state.client) return;
    refreshPresence();
    state.presenceTimer = setInterval(refreshPresence, Math.max(PRESENCE_INTERVAL_MS, 60000));
  }

  async function refreshPresence() {
    if (!state.client) {
      state.onlineCount = 1;
      updatePresenceBadge();
      return;
    }
    const now = new Date();
    try {
      await state.client.from(tableName("presence")).upsert({
        visitor_key: ensureVisitorId(),
        user_email: state.userEmail || null,
        last_seen: now.toISOString()
      }, { onConflict: "visitor_key" });
      const activeWindowMs = Math.max(PRESENCE_INTERVAL_MS * 3, 300000);
      const cutoff = new Date(now.getTime() - activeWindowMs).toISOString();
      const result = await state.client
        .from(tableName("presence"))
        .select("visitor_key", { count: "exact", head: true })
        .gte("last_seen", cutoff);
      if (!result.error && typeof result.count === "number") state.onlineCount = Math.max(1, result.count);
      updatePresenceBadge();
    } catch (error) {
      console.warn("LSPD presence failed", error);
    }
  }

  function updatePresenceBadge() {
    const count = document.getElementById("presenceCount");
    const badge = document.getElementById("presenceBadge");
    const value = Math.max(1, Number(state.onlineCount || 1));
    if (count) count.textContent = String(value);
    if (badge) badge.title = tr("activeUsers", { n: value });
  }

  function cap(value) {
    return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
  }

  function addDays(date, days) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function formatDateForSave(value) {
    return value ? value.replace(/-/g, "/") : "";
  }

  function formatDate(value) {
    if (!value) return "-";
    return new Date(value).toLocaleDateString(getLang() === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatDateTime(value) {
    if (!value) return "-";
    return new Date(value).toLocaleString(getLang() === "ar" ? "ar-SA" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function setCount(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value);
  }

  function debounce(fn, delay) {
    let timer;
    return function () {
      const args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(null, args); }, delay);
    };
  }

  function toast(message, type) {
    const stack = document.getElementById("toastStack");
    if (!stack) return;
    const node = document.createElement("div");
    node.className = "portal-toast " + (type || "");
    node.textContent = message;
    stack.appendChild(node);
    playSound(type === "error" ? "error" : "success");
    setTimeout(function () { node.remove(); }, 4200);
  }

  const UISound = {
    context: null,
    master: null,
    filter: null,
    volume: .14,
    lastPlayed: {},
    init: function () {
      if (state.uiPrefs && state.uiPrefs.sfx === false) return false;
      try {
        this.context = this.context || new (window.AudioContext || window.webkitAudioContext)();
        if (!this.master) {
          this.master = this.context.createGain();
          this.filter = this.context.createBiquadFilter();
          this.filter.type = "lowpass";
          this.filter.frequency.value = 3200;
          this.filter.Q.value = .7;
          this.master.gain.value = this.volume;
          this.filter.connect(this.master);
          this.master.connect(this.context.destination);
        }
        state.audioReady = true;
        if (this.context.state === "suspended") this.context.resume();
        return true;
      } catch (error) {
        state.audioReady = false;
        return false;
      }
    },
    play: function (type) {
      state.uiPrefs = state.uiPrefs || readUiPrefs();
      if (state.uiPrefs.sfx === false) return;
      const cooldowns = { hover: 70, type: 48, tick: 55, focus: 80 };
      const now = Date.now();
      if (cooldowns[type] && now - (this.lastPlayed[type] || 0) < cooldowns[type]) return;
      this.lastPlayed[type] = now;
      if (!state.audioReady || !this.context || !this.filter) return;
      const patterns = {
        hover: [[880, .026, .026, "triangle", 0, 1800], [1320, .012, .032, "sine", .012, 2500]],
        focus: [[420, .035, .038, "sine", 0, 1400], [760, .018, .045, "triangle", .026, 2200]],
        type: [[1080, .018, .018, "square", 0, 2400]],
        tick: [[760, .026, .024, "triangle", 0, 1900], [1040, .012, .028, "sine", .012, 2600]],
        toggle: [[210, .052, .045, "triangle", 0, 1100], [520, .035, .052, "square", .03, 2000], [840, .018, .06, "sine", .062, 2800]],
        click: [[180, .065, .044, "triangle", 0, 900], [430, .042, .052, "square", .018, 1600], [860, .024, .065, "sine", .046, 2600]],
        navigation: [[160, .068, .055, "triangle", 0, 850], [330, .05, .06, "square", .035, 1300], [660, .035, .075, "triangle", .078, 2200], [990, .018, .08, "sine", .12, 2900]],
        confirm: [[260, .05, .045, "triangle", 0, 1200], [620, .04, .06, "square", .04, 2100], [980, .026, .075, "sine", .085, 3000]],
        connect: [[110, .082, .09, "triangle", 0, 650], [260, .06, .1, "square", .055, 1200], [520, .045, .11, "triangle", .12, 2100], [920, .03, .12, "sine", .195, 3200]],
        success: [[360, .052, .06, "triangle", 0, 1400], [620, .046, .075, "sine", .05, 2200], [920, .036, .085, "triangle", .11, 3000], [1240, .02, .1, "sine", .17, 3600]],
        error: [[190, .078, .08, "sawtooth", 0, 900], [132, .065, .09, "square", .062, 650], [92, .05, .11, "triangle", .135, 500]],
        warn: [[220, .064, .07, "triangle", 0, 900], [360, .048, .08, "square", .065, 1400], [220, .035, .09, "triangle", .14, 900]],
        open: [[180, .06, .055, "triangle", 0, 900], [420, .042, .07, "square", .04, 1700], [760, .026, .085, "sine", .09, 2800]],
        close: [[680, .038, .05, "sine", 0, 2500], [340, .046, .065, "triangle", .04, 1500], [150, .052, .08, "square", .09, 760]],
        admin: [[92, .09, .08, "triangle", 0, 520], [184, .07, .085, "square", .045, 850], [370, .052, .095, "sawtooth", .105, 1450], [740, .028, .11, "sine", .18, 2600]],
        settings: [[210, .055, .055, "triangle", 0, 1000], [460, .04, .07, "square", .045, 1800], [760, .024, .08, "sine", .1, 2800]],
        drag: [[120, .064, .055, "square", 0, 650], [240, .048, .07, "triangle", .04, 1050], [480, .026, .08, "sine", .095, 1900]],
        stream: [[330, .048, .06, "sine", 0, 1400], [660, .04, .075, "triangle", .055, 2300], [990, .024, .09, "sine", .12, 3200]],
        offline: [[170, .064, .09, "sawtooth", 0, 760], [118, .052, .1, "square", .075, 560], [84, .04, .12, "triangle", .16, 420]]
      };
      (patterns[type] || patterns.click).forEach(this.tone.bind(this));
      const noisePatterns = {
        click: [.032, .022, 0, 1300],
        navigation: [.05, .025, 0, 1600],
        confirm: [.045, .022, 0, 1800],
        connect: [.11, .032, .02, 900],
        success: [.065, .02, .02, 2100],
        error: [.1, .035, 0, 620],
        admin: [.12, .038, 0, 720],
        open: [.05, .018, 0, 1500],
        close: [.045, .018, .02, 1000],
        drag: [.055, .024, 0, 850]
      };
      if (noisePatterns[type]) this.noise(noisePatterns[type]);
    },
    tone: function (settings) {
      const ctx = this.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const start = ctx.currentTime + settings[4];
      const duration = settings[2];
      osc.type = settings[3];
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(settings[5] || 1400, start);
      filter.Q.setValueAtTime(.9, start);
      osc.frequency.setValueAtTime(settings[0], start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, settings[0] * .92), start + duration);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.linearRampToValueAtTime(settings[1], start + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.filter);
      osc.start(start);
      osc.stop(start + duration + .02);
      osc.addEventListener("ended", function () {
        osc.disconnect();
        filter.disconnect();
        gain.disconnect();
      }, { once: true });
    },
    noise: function (settings) {
      const ctx = this.context;
      const duration = settings[0];
      const peak = settings[1];
      const start = ctx.currentTime + settings[2];
      const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();
      source.buffer = buffer;
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(settings[3] || 1400, start);
      filter.Q.setValueAtTime(1.1, start);
      gain.gain.setValueAtTime(.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + .006);
      gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.filter);
      source.start(start);
      source.stop(start + duration + .01);
      source.addEventListener("ended", function () {
        source.disconnect();
        filter.disconnect();
        gain.disconnect();
      }, { once: true });
    }
  };

  function primeAudio() {
    if (LIGHTWEIGHT_UI) return;
    UISound.init();
  }

  function playSound(type) {
    if (LIGHTWEIGHT_UI) return;
    UISound.play(type);
  }

  window.UISound = UISound;

  window.LSPD_PORTAL = {
    config: SUPABASE_CONFIG,
    state: state,
    refresh: fetchAll
  };

  installPortalDom();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPortal);
  else initPortal();
})();
