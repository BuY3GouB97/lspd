(function () {
  const OWNER_EMAIL = "alilamir27@gmail.com";
  const SERVER_CONNECT_URL = window.LSPD_FIVEM_CONNECT_URL || "";
  const SUPABASE_CONFIG = Object.assign({
  url: window.LSPD_SUPABASE_URL || "https://cydsusnowotmorxywyxa.supabase.co",
    anonKey: window.LSPD_SUPABASE_ANON_KEY || "sb_publishable_1Onpbnsgcx2zaSAwqEsMMw_vDGJRdfq",
    ownerPassword: window.LSPD_OWNER_PASSWORD || "!medward9318u",
    discordWebhookUrl: window.LSPD_DISCORD_WEBHOOK_URL || "https://canary.discord.com/api/webhooks/1550096295065030706/8EwafuN8mvX2nsVcPE9cLIoZ_6YruZvV2vqJGrufTFqx9qsA6vkKAXOYPnf_6Fv2N2WP",
    tables: {
      applications: "lspd_applications",
      accounts: "lspd_accounts",
      roles: "lspd_roles",
      assets: "lspd_assets"
    }
  }, window.LSPD_SUPABASE_CONFIG || {});
  const OWNER_PASSWORD = window.LSPD_OWNER_PASSWORD || SUPABASE_CONFIG.ownerPassword || "!medward9318u";
  const DISCORD_WEBHOOK_URL = window.LSPD_DISCORD_WEBHOOK_URL || SUPABASE_CONFIG.discordWebhookUrl || "https://canary.discord.com/api/webhooks/1550096295065030706/8EwafuN8mvX2nsVcPE9cLIoZ_6YruZvV2vqJGrufTFqx9qsA6vkKAXOYPnf_6Fv2N2WP";

  const STORAGE_KEYS = {
    applications: "ftlspd-applications-v2",
    accounts: "ftlspd-accounts-v1",
    roles: "ftlspd-roles-v2",
    assets: "ftlspd-assets-v2",
    userEmail: "ftlspd-user-email-v1",
    session: "ftlspd-session-v1"
  };

  const portalWorkspaces = ["recruitment", "review", "archives", "fto", "crew", "media"];
  const state = {
    client: null,
    realtimeChannel: null,
    applications: [],
    accounts: [],
    roles: [],
    assets: [],
    userEmail: localStorage.getItem(STORAGE_KEYS.userEmail) || "",
    authUser: null,
    role: "guest",
    activeReviewType: "recruitment",
    activeArchive: "accepted-recruitment",
    applicationType: "recruitment",
    applicationStep: 1,
    applicationDraft: {},
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
      footerLeft: "Version Beta 1.3 | Made By : Majed Alqahtani | Murphy Edward",
      footerRight: "LSPD command systems",
      workspaceRecruitment: "HUB",
      workspaceReview: "Review",
      workspaceArchives: "Archives",
      workspaceFto: "FTO",
      workspaceCrew: "LSPD Crew",
      workspaceMedia: "Media",
      roleOwner: "Owner",
      roleAdmin: "Admin",
      roleEditor: "Admin",
      roleViewer: "Viewer",
      roleGuest: "Guest",
      roleApplicant: "Applicant",
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
      crewSubtitle: "Chiefs and command staff profiles with photos, names, ranks, and Discord IDs.",
      mediaTitle: "LSPD Media",
      mediaSubtitle: "Department photo board for patrol, academy, ceremony, and command media.",
      addCrew: "Add crew member",
      addMedia: "Add media",
      name: "Name",
      rank: "Rank",
      discordId: "Discord ID",
      photoUrl: "Photo URL",
      title: "Title",
      caption: "Caption",
      remove: "Remove",
      noCrew: "No crew profiles have been added yet.",
      noMedia: "No media has been added yet.",
      applicationModalTitleRecruitment: "New Recruitment Application",
      applicationModalTitleTransfer: "Transfer Request",
      applicationStep: "Page {step} of 2",
      back: "Back",
      next: "Next",
      submitApplication: "Submit application",
      close: "Close",
      decisionApproveTitle: "Approve application",
      decisionRejectTitle: "Reject application",
      approvalMessage: "Response message",
      defaultApproval: "Your application has been accepted, please attend on one of the specified dates.",
      mondayDate: "Monday interview date",
      fridayDate: "Friday interview date",
      rejectionReason: "Rejection reason",
      saveDecision: "Save decision",
      roleManagement: "Admin Account Management",
      roleManagementText: "Owner only. Create or update admin accounts with passwords.",
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
      savedAsset: "Saved.",
      removed: "Removed.",
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
      footerLeft: "Version Beta 1.3 | Made By : Majed Alqahtani | Murphy Edward",
      footerRight: "أنظمة قيادة الشرطة",
      workspaceRecruitment: "الرئيسية",
      workspaceReview: "المراجعة",
      workspaceArchives: "الأرشيف",
      workspaceFto: "FTO",
      workspaceCrew: "طاقم LSPD",
      workspaceMedia: "الإعلام",
      roleOwner: "مالك",
      roleAdmin: "أدمن",
      roleEditor: "أدمن",
      roleViewer: "مشاهد",
      roleGuest: "مشاهد",
      roleApplicant: "متقدم",
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
      crewSubtitle: "ملفات القيادة مع الصور، الأسماء، الرتب، ومعرفات الديسكورد.",
      mediaTitle: "إعلام LSPD",
      mediaSubtitle: "لوحة صور القسم للدوريات، الأكاديمية، المراسم، والقيادة.",
      addCrew: "إضافة عضو قيادة",
      addMedia: "إضافة مادة إعلامية",
      name: "الاسم",
      rank: "الرتبة",
      discordId: "معرف الديسكورد",
      photoUrl: "رابط الصورة",
      title: "العنوان",
      caption: "الوصف",
      remove: "حذف",
      noCrew: "لم تتم إضافة ملفات قيادة بعد.",
      noMedia: "لم تتم إضافة مواد إعلامية بعد.",
      applicationModalTitleRecruitment: "طلب توظيف جديد",
      applicationModalTitleTransfer: "طلب نقل",
      applicationStep: "الصفحة {step} من 2",
      back: "رجوع",
      next: "التالي",
      submitApplication: "إرسال الطلب",
      close: "إغلاق",
      decisionApproveTitle: "قبول الطلب",
      decisionRejectTitle: "رفض الطلب",
      approvalMessage: "رسالة الرد",
      defaultApproval: "Your application has been accepted, please attend on one of the specified dates.",
      mondayDate: "موعد مقابلة الاثنين",
      fridayDate: "موعد مقابلة الجمعة",
      rejectionReason: "سبب الرفض",
      saveDecision: "حفظ القرار",
      roleManagement: "إدارة حسابات الأدمن",
      roleManagementText: "للمالك فقط. أنشئ أو حدث حسابات الأدمن مع كلمة المرور.",
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
      savedAsset: "تم الحفظ.",
      removed: "تم الحذف.",
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
    installStylesheet();
    extendCopy();
    installFirstTownBrand();
    installWorkspaceNav();
    installIdentityBar();
    installViews();
    installFooterCredits();
    overrideLanguage();
    overrideWorkspace();
    bindPortalEvents();
  }

  function installFirstTownBrand() {
    const brand = document.querySelector(".brand");
    if (!brand || document.querySelector(".first-town-header-logo")) return;
    brand.insertAdjacentHTML("beforeend", '<img class="first-town-header-logo" src="FT.png" alt="First Town logo">');
  }

  function installStylesheet() {
    if (document.querySelector('link[href="ftlspd-portal.css"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "ftlspd-portal.css";
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
    const tabs = [
      ["recruitment", "fa-house-signal", "workspaceRecruitment"],
      ["review", "fa-clipboard-check", "workspaceReview"],
      ["archives", "fa-box-archive", "workspaceArchives"],
      ["regulations", "fa-clipboard-list", "workspaceRegulations"],
      ["sop", "fa-book-open", "workspaceSop"],
      ["fto", "fa-graduation-cap", "workspaceFto"],
      ["crew", "fa-users-gear", "workspaceCrew"],
      ["media", "fa-images", "workspaceMedia"]
    ];
    nav.innerHTML = tabs.map(function (tab) {
      return '<button id="workspace-' + tab[0] + '" class="workspace-tab" onclick="setWorkspace(\'' + tab[0] + '\')" type="button" aria-selected="' + (tab[0] === "recruitment") + '"><i class="fa-solid ' + tab[1] + '"></i><span data-i18n="' + tab[2] + '">' + tr(tab[2]) + "</span></button>";
    }).join("");
    updateAdminTabVisibility();
  }

  function installIdentityBar() {
    const topActions = document.querySelector(".top-actions");
    if (!topActions || document.getElementById("identityBar")) return;
    topActions.insertAdjacentHTML("afterbegin", [
      '<div id="identityBar" class="identity-bar">',
      '<input id="authEmailInput" type="email" autocomplete="email" spellcheck="false" data-i18n-placeholder="emailPlaceholder" placeholder="' + safe(tr("emailPlaceholder")) + '">',
      '<input id="authPasswordInput" type="password" autocomplete="current-password" data-i18n-placeholder="passwordPlaceholder" placeholder="' + safe(tr("passwordPlaceholder")) + '">',
      '<button id="loginButton" class="auth-mini-button" type="button" data-i18n="login">' + safe(tr("login")) + '</button>',
      '<button id="createAccountButton" class="auth-mini-button" type="button" data-i18n="createAccount">' + safe(tr("createAccount")) + '</button>',
      '<button id="logoutButton" class="auth-mini-button hidden" type="button" data-i18n="logout">' + safe(tr("logout")) + '</button>',
      '<span id="roleBadge" class="role-badge">' + safe(tr("roleGuest")) + '</span>',
      '<button id="roleManagerButton" class="role-manage-button hidden" type="button" aria-label="' + safe(tr("roleManagerLabel")) + '"><i class="fa-solid fa-user-shield"></i></button>',
      "</div>",
    ].join(""));
    const input = document.getElementById("authEmailInput");
    input.value = state.userEmail;
  }

  function installViews() {
    if (document.getElementById("recruitmentView")) return;
    const footer = document.getElementById("regulationsFooter");
    if (!footer) return;
    footer.insertAdjacentHTML("beforebegin", [
      welcomeModalHtml(),
      recruitmentViewHtml(),
      reviewViewHtml(),
      archivesViewHtml(),
      ftoViewHtml(),
      crewViewHtml(),
      mediaViewHtml(),
      applicationModalHtml(),
      decisionModalHtml(),
      roleModalHtml(),
      '<div id="toastStack" class="toast-stack" aria-live="polite"></div>'
    ].join(""));
  }

  function welcomeModalHtml() {
    return [
      '<div id="welcomeModal" class="modal-backdrop">',
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

  function crewViewHtml() {
    return [
      '<section id="crewView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="workspaceCrew">' + safe(tr("workspaceCrew")) + '</p><h2 data-i18n="crewTitle">' + safe(tr("crewTitle")) + '</h2><p data-i18n="crewSubtitle">' + safe(tr("crewSubtitle")) + '</p></div></div>',
      '<form id="crewForm" class="asset-form hidden">',
      '<input class="portal-input" name="title" data-i18n-placeholder="name" placeholder="' + safe(tr("name")) + '" required>',
      '<input class="portal-input" name="subtitle" data-i18n-placeholder="rank" placeholder="' + safe(tr("rank")) + '" required>',
      '<input class="portal-input" name="discord_id" data-i18n-placeholder="discordId" placeholder="' + safe(tr("discordId")) + '" required>',
      '<input class="portal-input wide" name="photo_url" data-i18n-placeholder="photoUrl" placeholder="' + safe(tr("photoUrl")) + '" required>',
      '<button class="portal-button success" type="submit"><i class="fa-solid fa-plus"></i><span data-i18n="addCrew">' + safe(tr("addCrew")) + '</span></button>',
      '</form>',
      '<div id="crewGrid" class="asset-grid"></div>',
      '</section>'
    ].join("");
  }

  function mediaViewHtml() {
    return [
      '<section id="mediaView" class="portal-view hidden">',
      '<div class="section-head"><div><p class="portal-kicker" data-i18n="workspaceMedia">' + safe(tr("workspaceMedia")) + '</p><h2 data-i18n="mediaTitle">' + safe(tr("mediaTitle")) + '</h2><p data-i18n="mediaSubtitle">' + safe(tr("mediaSubtitle")) + '</p></div></div>',
      '<form id="mediaForm" class="asset-form hidden">',
      '<input class="portal-input" name="title" data-i18n-placeholder="title" placeholder="' + safe(tr("title")) + '" required>',
      '<input class="portal-input wide" name="photo_url" data-i18n-placeholder="photoUrl" placeholder="' + safe(tr("photoUrl")) + '" required>',
      '<input class="portal-input wide" name="caption" data-i18n-placeholder="caption" placeholder="' + safe(tr("caption")) + '">',
      '<button class="portal-button success" type="submit"><i class="fa-solid fa-plus"></i><span data-i18n="addMedia">' + safe(tr("addMedia")) + '</span></button>',
      '</form>',
      '<div id="mediaGrid" class="asset-grid"></div>',
      '</section>'
    ].join("");
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
      '<label><span data-i18n="accountPassword">' + safe(tr("accountPassword")) + '</span><input id="rolePasswordInput" class="portal-input" type="password" required></label>',
      '<label><span data-i18n="role">' + safe(tr("role")) + '</span><select id="roleSelectInput" class="portal-select"><option value="admin">Admin</option><option value="applicant">Applicant</option></select></label>',
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
      if (next === "review") renderReview();
      if (next === "archives") renderArchives();
      if (next === "crew") renderAssets("crew");
      if (next === "media") renderAssets("media");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    try { setWorkspace = enhanced; } catch (error) { window.setWorkspace = enhanced; }
    window.setWorkspace = enhanced;
  }

  function bindPortalEvents() {
    document.addEventListener("pointerdown", primeAudio, { once: true });
    document.addEventListener("pointermove", trackPointerGlow);
    document.addEventListener("pointerover", function (event) {
      if (event.target.closest("button, a, .subtab, .workspace-tab")) playSound("hover");
    });
    document.addEventListener("click", function (event) {
      const target = event.target.closest("button, a, .subtab, .workspace-tab, .asset-card, .review-card, .fto-card, .hero-metric");
      if (!target) return;
      if (target.matches("a[href^='fivem:']")) playSound("connect");
      else if (target.classList.contains("danger")) playSound("error");
      else if (target.classList.contains("success") || target.classList.contains("primary")) playSound("success");
      else playSound("click");
      spawnRipple(event, target);
    });

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
    document.getElementById("loginButton")?.addEventListener("click", loginAccount);
    document.getElementById("createAccountButton")?.addEventListener("click", createApplicantAccount);
    document.getElementById("logoutButton")?.addEventListener("click", logoutAccount);
    document.getElementById("authPasswordInput")?.addEventListener("keydown", function (event) {
      if (event.key === "Enter") loginAccount();
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
    document.getElementById("crewForm")?.addEventListener("submit", function (event) { saveAsset(event, "crew"); });
    document.getElementById("mediaForm")?.addEventListener("submit", function (event) { saveAsset(event, "media"); });
  }

  function trackPointerGlow(event) {
    const x = Math.round((event.clientX / Math.max(window.innerWidth, 1)) * 100);
    const y = Math.round((event.clientY / Math.max(window.innerHeight, 1)) * 100);
    document.documentElement.style.setProperty("--pointer-x", x + "%");
    document.documentElement.style.setProperty("--pointer-y", y + "%");
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
    loadLocalData();
    updateRole();
    renderAllPortal();
    window.setWorkspace("recruitment");
    await initSupabase();
  }

  async function initSupabase() {
    if (!isSupabaseConfigured()) {
      updateDatabaseBadge();
      return;
    }
    try {
      await loadSupabaseSdk();
      state.client = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      state.databaseMode = "live";
      updateDatabaseBadge();
      await fetchAll();
      subscribeRealtime();
      toast(tr("liveMode"), "success");
    } catch (error) {
      console.warn(error);
      state.databaseMode = "local";
      updateDatabaseBadge();
      toast(tr("databaseError"), "warn");
    }
  }

  function getAuthInputs() {
    return {
      email: (document.getElementById("authEmailInput")?.value || "").trim().toLowerCase(),
      password: document.getElementById("authPasswordInput")?.value || ""
    };
  }

  async function loginAccount() {
    const creds = getAuthInputs();
    if (!creds.email || !creds.password) {
      toast(tr("validationError"), "error");
      return;
    }
    if (creds.email === OWNER_EMAIL) {
      if (creds.password !== OWNER_PASSWORD) {
        toast(tr("invalidLogin"), "error");
        return;
      }
      saveSession({ email: OWNER_EMAIL, role: "owner" });
      localStorage.setItem(STORAGE_KEYS.userEmail, OWNER_EMAIL);
      updateRole();
      renderAllPortal();
      toast(tr("loginSuccess"), "success");
      return;
    }
    const account = state.accounts.find(function (entry) { return entry.email === creds.email; });
    const hash = await hashPassword(creds.password);
    if (!account || account.password_hash !== hash) {
      toast(tr("invalidLogin"), "error");
      return;
    }
    saveSession(account);
    localStorage.setItem(STORAGE_KEYS.userEmail, account.email);
    updateRole();
    renderAllPortal();
    toast(tr("loginSuccess"), "success");
  }

  async function createApplicantAccount() {
    const creds = getAuthInputs();
    if (!creds.email || !creds.password || creds.email === OWNER_EMAIL) {
      toast(tr("validationError"), "error");
      return;
    }
    if (state.accounts.some(function (entry) { return entry.email === creds.email; })) {
      toast(tr("accountExists"), "error");
      return;
    }
    const row = normalizeAccount({
      id: uid(),
      email: creds.email,
      role: "applicant",
      password_hash: await hashPassword(creds.password),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    const ok = await insertRow("accounts", row);
    if (!ok) return;
    saveSession(row);
    localStorage.setItem(STORAGE_KEYS.userEmail, row.email);
    document.getElementById("authPasswordInput").value = "";
    toast(tr("accountCreated"), "success");
    await refreshAfterMutation();
  }

  function logoutAccount() {
    saveSession(null);
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
    state.realtimeChannel = state.client.channel("lspd-portal-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("applications") }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("accounts") }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("roles") }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: tableName("assets") }, fetchAll)
      .subscribe();
  }

  async function fetchAll() {
    if (!state.client) return;
    try {
      const apps = await state.client.from(tableName("applications")).select("*").order("created_at", { ascending: false });
      const accounts = await state.client.from(tableName("accounts")).select("*").order("email", { ascending: true });
      const roles = await state.client.from(tableName("roles")).select("*").order("email", { ascending: true });
      const assets = await state.client.from(tableName("assets")).select("*").order("created_at", { ascending: false });
      if (apps.error || accounts.error || roles.error || assets.error) throw apps.error || accounts.error || roles.error || assets.error;
      state.applications = (apps.data || []).map(normalizeApplication);
      state.accounts = (accounts.data || []).map(normalizeAccount);
      state.roles = roles.data || [];
      state.assets = assets.data || [];
      saveLocalData();
      updateRole();
      renderAllPortal();
    } catch (error) {
      console.warn(error);
      toast(tr("databaseError"), "error");
    }
  }

  function tableName(key) {
    return (SUPABASE_CONFIG.tables && SUPABASE_CONFIG.tables[key]) || key;
  }

  function loadLocalData() {
    state.applications = readJson(STORAGE_KEYS.applications).map(normalizeApplication);
    state.accounts = readJson(STORAGE_KEYS.accounts).map(normalizeAccount);
    state.roles = readJson(STORAGE_KEYS.roles);
    state.assets = readJson(STORAGE_KEYS.assets);
    state.authUser = readSession();
  }

  function saveLocalData() {
    localStorage.setItem(STORAGE_KEYS.applications, JSON.stringify(state.applications));
    localStorage.setItem(STORAGE_KEYS.accounts, JSON.stringify(state.accounts));
    localStorage.setItem(STORAGE_KEYS.roles, JSON.stringify(state.roles));
    localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(state.assets));
  }

  function readJson(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
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
      password_hash: row.password_hash || row.passwordHash || ""
    });
  }

  function normalizeRole(role) {
    if (role === "editor") return "admin";
    if (role === "viewer") return "applicant";
    return role === "owner" || role === "admin" || role === "applicant" ? role : "applicant";
  }

  function readSession() {
    try {
      const session = JSON.parse(localStorage.getItem(STORAGE_KEYS.session) || "null");
      if (!session || !session.email || !session.role) return null;
      return { email: session.email.toLowerCase(), role: normalizeRole(session.role) };
    } catch (error) {
      return null;
    }
  }

  function saveSession(account) {
    state.authUser = account ? { email: account.email.toLowerCase(), role: normalizeRole(account.role) } : null;
    if (state.authUser) localStorage.setItem(STORAGE_KEYS.session, JSON.stringify(state.authUser));
    else localStorage.removeItem(STORAGE_KEYS.session);
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
    document.getElementById("loginButton")?.classList.toggle("hidden", loggedIn);
    document.getElementById("createAccountButton")?.classList.toggle("hidden", loggedIn);
    document.getElementById("logoutButton")?.classList.toggle("hidden", !loggedIn);
    const manager = document.getElementById("roleManagerButton");
    if (manager) manager.classList.toggle("hidden", state.role !== "owner");
    updateAdminTabVisibility();
  }

  function updateAdminTabVisibility() {
    const allowed = canViewRecords();
    ["review", "archives"].forEach(function (workspace) {
      document.getElementById("workspace-" + workspace)?.classList.toggle("hidden", !allowed);
    });
    if (!allowed && (getCurrentWorkspaceName() === "review" || getCurrentWorkspaceName() === "archives")) {
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
    renderCooldown();
    renderApplicantStatus();
    renderReview();
    renderArchives();
    renderAssets("crew");
    renderAssets("media");
    renderRoleList();
    const crewForm = document.getElementById("crewForm");
    const mediaForm = document.getElementById("mediaForm");
    if (crewForm) crewForm.classList.toggle("hidden", !canEdit());
    if (mediaForm) mediaForm.classList.toggle("hidden", !canEdit());
    const clear = document.getElementById("clearPendingButton");
    if (clear) clear.classList.toggle("hidden", !canEdit());
    const reset = document.getElementById("fullResetButton");
    if (reset) reset.classList.toggle("hidden", !canEdit());
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
    const actions = app.status === "pending" && canEdit() ? '<div class="review-actions"><button class="portal-button success" type="button" onclick="window.openDecisionModal(\'' + safeAttr(app.id) + '\',\'accepted\')"><i class="fa-solid fa-check"></i><span data-i18n="approve">' + safe(tr("approve")) + '</span></button><button class="portal-button danger" type="button" onclick="window.openDecisionModal(\'' + safeAttr(app.id) + '\',\'rejected\')"><i class="fa-solid fa-xmark"></i><span data-i18n="reject">' + safe(tr("reject")) + '</span></button></div>' : "";
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
    const records = state.assets.filter(function (asset) { return asset.category === category; });
    if (!records.length) {
      grid.innerHTML = '<div class="empty-portal">' + safe(tr(category === "crew" ? "noCrew" : "noMedia")) + "</div>";
      return;
    }
    grid.innerHTML = records.map(function (asset) {
      const title = asset.title || asset.name || "";
      const subtitle = asset.subtitle || asset.rank || asset.caption || "";
      const discord = asset.discord_id ? '<span>' + safe(tr("discordId")) + ": " + safe(asset.discord_id) + "</span>" : "";
      const remove = canEdit() ? '<div class="asset-card-actions"><button class="portal-button danger" type="button" onclick="window.removeAsset(\'' + safeAttr(asset.id) + '\')"><i class="fa-solid fa-trash-can"></i><span data-i18n="remove">' + safe(tr("remove")) + "</span></button></div>" : "";
      return '<article class="asset-card"><img src="' + safeAttr(asset.photo_url || "image2.png") + '" alt="' + safeAttr(title) + '"><div class="asset-card-body"><h3>' + safe(title) + '</h3><p>' + safe(subtitle || asset.caption || "") + '</p>' + discord + remove + "</div></article>";
    }).join("");
  }

  function renderRoleList() {
    const target = document.getElementById("roleList");
    if (!target) return;
    if (!state.accounts.length) {
      target.innerHTML = '<div class="empty-portal">' + safe(tr("noUsers")) + "</div>";
      return;
    }
    target.innerHTML = state.accounts.map(function (entry) {
      return '<article class="review-card"><div class="review-top"><div><h3 class="review-title">' + safe(entry.email) + '</h3><div class="review-meta">' + safe(entry.role) + '</div></div><button class="portal-button danger" type="button" onclick="window.removeRole(\'' + safeAttr(entry.email) + '\')"><i class="fa-solid fa-trash-can"></i><span data-i18n="remove">' + safe(tr("remove")) + "</span></button></div></article>";
    }).join("");
  }

  function openApplicationModal(type) {
    if (!state.authUser) {
      toast(tr("loginRequired"), "warn");
      document.getElementById("authEmailInput")?.focus();
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
    state.applicationType = type === "transfer" ? "transfer" : "recruitment";
    state.applicationStep = 1;
    state.applicationDraft = {};
    const form = document.getElementById("applicationForm");
    if (form) form.reset();
    renderApplicationFields();
    openModal("applicationModal");
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
      applicant_name: data.full_name || "",
      discord_id: data.discord_id || "",
      answers: data,
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
    await sendDiscordWebhook(row);
    state.userEmail = applicantEmail;
    localStorage.setItem(STORAGE_KEYS.userEmail, applicantEmail);
    const input = document.getElementById("authEmailInput");
    if (input) input.value = applicantEmail;
    closeModal("applicationModal");
    toast(tr("savedApplication"), "success");
    await refreshAfterMutation();
  }

  async function sendDiscordWebhook(row) {
    if (!DISCORD_WEBHOOK_URL) return;
    const typeLabel = row.kind === "transfer" ? tr("transferLabel") : tr("recruitmentLabel");
    const summary = [
      "**Applicant:** " + (row.applicant_name || "-"),
      "**Email:** " + (row.applicant_email || "-"),
      "**Discord:** " + (row.discord_id || "-"),
      "**Type:** " + typeLabel,
      "**Submitted:** " + formatDateTime(row.created_at)
    ].join("\n");
    try {
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "LSPD Recruitment Desk",
          avatar_url: absoluteAssetUrl("lspd-shield.png"),
          embeds: [{
            title: "New LSPD " + typeLabel + " Submission",
            description: summary,
            color: row.kind === "transfer" ? 3447003 : 1942002,
            timestamp: row.created_at,
            footer: { text: "FTLSPD Portal" }
          }]
        })
      });
      if (!response.ok) throw new Error("Discord webhook returned " + response.status);
    } catch (error) {
      console.warn(error);
      toast(tr("databaseError"), "warn");
    }
  }

  function absoluteAssetUrl(path) {
    try { return new URL(path, window.location.href).href; }
    catch (error) { return path; }
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
    if (!canEdit()) {
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
    if (!canEdit() || !state.pendingDecision) {
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
    if (!canEdit()) {
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
    if (!canEdit()) {
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
    if (state.role !== "owner") {
      toast(tr("noPermission"), "error");
      return;
    }
    renderRoleList();
    openModal("roleModal");
  }

  async function saveRole(event) {
    event.preventDefault();
    if (state.role !== "owner") {
      toast(tr("noPermission"), "error");
      return;
    }
    const email = document.getElementById("roleEmailInput").value.trim().toLowerCase();
    const password = document.getElementById("rolePasswordInput").value;
    const role = document.getElementById("roleSelectInput").value;
    if (!email || !password || email === OWNER_EMAIL) {
      toast(tr("validationError"), "error");
      return;
    }
    const existing = state.accounts.find(function (entry) { return (entry.email || "").toLowerCase() === email; });
    const patch = {
      email,
      role: normalizeRole(role),
      password_hash: await hashPassword(password),
      updated_at: new Date().toISOString()
    };
    let ok;
    if (existing) ok = await updateRow("accounts", existing.id, patch);
    else ok = await insertRow("accounts", Object.assign({ id: uid(), created_at: new Date().toISOString() }, patch));
    if (!ok) return;
    event.currentTarget.reset();
    toast(tr("savedRole"), "success");
    await refreshAfterMutation();
  }

  window.removeRole = async function (email) {
    if (state.role !== "owner") {
      toast(tr("noPermission"), "error");
      return;
    }
    const existing = state.accounts.find(function (entry) { return (entry.email || "").toLowerCase() === email.toLowerCase(); });
    if (!existing) return;
    let ok;
    if (state.client) {
      const result = existing.id ? await state.client.from(tableName("accounts")).delete().eq("id", existing.id) : await state.client.from(tableName("accounts")).delete().eq("email", email);
      ok = !result.error;
      if (result.error) console.warn(result.error);
    } else {
      state.accounts = state.accounts.filter(function (entry) { return (entry.email || "").toLowerCase() !== email.toLowerCase(); });
      saveLocalData();
      ok = true;
    }
    if (!ok) {
      toast(tr("databaseError"), "error");
      return;
    }
    toast(tr("removed"), "success");
    await refreshAfterMutation();
  };

  async function saveAsset(event, category) {
    event.preventDefault();
    if (!canEdit()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    const row = {
      id: uid(),
      category,
      title: (data.title || "").trim(),
      subtitle: (data.subtitle || "").trim(),
      discord_id: (data.discord_id || "").trim(),
      photo_url: (data.photo_url || "").trim(),
      caption: (data.caption || "").trim(),
      created_by: state.userEmail,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const ok = await insertRow("assets", row);
    if (!ok) return;
    form.reset();
    toast(tr("savedAsset"), "success");
    await refreshAfterMutation();
  }

  window.removeAsset = async function (id) {
    if (!canEdit()) {
      toast(tr("noPermission"), "error");
      return;
    }
    const ok = await deleteRows("assets", [id]);
    if (!ok) return;
    toast(tr("removed"), "success");
    await refreshAfterMutation();
  };

  async function insertRow(table, row) {
    if (state.client) {
      const result = await state.client.from(tableName(table)).insert(row);
      if (result.error) {
        console.warn(result.error);
        toast(tr("databaseError"), "error");
        return false;
      }
      return true;
    }
    if (table === "applications") state.applications.unshift(normalizeApplication(row));
    if (table === "accounts") state.accounts.push(normalizeAccount(row));
    if (table === "roles") state.roles.push(row);
    if (table === "assets") state.assets.unshift(row);
    saveLocalData();
    return true;
  }

  async function updateRow(table, id, patch) {
    if (state.client) {
      const result = await state.client.from(tableName(table)).update(patch).eq("id", id);
      if (result.error) {
        console.warn(result.error);
        toast(tr("databaseError"), "error");
        return false;
      }
      return true;
    }
    if (table === "applications") {
      state.applications = state.applications.map(function (row) { return row.id === id ? normalizeApplication(Object.assign({}, row, patch)) : row; });
    }
    if (table === "accounts") {
      state.accounts = state.accounts.map(function (row) { return row.id === id ? normalizeAccount(Object.assign({}, row, patch)) : row; });
    }
    saveLocalData();
    return true;
  }

  async function deleteRows(table, ids) {
    if (!ids.length) return true;
    if (state.client) {
      const result = await state.client.from(tableName(table)).delete().in("id", ids);
      if (result.error) {
        console.warn(result.error);
        toast(tr("databaseError"), "error");
        return false;
      }
      return true;
    }
    if (table === "applications") state.applications = state.applications.filter(function (row) { return !ids.includes(row.id); });
    if (table === "accounts") state.accounts = state.accounts.filter(function (row) { return !ids.includes(row.id); });
    if (table === "assets") state.assets = state.assets.filter(function (row) { return !ids.includes(row.id); });
    saveLocalData();
    return true;
  }

  async function refreshAfterMutation() {
    if (state.client) await fetchAll();
    else renderAllPortal();
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
    return state.role === "owner" || state.role === "admin";
  }

  function canEdit() {
    return state.role === "owner" || state.role === "admin";
  }

  function openModal(id) {
    document.getElementById(id)?.classList.remove("hidden");
    playSound("modal");
  }

  function closeModal(id) {
    document.getElementById(id)?.classList.add("hidden");
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

  let audioContext;
  function primeAudio() {
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      state.audioReady = true;
      if (audioContext.state === "suspended") audioContext.resume();
    } catch (error) {
      state.audioReady = false;
    }
  }

  function playSound(type) {
    if (type === "hover") {
      const now = Date.now();
      if (now - state.lastHoverSound < 90) return;
      state.lastHoverSound = now;
    }
    if (!state.audioReady || !audioContext) return;
    const patterns = {
      hover: [[520, .015, .028, "sine", 0]],
      click: [[390, .026, .04, "triangle", 0], [620, .018, .04, "sine", .025]],
      connect: [[220, .04, .07, "triangle", 0], [440, .04, .08, "sine", .06], [880, .032, .1, "sine", .13]],
      success: [[620, .038, .06, "sine", 0], [840, .034, .08, "sine", .055], [1120, .026, .09, "triangle", .12]],
      error: [[180, .055, .075, "sawtooth", 0], [132, .042, .095, "sawtooth", .07]],
      warn: [[300, .04, .065, "triangle", 0], [420, .025, .075, "sine", .075]],
      modal: [[480, .03, .06, "sine", 0], [720, .022, .08, "triangle", .055]]
    };
    (patterns[type] || patterns.click).forEach(function (settings) {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + settings[4];
      osc.type = settings[3];
      osc.frequency.setValueAtTime(settings[0], start);
      osc.frequency.exponentialRampToValueAtTime(settings[0] * 1.045, start + settings[2]);
      gain.gain.setValueAtTime(settings[1], start);
      gain.gain.exponentialRampToValueAtTime(.0001, start + settings[2]);
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.start(start);
      osc.stop(start + settings[2] + .018);
    });
  }

  window.LSPD_PORTAL = {
    config: SUPABASE_CONFIG,
    state: state,
    refresh: fetchAll
  };

  installPortalDom();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPortal);
  else initPortal();
})();
