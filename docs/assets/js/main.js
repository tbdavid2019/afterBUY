/**
 * afterBUY (補貨日記) - Landing Page Interactive Script
 * Features:
 * - Dynamic rotating headline words (bilingual)
 * - Interactive iPhone 16 Pro mockup with live "今天已換" 5-sec Undo Toast & backup deduction
 * - Mockup mode switcher (Interactive App vs Real Screenshots)
 * - Bilingual i18n switcher (zh-TW / en) with persistent state
 * - Dark / Light theme toggle with auto-detection & persistent state
 * - Mobile responsive navigation menu
 * - Accessible FAQ Accordion
 * - IntersectionObserver scroll animations
 */

(function () {
  'use strict';

  // ==========================================
  // 1. i18n Dictionaries & Language Switcher
  // ==========================================
  const translations = {
    'zh-TW': {
      'nav.features': '核心特色',
      'nav.countdown': '視覺狀態',
      'nav.how': '運作方式',
      'nav.privacy': '隱私承諾',
      'nav.faq': '常見問題',
      'nav.cta': '立即體驗',
      'hero.badge': '手機優先 · 離線可用 · 零追蹤隱私至上',
      'hero.headline.prefix': '不再遺忘買過的',
      'hero.headline.suffix': '更換與過期日',
      'hero.desc': 'afterBUY 專為生活耗材、開封保存期（PAO）、保固倒數與常備庫存打造。相機直拍秒速建檔，精算週期自動扣庫存，支援 Passkey 生物辨識與 WebCal 日曆無縫同步。',
      'hero.cta.primary': '免費開啟 Web App',
      'hero.cta.secondary': 'GitHub 開源專案',
      'status.fresh': '狀態良好',
      'status.soon': '即將到期',
      'status.expired': '今日到期/逾期',
      'status.lowstock': '備品告急',
      'mockup.tab.interactive': '📱 互動展示',
      'mockup.tab.screenshot': '📸 真機截圖',
      'mockup.workspace': '甜蜜的家',
      'mockup.passkey': 'Passkey 已登入',
      'mockup.overview.title': '生活看板',
      'mockup.item1.name': 'Oral-B 電動牙刷刷頭',
      'mockup.item1.meta': 'EB50 · 衛浴洗沐 · 90 天週期',
      'mockup.item1.tag': '剩餘 5 天',
      'mockup.item1.stock': '備品庫存: 2 件',
      'mockup.item1.snooze': '稍後',
      'mockup.item1.replace': '今天已換',
      'mockup.item2.name': 'Brita 淨水濾芯 MAXTRA+',
      'mockup.item2.meta': '全效型 · 廚房飲食 · 60 天週期',
      'mockup.item2.tag': '已逾期 2 天',
      'mockup.item2.stock': '備品庫存: 1 件',
      'mockup.item2.replace': '今天已換',
      'mockup.item3.name': 'Kirkland 頂級深海魚油',
      'mockup.item3.meta': '保健食品 · 每天 2 顆 · 剩 36 顆',
      'mockup.item3.tag': '剩餘 18 天',
      'mockup.item3.stock': '未拆封備品: 1 瓶',
      'mockup.item3.consume': '今日已用 (-2)',
      'mockup.toast.replaced': '已完成更換，已自動扣減 1 個備品庫存！',
      'mockup.toast.undo': '復原',
      'features.eyebrow': '核心優勢',
      'features.title': '買了之後，告別過期與斷貨慌',
      'features.subtitle': '集合生活耗材週期、保存期限、智慧庫存與多管道通知於一身的完整解決方案。',
      'features.1.title': '耗材週期與開封保存期 (PAO)',
      'features.1.desc': '牙刷 90 天、淨水濾芯 180 天、開架化妝水 6M 開封倒數，精準支援西元年月日保固與深海魚油等「數量耗用率」模式。',
      'features.2.title': '一鍵更換與自動扣備品',
      'features.2.desc': '點擊「今天已換」自動重置週期並扣除 1 件未拆封備品；手滑誤觸？底部 5 秒觸感復原條瞬間回滾，零焦慮。',
      'features.3.title': 'WebCal 日曆無縫訂閱',
      'features.3.desc': '一鍵訂閱至 Apple / Google / Outlook 日曆。專利級穩定 UID 與 30 天軟刪除墓碑機制，絕無舊事件幽靈殘留。',
      'features.4.title': 'Passkey 生物辨識秒登',
      'features.4.desc': '支援 Touch ID / Face ID / Windows Hello 秒速解鎖；搭配 6 位數 Email OTP 雙軌登入，換機免記密碼。',
      'features.5.title': '多管道貼心通知提醒',
      'features.5.desc': 'PWA Web Push 系統推播、每日 08:00 晨報摘要 Email、加值 VIP SMS 短訊，守護生活節奏不造成通知疲勞。',
      'features.6.title': 'PWA 離線優先與隱私至上',
      'features.6.desc': '免安裝商店直接加入主畫面，無廣告、無第三方分析追蹤 SDK，訪客免登入即開即用，資料安全掌握在自己手中。',
      'countdown.eyebrow': '色彩視覺化',
      'countdown.title': '一目了然的倒數色彩哲學',
      'countdown.subtitle': '每一件物品都有專屬健康度色彩，無需在腦中換算日期，掃一眼便知何時該換、何時該補。',
      'countdown.c1.badge': '良好 · 正常運作',
      'countdown.c1.time': '倒數 72 天',
      'countdown.c1.name': '冷氣抗敏防塵濾網',
      'countdown.c1.desc': '翠綠色象徵充足時間，安心深呼吸，守護居家空氣品質。',
      'countdown.c2.badge': '即將到期 · 準備中',
      'countdown.c2.time': '倒數 4 天',
      'countdown.c2.name': 'Oral-B 牙刷刷頭',
      'countdown.c2.desc': '琥珀金提示即將到期（≤ 7 天），提醒檢查備品或安排更換。',
      'countdown.c3.badge': '今日到期 / 已逾期',
      'countdown.c3.time': '今日到期！',
      'countdown.c3.name': 'Brita 淨水濾芯',
      'countdown.c3.desc': '珊瑚玫瑰紅代表該換了！點擊「今天已換」立即完成打卡。',
      'countdown.c4.badge': '備品告急 · 待採購',
      'countdown.c4.time': '備品 0 件',
      'countdown.c4.name': '抗菌洗衣膠囊',
      'countdown.c4.desc': '湛藍色標記庫存告急，採購清單一鍵匯整，逛超市不漏買。',
      'how.eyebrow': '極簡步驟',
      'how.title': '三個步驟，從容掌控生活節奏',
      'how.subtitle': '建檔一次，剩下的時間交給 afterBUY 幫你盯著。',
      'how.1.title': '01 拍照或範本建檔',
      'how.1.desc': '手機相機直拍或自選相片，搭配內建牙刷、濾芯、維他命等常用範本，10 秒迅速建檔完成。',
      'how.2.title': '02 智慧追蹤與生活看板',
      'how.2.desc': '自動依據週期或每日用量倒數計時，情感化生活看板即時展示待處理數量，擺脫冰冷表格。',
      'how.3.title': '03 準時提醒並一鍵更換',
      'how.3.desc': '到期前推播與日曆通知，點擊「今天已換」自動扣除備品庫存，隨時保持生活最清爽狀態。',
      'privacy.eyebrow': '隱私至上',
      'privacy.title': '你的生活細節，只有你自己知道',
      'privacy.desc': 'afterBUY 採邊緣原生與本地優先架構。沒有繁重的第三方行銷代碼，沒有廣告投遞，拍照與文字完全屬於你。',
      'privacy.f1': '免綁手機號碼，支援 Passkey 與無密碼 Email OTP 登入',
      'privacy.f2': '零第三方分析追蹤、零廣告聯播網，不販售任何個人資料',
      'privacy.f3': '照片儲存於高規格安全邊緣節點，傳輸全程經 TLS 1.3 嚴格加密',
      'privacy.f4': '支援單鍵資料匯出與備份，你的數據完全由你掌控',
      'faq.eyebrow': '常見問題',
      'faq.title': '你想知道的，都在這裡',
      'faq.subtitle': '若有其他疑問，歡迎透過 GitHub Issues 或 Support 信箱與我們聯繫。',
      'faq.q1': 'afterBUY 是免費的嗎？',
      'faq.a1': '是的！afterBUY 核心功能完全免費開放使用，無擾人橫幅廣告、無強制付費牆。我們相信掌控好自己的生活耗材是每個人都應享有的數位自由。',
      'faq.q2': '如何在手機上當成 App（PWA）使用？',
      'faq.a2': '在 iPhone Safari 中開啟後點擊分享按鈕（Share），選擇「加入主畫面（Add to Home Screen）」；Android 使用者使用 Chrome 點擊「安裝應用程式」即可享有原生 App 等級的全螢幕與秒開體驗。',
      'faq.q3': 'WebCal 日曆訂閱會不會有舊事件殘留？',
      'faq.a3': '絕不會！afterBUY 針對 RFC 5545 日曆規範深度打磨，採用穩定 UID、遞增 SEQUENCE 與 30 天軟刪除墓碑（STATUS:CANCELLED）技術，物品更換或刪除後，Apple / Google 日曆會自動更新或清除舊事件。',
      'faq.q4': '什麼是 Passkey 免密碼登入？換手機怎麼辦？',
      'faq.a4': 'Passkey 採用 FIDO2 / WebAuthn 標準，利用手機的 Face ID、Touch ID 或指紋辨識快速登入，無需記憶密碼。如果您換了新手機或使用公用電腦，可隨時使用 6 位數 Email OTP 登入，安全無虞。',
      'faq.q5': '支援多人或家庭空間共享同一個備品庫嗎？',
      'faq.a5': '支援！afterBUY 具備強大多庫管理（Stock Spaces）與 4 級角色權限（擁有者、管理員、成員、檢視者），管理者一鍵生成 8 碼邀請代碼即可邀請家人或室友一同協作與打卡。',
      'faq.q6': '如果暫時不想換，可以延後提醒（Snooze）嗎？',
      'faq.a6': '可以！每張耗材卡片皆支援「延後 3 天」或「延後 7 天」功能；針對買了先囤著的物品，還可以開啟「先存放」模式，等拆封當天再點擊「開始使用」。',
      'cta.title': '從今天起，告別耗材過期與斷貨慌',
      'cta.desc': '免下載、免安裝商店、即開即用。加入 afterBUY，給你的生活一個清晰有序的節奏。',
      'cta.btn.app': '立即啟動 Web App',
      'cta.btn.github': '查看 GitHub 專案',
      'footer.rights': '保留所有權利。以 AGPL-3.0 協議開源。',
      'footer.privacy': '隱私權政策',
      'footer.terms': '服務條款',
      'footer.changelog': '更新日誌',
      'footer.github': 'GitHub 原始碼'
    },
    'en': {
      'nav.features': 'Features',
      'nav.countdown': 'Status Colors',
      'nav.how': 'How It Works',
      'nav.privacy': 'Privacy',
      'nav.faq': 'FAQ',
      'nav.cta': 'Launch App',
      'hero.badge': 'Mobile First · Offline Ready · Zero Tracking',
      'hero.headline.prefix': 'Never Forget What You Bought',
      'hero.headline.suffix': 'Replacement & Expiry Dates',
      'hero.desc': 'afterBUY tracks replacement cycles, Period After Opening (PAO), warranties, and backup supplies. Snap photos to add items, auto-deduct inventory, with Passkey login & seamless WebCal calendar sync.',
      'hero.cta.primary': 'Launch Web App Free',
      'hero.cta.secondary': 'GitHub Repository',
      'status.fresh': 'Healthy',
      'status.soon': 'Due Soon',
      'status.expired': 'Due Today / Overdue',
      'status.lowstock': 'Low Stock',
      'mockup.tab.interactive': '📱 Interactive',
      'mockup.tab.screenshot': '📸 Screenshot',
      'mockup.workspace': 'Sweet Home',
      'mockup.passkey': 'Passkey Active',
      'mockup.overview.title': 'Life Overview',
      'mockup.item1.name': 'Oral-B Electric Brush Head',
      'mockup.item1.meta': 'EB50 · Bathroom · 90-day cycle',
      'mockup.item1.tag': '5 days left',
      'mockup.item1.stock': 'Backup stock: 2',
      'mockup.item1.snooze': 'Snooze',
      'mockup.item1.replace': 'Replaced Today',
      'mockup.item2.name': 'Brita Filter MAXTRA+',
      'mockup.item2.meta': 'Kitchen · 60-day cycle',
      'mockup.item2.tag': 'Overdue 2 days',
      'mockup.item2.stock': 'Backup stock: 1',
      'mockup.item2.replace': 'Replaced Today',
      'mockup.item3.name': 'Kirkland Deep Sea Fish Oil',
      'mockup.item3.meta': 'Supplements · 2/day · 36 left',
      'mockup.item3.tag': '18 days left',
      'mockup.item3.stock': 'Unopened: 1 bottle',
      'mockup.item3.consume': 'Used Today (-2)',
      'mockup.toast.replaced': 'Replaced! Backup stock auto-decremented by 1.',
      'mockup.toast.undo': 'Undo',
      'features.eyebrow': 'Core Features',
      'features.title': 'Stop letting what you bought run out',
      'features.subtitle': 'The all-in-one tracker for consumable cycles, expiry countdowns, supply management, and multi-channel notifications.',
      'features.1.title': 'Cycles, PAO & Burn Rates',
      'features.1.desc': 'Toothbrush (90d), water filters (180d), skincare PAO (6M), food expiry dates, and daily burn-rate items like fish oil capsules.',
      'features.2.title': 'One-Tap Replace & Auto Deduct',
      'features.2.desc': 'Tap "Replaced Today" to reset cycles and deduct backup stock. Misclicked? 5-second tactile Undo Toast lets you revert instantly.',
      'features.3.title': 'WebCal Calendar Subscription',
      'features.3.desc': 'Sync to Apple, Google & Outlook calendars. Stable UIDs and 30-day tombstone STATUS:CANCELLED prevent ghost event residues.',
      'features.4.title': 'Passkey Biometric Login',
      'features.4.desc': 'Touch ID, Face ID, and Windows Hello instant unlock. Paired with 6-digit email OTP for seamless device switches.',
      'features.5.title': 'Multi-Channel Smart Alerts',
      'features.5.desc': 'PWA Web Push, daily 08:00 morning digest email, and VIP SMS alerts keep you informed without notification fatigue.',
      'features.6.title': 'Offline-First PWA & Privacy',
      'features.6.desc': 'Add to home screen without app store. Zero ads, zero tracking SDKs, and guest mode works instantly without login.',
      'countdown.eyebrow': 'Visual Progress',
      'countdown.title': 'A color for every countdown',
      'countdown.subtitle': 'Every item has a dedicated health status color. Never do date math in your head again.',
      'countdown.c1.badge': 'Healthy · Good',
      'countdown.c1.time': '72 days left',
      'countdown.c1.name': 'Aircon Dust Filter',
      'countdown.c1.desc': 'Emerald green means plenty of time. Breathe easy and enjoy clean home air.',
      'countdown.c2.badge': 'Due Soon · Prepare',
      'countdown.c2.time': '4 days left',
      'countdown.c2.name': 'Oral-B Brush Head',
      'countdown.c2.desc': 'Warm amber signals ≤ 7 days remaining. Time to check backups or order spares.',
      'countdown.c3.badge': 'Due Today / Overdue',
      'countdown.c3.time': 'Due today!',
      'countdown.c3.name': 'Brita Water Filter',
      'countdown.c3.desc': 'Coral red means replace now. Tap "Replaced Today" for instant check-in.',
      'countdown.c4.badge': 'Low Stock · Restock',
      'countdown.c4.time': '0 in stock',
      'countdown.c4.name': 'Laundry Detergent Pods',
      'countdown.c4.desc': 'Sky blue highlights zero backups. Built-in shopping list makes grocery runs effortless.',
      'how.eyebrow': 'How It Works',
      'how.title': 'Three steps. Then you can relax.',
      'how.subtitle': 'Set it up once, and let afterBUY watch the clock for you.',
      'how.1.title': '01 Snap a photo or pick preset',
      'how.1.desc': 'Snap a photo with your camera or pick from extensive built-in presets (toothbrush, filters, vitamins) in 10 seconds.',
      'how.2.title': '02 Smart tracking & life board',
      'how.2.desc': 'Counts down automatically by cycle or daily burn rate. Emotional life overview shows urgent items at a glance.',
      'how.3.title': '03 Timely alerts & 1-tap restock',
      'how.3.desc': 'Get reminded before due dates. One-tap "Replaced Today" deducts backup stock and updates your calendars.',
      'privacy.eyebrow': 'Privacy By Design',
      'privacy.title': 'Your household items are your business',
      'privacy.desc': 'afterBUY is built edge-native and offline-first. No third-party ad networks, no data brokers, and no tracking scripts.',
      'privacy.f1': 'No phone number needed. Supported by Passkeys & passwordless Email OTP',
      'privacy.f2': 'Zero third-party tracking scripts, zero ads, zero data selling',
      'privacy.f3': 'Photos stored in encrypted edge storage with TLS 1.3 in transit',
      'privacy.f4': 'One-click full data backup & export. You are in total control',
      'faq.eyebrow': 'FAQ',
      'faq.title': 'Questions? Answered.',
      'faq.subtitle': 'Have other questions? Contact us via GitHub Issues or support email.',
      'faq.q1': 'Is afterBUY free to use?',
      'faq.a1': 'Yes! afterBUY is completely free to use with no banner ads and no paywalls. We believe taking care of your daily essentials should be an open digital right.',
      'faq.q2': 'How do I install afterBUY as an app on my phone?',
      'faq.a2': 'On iPhone Safari, tap the Share button and select "Add to Home Screen". On Android Chrome, tap "Install App" to enjoy native app fullscreen experience.',
      'faq.q3': 'Will the WebCal calendar leave stale ghost events?',
      'faq.a3': 'Never! afterBUY is engineered to adhere strictly to RFC 5545, utilizing stable UIDs, incremental SEQUENCE counters, and 30-day tombstone STATUS:CANCELLED.',
      'faq.q4': 'What is Passkey login? How do I log in on a new device?',
      'faq.a4': 'Passkeys use FIDO2/WebAuthn to log in instantly using Face ID, Touch ID, or fingerprint without passwords. When switching devices, simply use a 6-digit email OTP.',
      'faq.q5': 'Can I share a stock space with family or roommates?',
      'faq.a5': 'Yes! afterBUY features multi-stock management with 4-tier RBAC (Owner, Admin, Member, Viewer) and 8-character invite codes to collaborate smoothly.',
      'faq.q6': 'Can I snooze a reminder if I am not ready to replace?',
      'faq.a6': 'Yes! Every item card provides Snooze 3 Days or Snooze 7 Days options, as well as an "Unopened / Stored Mode" for items you have bought but not opened yet.',
      'cta.title': 'Stop letting what you bought expire.',
      'cta.desc': 'No app store download required. Launch instantly and bring calm, effortless order to your life.',
      'cta.btn.app': 'Launch Web App Now',
      'cta.btn.github': 'View on GitHub',
      'footer.rights': 'All rights reserved. Open source under AGPL-3.0.',
      'footer.privacy': 'Privacy Policy',
      'footer.terms': 'Terms of Service',
      'footer.changelog': 'Changelog',
      'footer.github': 'GitHub Source'
    }
  };

  const rotatingWords = {
    'zh-TW': [
      '牙刷刷頭',
      '淨水濾芯',
      '隱形眼鏡',
      '深海魚油',
      '冷氣濾網',
      '開架保養品',
      '抗菌洗衣球'
    ],
    'en': [
      'toothbrush heads',
      'water filters',
      'contact lenses',
      'fish oil capsules',
      'aircon filters',
      'opened skincare',
      'laundry pods'
    ]
  };

  // State
  let currentLang = localStorage.getItem('afterbuy_landing_lang') || 'zh-TW';
  let currentTheme = localStorage.getItem('afterbuy_landing_theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  // ==========================================
  // 2. Language Switcher Function
  // ==========================================
  function setLanguage(lang) {
    if (!translations[lang]) lang = 'zh-TW';
    currentLang = lang;
    localStorage.setItem('afterbuy_landing_lang', lang);
    document.documentElement.setAttribute('lang', lang);

    // Update text nodes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });

    // Update lang button text
    const langBtn = document.getElementById('js-lang-btn');
    if (langBtn) {
      langBtn.setAttribute('title', lang === 'zh-TW' ? 'Switch to English' : '切換為繁體中文');
      langBtn.querySelector('.lang-label').textContent = lang === 'zh-TW' ? 'EN' : '繁中';
    }

    // Reset rotating word
    currentWordIndex = 0;
    updateRotatingWord();
  }

  // ==========================================
  // 3. Theme Toggle Function
  // ==========================================
  function setTheme(theme) {
    currentTheme = theme;
    localStorage.setItem('afterbuy_landing_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);

    const themeBtn = document.getElementById('js-theme-btn');
    if (themeBtn) {
      themeBtn.innerHTML = theme === 'dark' 
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      themeBtn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : '切換為深色模式');
    }
  }

  // ==========================================
  // 4. Rotating Word Animation
  // ==========================================
  let currentWordIndex = 0;
  const wordEl = document.getElementById('js-rotating-word');

  function updateRotatingWord() {
    if (!wordEl) return;
    const words = rotatingWords[currentLang] || rotatingWords['zh-TW'];
    wordEl.classList.remove('word-flip-in');
    wordEl.classList.add('word-flip-out');

    setTimeout(() => {
      wordEl.textContent = words[currentWordIndex % words.length];
      wordEl.classList.remove('word-flip-out');
      wordEl.classList.add('word-flip-in');
    }, 300);
  }

  function startRotatingLoop() {
    setInterval(() => {
      const words = rotatingWords[currentLang] || rotatingWords['zh-TW'];
      currentWordIndex = (currentWordIndex + 1) % words.length;
      updateRotatingWord();
    }, 2800);
  }

  // ==========================================
  // 5. Interactive Mockup Functionality
  // ==========================================
  function setupMockupInteractions() {
    // Mode switcher (Interactive vs Screenshot)
    const tabInteractive = document.getElementById('js-tab-interactive');
    const tabScreenshot = document.getElementById('js-tab-screenshot');
    const appBody = document.getElementById('js-mockup-app-body');
    const screenshotView = document.getElementById('js-mockup-screenshot-view');

    if (tabInteractive && tabScreenshot && appBody && screenshotView) {
      tabInteractive.addEventListener('click', () => {
        tabInteractive.classList.add('active');
        tabScreenshot.classList.remove('active');
        appBody.style.display = 'flex';
        screenshotView.classList.remove('active');
      });

      tabScreenshot.addEventListener('click', () => {
        tabScreenshot.classList.add('active');
        tabInteractive.classList.remove('active');
        appBody.style.display = 'none';
        screenshotView.classList.add('active');
      });
    }

    // Toothbrush "今天已換" & Undo Toast simulation
    const btnReplaceToothbrush = document.getElementById('js-mock-btn-replace-1');
    const cardToothbrush = document.getElementById('js-mock-card-1');
    const toastEl = document.getElementById('js-mock-undo-toast');
    const btnUndo = document.getElementById('js-mock-btn-undo');
    let toastTimeout = null;

    if (btnReplaceToothbrush && cardToothbrush && toastEl && btnUndo) {
      let isReplaced = false;

      btnReplaceToothbrush.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isReplaced) return;
        isReplaced = true;

        // Visual update to 90 days fresh
        const tag = cardToothbrush.querySelector('.mock-tag');
        const progressBar = cardToothbrush.querySelector('.mock-progress-bar');
        const stockEl = cardToothbrush.querySelector('.mock-stock-count');

        if (tag) {
          tag.textContent = currentLang === 'zh-TW' ? '剩餘 90 天' : '90 days left';
          tag.className = 'mock-tag status-pill-fresh';
        }
        if (progressBar) {
          progressBar.style.width = '100%';
          progressBar.style.backgroundColor = 'var(--status-fresh)';
        }
        if (stockEl) {
          stockEl.textContent = '1';
        }

        // Show Undo Toast
        toastEl.classList.add('is-visible');
        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
          toastEl.classList.remove('is-visible');
        }, 5000);
      });

      btnUndo.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isReplaced) return;
        isReplaced = false;

        // Restore original state
        const tag = cardToothbrush.querySelector('.mock-tag');
        const progressBar = cardToothbrush.querySelector('.mock-progress-bar');
        const stockEl = cardToothbrush.querySelector('.mock-stock-count');

        if (tag) {
          tag.textContent = currentLang === 'zh-TW' ? '剩餘 5 天' : '5 days left';
          tag.className = 'mock-tag status-pill-soon';
        }
        if (progressBar) {
          progressBar.style.width = '15%';
          progressBar.style.backgroundColor = 'var(--status-soon)';
        }
        if (stockEl) {
          stockEl.textContent = '2';
        }

        toastEl.classList.remove('is-visible');
        if (toastTimeout) clearTimeout(toastTimeout);
      });
    }

    // Brita Filter replace button
    const btnReplaceBrita = document.getElementById('js-mock-btn-replace-2');
    const cardBrita = document.getElementById('js-mock-card-2');
    if (btnReplaceBrita && cardBrita) {
      btnReplaceBrita.addEventListener('click', (e) => {
        e.stopPropagation();
        const tag = cardBrita.querySelector('.mock-tag');
        const progressBar = cardBrita.querySelector('.mock-progress-bar');
        const stockEl = cardBrita.querySelector('.mock-stock-count');

        if (tag) {
          tag.textContent = currentLang === 'zh-TW' ? '剩餘 60 天' : '60 days left';
          tag.className = 'mock-tag status-pill-fresh';
        }
        if (progressBar) {
          progressBar.style.width = '100%';
          progressBar.style.backgroundColor = 'var(--status-fresh)';
        }
        if (stockEl) {
          stockEl.textContent = '0';
        }
        btnReplaceBrita.textContent = currentLang === 'zh-TW' ? '已更新 ✨' : 'Done ✨';
        btnReplaceBrita.style.background = 'var(--status-fresh)';
      });
    }

    // Fish oil capsule daily consume button
    const btnConsumeFishOil = document.getElementById('js-mock-btn-consume-3');
    const cardFishOil = document.getElementById('js-mock-card-3');
    if (btnConsumeFishOil && cardFishOil) {
      let remainingCount = 36;
      btnConsumeFishOil.addEventListener('click', (e) => {
        e.stopPropagation();
        if (remainingCount > 0) {
          remainingCount = Math.max(0, remainingCount - 2);
          const meta = cardFishOil.querySelector('.mock-item-meta');
          const tag = cardFishOil.querySelector('.mock-tag');
          const progressBar = cardFishOil.querySelector('.mock-progress-bar');

          if (meta) {
            meta.textContent = currentLang === 'zh-TW' 
              ? `保健食品 · 每天 2 顆 · 剩 ${remainingCount} 顆` 
              : `Supplements · 2/day · ${remainingCount} left`;
          }
          if (tag) {
            const daysLeft = Math.ceil(remainingCount / 2);
            tag.textContent = currentLang === 'zh-TW' ? `剩餘 ${daysLeft} 天` : `${daysLeft} days left`;
          }
          if (progressBar) {
            progressBar.style.width = `${Math.round((remainingCount / 60) * 100)}%`;
          }

          btnConsumeFishOil.style.transform = 'scale(0.92)';
          setTimeout(() => { btnConsumeFishOil.style.transform = 'scale(1)'; }, 150);
        }
      });
    }
  }

  // ==========================================
  // 6. Mobile Navigation Menu Toggle
  // ==========================================
  function setupMobileNav() {
    const toggleBtn = document.getElementById('js-nav-toggle');
    const mobileMenu = document.getElementById('js-mobile-menu');

    if (toggleBtn && mobileMenu) {
      toggleBtn.addEventListener('click', () => {
        const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
        toggleBtn.setAttribute('aria-expanded', !isExpanded);
        mobileMenu.classList.toggle('is-open', !isExpanded);
      });

      // Close menu when clicking link
      mobileMenu.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
          toggleBtn.setAttribute('aria-expanded', 'false');
          mobileMenu.classList.remove('is-open');
        });
      });
    }
  }

  // ==========================================
  // 7. Scroll Reveal Animation
  // ==========================================
  function setupScrollReveal() {
    const revealEls = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window)) {
      revealEls.forEach(el => el.classList.add('is-revealed'));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.1
    });

    revealEls.forEach(el => observer.observe(el));
  }

  // ==========================================
  // 8. Initialization
  // ==========================================
  document.addEventListener('DOMContentLoaded', () => {
    // Set theme
    setTheme(currentTheme);
    const themeBtn = document.getElementById('js-theme-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        setTheme(currentTheme === 'dark' ? 'light' : 'dark');
      });
    }

    // Set language
    setLanguage(currentLang);
    const langBtn = document.getElementById('js-lang-btn');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        setLanguage(currentLang === 'zh-TW' ? 'en' : 'zh-TW');
      });
    }

    // Set dynamic year in footer
    document.querySelectorAll('.js-year').forEach(el => {
      el.textContent = new Date().getFullYear();
    });

    // Start rotating headline words
    startRotatingLoop();

    // Setup interactive components
    setupMockupInteractions();
    setupMobileNav();
    setupScrollReveal();
  });
})();
