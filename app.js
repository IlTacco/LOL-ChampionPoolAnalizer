/**
 * League of Legends Matchup Analyzer - Main Application Script
 */

import { DataService } from './data_service.js';
import { MatchupEngine } from './matchup_engine.js';
import { TRANSLATIONS, detectDefaultLanguage } from './i18n.js';

class App {
  constructor() {
    this.dataService = new DataService();
    this.engine = new MatchupEngine(this.dataService);

    this.currentLang = detectDefaultLanguage();
    try {
      const savedRole = localStorage.getItem('lol_user_role');
      this.currentRole = ['top', 'jungle', 'mid', 'adc', 'supp'].includes(savedRole) ? savedRole : 'top';
    } catch (e) {
      this.currentRole = 'top';
    }
    try {
      this.currentRank = localStorage.getItem('lol_user_rank') || '17';
    } catch (e) {
      this.currentRank = '17'; // 17 = Emerald+ (default competitive)
    }
    this.userPool = [];
    this.filterMode = 'all'; // 'all', 'uncovered', 'uncovered_double'
    this.uncoveredTabMode = 'uncovered'; // 'uncovered' or 'uncovered_double'
    this.searchQuery = '';
    this.tableSort = 'name_asc'; // Alphabetical (A-Z) by default as requested
    this.toastTimeout = null;
    this.isUpdating = false;
    this.updatePollInterval = null;
    this.currentTutorialStep = 0;
    this.tutorialSteps = [
      {
        badge: "Guida Rapida • 1 di 5",
        title: "Benvenuto in LoL Matchup Analyzer",
        text: "Questo strumento analizza in tempo reale i dati competitivi di League of Legends (Rank Emerald+). Calcola la copertura del tuo Champion Pool, rileva i tuoi blind spot e ti protegge dai ban con la <strong>Copertura Doppia</strong>.",
        target: null
      },
      {
        badge: "Guida Rapida • 2 di 5",
        title: "1. Componi il tuo Champion Pool",
        text: "All'inizio il tuo pool è completamente vuoto: clicca su <strong>\"Aggiungi Campione\"</strong> per inserire i tuoi pick abituali di corsia. Puoi salvare i tuoi preferiti o svuotare il pool in qualsiasi momento.",
        target: "#btnAddPool"
      },
      {
        badge: "Guida Rapida • 3 di 5",
        title: "2. Copertura, Anti-Ban e Suggerimenti",
        text: "Gli indicatori in alto mostrano la percentuale di avversari che batti (>50% WR) e quanti hanno un 2° pick anti-ban. Nella lista a destra trovi tutti i migliori campioni da aggiungere, ordinati per utilità strategica.",
        target: "#recommendationBox"
      },
      {
        badge: "Guida Rapida • 4 di 5",
        title: "3. Matrice Matchup & Video YouTube",
        text: "La tabella incrocia i tuoi campioni con tutti gli avversari. <strong>Clicca su qualsiasi percentuale nella tabella</strong> per aprire direttamente su YouTube il video matchup: <em>[Tuo Campione] Top vs [Avversario]</em>!",
        target: ".matrix-container"
      },
      {
        badge: "Guida Rapida • 5 di 5",
        title: "4. Quick Pick Draft in Partita",
        text: "Durante la champion select, appena l'avversario ha lockato, digita il suo nome nel Quick Pick per scoprire istantaneamente il counterpick ideale del tuo pool da schierare in partita.",
        target: ".quick-pick-section"
      }
    ];

    // Cache DOM Elements
    this.dom = {
      laneBtns: document.querySelectorAll('.lane-btn'),
      eloSelect: document.getElementById('eloSelect'),
      btnOpenTutorial: document.getElementById('btnOpenTutorial'),
      btnUpdateData: document.getElementById('btnUpdateData'),
      tutorialOverlay: document.getElementById('tutorialOverlay'),
      tutorialSpotlight: document.getElementById('tutorialSpotlight'),
      tutorialCard: document.getElementById('tutorialCard'),
      tutorialStepBadge: document.getElementById('tutorialStepBadge'),
      tutorialCloseBtn: document.getElementById('tutorialCloseBtn'),
      tutorialTitle: document.getElementById('tutorialTitle'),
      tutorialText: document.getElementById('tutorialText'),
      tutorialDots: document.getElementById('tutorialDots'),
      tutorialPrevBtn: document.getElementById('tutorialPrevBtn'),
      tutorialNextBtn: document.getElementById('tutorialNextBtn'),
      updateProgressBanner: document.getElementById('updateProgressBanner'),
      progressTitle: document.getElementById('progressTitle'),
      progressPercent: document.getElementById('progressPercent'),
      progressBarFill: document.getElementById('progressBarFill'),
      progressStatusDesc: document.getElementById('progressStatusDesc'),
      progressDismissBtn: document.getElementById('progressDismissBtn'),
      gaugeCircle: document.getElementById('gaugeCircle'),
      gaugeVal: document.getElementById('gaugeVal'),
      coverageStats: document.getElementById('coverageStats'),
      doubleGaugeCircle: document.getElementById('doubleGaugeCircle'),
      doubleGaugeVal: document.getElementById('doubleGaugeVal'),
      doubleCoverageStats: document.getElementById('doubleCoverageStats'),
      tabUncoveredSingle: document.getElementById('tabUncoveredSingle'),
      tabUncoveredDouble: document.getElementById('tabUncoveredDouble'),
      uncoveredCountBadge: document.getElementById('uncoveredCountBadge'),
      uncoveredDoubleCountBadge: document.getElementById('uncoveredDoubleCountBadge'),
      filterUncoveredBtn: document.getElementById('filterUncoveredBtn'),
      uncoveredChips: document.getElementById('uncoveredChips'),
      recomContent: document.getElementById('recomContent'),
      recomCountBadge: document.getElementById('recomCountBadge'),
      quickPickInput: document.getElementById('quickPickInput'),
      quickPickResult: document.getElementById('quickPickResult'),
      opponentsDatalist: document.getElementById('opponentsDatalist'),
      poolChampionsList: document.getElementById('poolChampionsList'),
      poolCount: document.getElementById('poolCount'),
      btnLoadFavorites: document.getElementById('btnLoadFavorites'),
      btnSaveFavorites: document.getElementById('btnSaveFavorites'),
      btnAddPool: document.getElementById('btnAddPool'),
      btnClearPool: document.getElementById('btnClearPool'),
      tableSearchInput: document.getElementById('tableSearchInput'),
      tableSortSelect: document.getElementById('tableSortSelect'),
      matrixHeaderRow: document.getElementById('matrixHeaderRow'),
      matrixBody: document.getElementById('matrixBody'),
      addPoolModal: document.getElementById('addPoolModal'),
      modalCloseBtn: document.getElementById('modalCloseBtn'),
      modalSearchInput: document.getElementById('modalSearchInput'),
      modalChampGrid: document.getElementById('modalChampGrid'),
      detailTooltip: document.getElementById('detailTooltip'),
      tooltipTitle: document.getElementById('tooltipTitle'),
      tooltipWinrate: document.getElementById('tooltipWinrate'),
      tooltipMatches: document.getElementById('tooltipMatches'),
      tooltipGold: document.getElementById('tooltipGold'),
      tooltipCs: document.getElementById('tooltipCs'),
      tooltipXp: document.getElementById('tooltipXp'),
      toastNotification: document.getElementById('toastNotification'),
      adminModal: document.getElementById('adminModal'),
      adminModalBackdrop: document.getElementById('adminModalBackdrop'),
      adminModalCloseBtn: document.getElementById('adminModalCloseBtn'),
      adminModalTitle: document.getElementById('adminModalTitle'),
      adminLoginView: document.getElementById('adminLoginView'),
      adminPasswordInput: document.getElementById('adminPasswordInput'),
      btnToggleAdminEye: document.getElementById('btnToggleAdminEye'),
      adminLoginError: document.getElementById('adminLoginError'),
      btnCancelAdminLogin: document.getElementById('btnCancelAdminLogin'),
      btnSubmitAdminLogin: document.getElementById('btnSubmitAdminLogin'),
      btnSwitchToChangePwd: document.getElementById('btnSwitchToChangePwd'),
      adminChangePwdView: document.getElementById('adminChangePwdView'),
      adminOldPwdInput: document.getElementById('adminOldPwdInput'),
      adminNewPwdInput: document.getElementById('adminNewPwdInput'),
      adminConfirmPwdInput: document.getElementById('adminConfirmPwdInput'),
      adminChangePwdError: document.getElementById('adminChangePwdError'),
      btnBackToLoginView: document.getElementById('btnBackToLoginView'),
      btnSubmitChangePwd: document.getElementById('btnSubmitChangePwd'),
      counterModal: document.getElementById('counterModal'),
      counterModalBackdrop: document.getElementById('counterModalBackdrop'),
      counterModalCloseBtn: document.getElementById('counterModalCloseBtn'),
      counterModalImg: document.getElementById('counterModalImg'),
      counterModalTitle: document.getElementById('counterModalTitle'),
      counterModalList: document.getElementById('counterModalList')
    };
  }

  async init() {
    console.log("Initializing LoL Matchup Analyzer strictly for lane rosters...");
    await this.dataService.initialize();

    // Sync saved rank with select and dataService
    if (this.dom.eloSelect) {
      this.dom.eloSelect.value = this.currentRank;
    }
    this.dataService.currentRank = this.currentRank;

    // Sync saved role button active state
    if (this.dom.laneBtns) {
      this.dom.laneBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-role') === this.currentRole);
      });
    }

    // Load pool from local cache; on first visit it starts clean with 0 pre-set champions
    this.userPool = this.dataService.getUserPool(this.currentRole);

    // Hide "Aggiorna Dati" button when not running on localhost (e.g. GitHub Pages)
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (!isLocalhost && this.dom.btnUpdateData) {
      this.dom.btnUpdateData.style.display = 'none';
    }

    // Setup event listeners
    this.setupEvents();

    // Apply initial language translations
    this.applyTranslations();

    // Initial render
    this.render();

    // Check if background update was running (only on localhost)
    if (isLocalhost) {
      this.checkBackgroundUpdateStatus();
    }

    // Launch tutorial on first visit if not yet completed
    this.checkTutorial();
  }

  async checkBackgroundUpdateStatus() {
    try {
      const res = await fetch('./api/update-status?t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.status === 'running') {
        this.isUpdating = true;
        this.dom.btnUpdateData.disabled = true;
        this.dom.btnUpdateData.classList.add('updating');
        this.dom.btnUpdateData.innerHTML = `<svg class="spin-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg><span>Aggiornamento in corso...</span>`;
        this.dom.updateProgressBanner.style.display = 'block';
        this.startPollingStatus();
      }
    } catch (e) {}
  }

  setupEvents() {
    // Lane selector buttons
    this.dom.laneBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const role = btn.dataset.role;
        if (role === this.currentRole) return;
        this.dom.laneBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentRole = role;
        try {
          localStorage.setItem('lol_user_role', role);
        } catch (e) {}
        this.loadPoolForRole(role);
        this.render();
      });
    });

    // Elo selector with persistence
    this.dom.eloSelect.addEventListener('change', (e) => {
      this.currentRank = e.target.value;
      try {
        localStorage.setItem('lol_user_rank', this.currentRank);
      } catch (err) {}
      this.dataService.currentRank = this.currentRank;
      this.render();
      const selectedText = this.dom.eloSelect.options[this.dom.eloSelect.selectedIndex]?.text || '';
      this.showToast(`Filtro Rank salvato: ${selectedText}`);
    });

    // Imposta / Carica Preferiti button
    if (this.dom.btnLoadFavorites) {
      this.dom.btnLoadFavorites.addEventListener('click', () => {
        this.applyFavoritePool(true);
      });
    }

    // Save as Favorite button
    this.dom.btnSaveFavorites.addEventListener('click', () => {
      const ok = this.dataService.saveFavoritePool(this.currentRole, this.userPool);
      if (ok) {
        this.showToast(`Champion pool ${this.currentRole.toUpperCase()} salvato nei preferiti.`);
        this.renderPoolBar();
      }
    });

    // Tabs for single vs double uncovered
    if (this.dom.tabUncoveredSingle && this.dom.tabUncoveredDouble) {
      this.dom.tabUncoveredSingle.addEventListener('click', () => {
        this.uncoveredTabMode = 'uncovered';
        this.dom.tabUncoveredSingle.classList.add('active');
        this.dom.tabUncoveredDouble.classList.remove('active');
        if (this.filterMode !== 'all') {
          this.filterMode = 'uncovered';
        }
        this.renderCoverageAndTable();
      });

      this.dom.tabUncoveredDouble.addEventListener('click', () => {
        this.uncoveredTabMode = 'uncovered_double';
        this.dom.tabUncoveredDouble.classList.add('active');
        this.dom.tabUncoveredSingle.classList.remove('active');
        if (this.filterMode !== 'all') {
          this.filterMode = 'uncovered_double';
        }
        this.renderCoverageAndTable();
      });
    }

    // Filter table toggle button
    this.dom.filterUncoveredBtn.addEventListener('click', () => {
      if (this.filterMode === this.uncoveredTabMode) {
        this.filterMode = 'all';
        this.dom.filterUncoveredBtn.classList.remove('active');
      } else {
        this.filterMode = this.uncoveredTabMode;
        this.dom.filterUncoveredBtn.classList.add('active');
      }
      this.renderTable();
    });

    // Table search
    this.dom.tableSearchInput.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderTable();
    });

    // Table sort select
    if (this.dom.tableSortSelect) {
      this.dom.tableSortSelect.addEventListener('change', (e) => {
        this.tableSort = e.target.value;
        this.renderTable();
      });
    }

    // Quick pick input
    this.dom.quickPickInput.addEventListener('input', (e) => {
      this.handleQuickPick(e.target.value);
    });

    // Clear pool button
    if (this.dom.btnClearPool) {
      this.dom.btnClearPool.addEventListener('click', () => {
        this.clearPool();
      });
    }

    // Open add pool modal
    this.dom.btnAddPool.addEventListener('click', () => {
      this.openAddModal();
    });

    // Close modal
    this.dom.modalCloseBtn.addEventListener('click', () => {
      this.dom.addPoolModal.style.display = 'none';
    });
    this.dom.addPoolModal.addEventListener('click', (e) => {
      if (e.target === this.dom.addPoolModal) {
        this.dom.addPoolModal.style.display = 'none';
      }
    });

    // Modal search
    this.dom.modalSearchInput.addEventListener('input', (e) => {
      this.renderModalGrid(e.target.value);
    });

    // Tooltip hiding on scroll
    window.addEventListener('scroll', () => {
      this.hideTooltip();
    }, { passive: true });

    // Language selector buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        if (lang) this.setLanguage(lang);
      });
    });

    // Update data button (triggers admin authorization)
    if (this.dom.btnUpdateData) {
      this.dom.btnUpdateData.addEventListener('click', () => {
        this.openAdminModal();
      });
    }

    // Counter modal controls
    if (this.dom.counterModalCloseBtn) {
      this.dom.counterModalCloseBtn.addEventListener('click', () => this.closeCounterModal());
    }
    if (this.dom.counterModalBackdrop) {
      this.dom.counterModalBackdrop.addEventListener('click', () => this.closeCounterModal());
    }

    // Admin modal controls
    if (this.dom.adminModalCloseBtn) {
      this.dom.adminModalCloseBtn.addEventListener('click', () => this.closeAdminModal());
    }
    if (this.dom.adminModalBackdrop) {
      this.dom.adminModalBackdrop.addEventListener('click', () => this.closeAdminModal());
    }
    if (this.dom.btnCancelAdminLogin) {
      this.dom.btnCancelAdminLogin.addEventListener('click', () => this.closeAdminModal());
    }
    if (this.dom.btnSubmitAdminLogin) {
      this.dom.btnSubmitAdminLogin.addEventListener('click', () => this.submitAdminLogin());
    }
    if (this.dom.adminPasswordInput) {
      this.dom.adminPasswordInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.submitAdminLogin();
      });
    }
    if (this.dom.btnToggleAdminEye) {
      this.dom.btnToggleAdminEye.addEventListener('click', () => {
        const inp = this.dom.adminPasswordInput;
        inp.type = inp.type === 'password' ? 'text' : 'password';
      });
    }
    if (this.dom.btnSwitchToChangePwd) {
      this.dom.btnSwitchToChangePwd.addEventListener('click', () => this.showAdminChangePwdView());
    }
    if (this.dom.btnBackToLoginView) {
      this.dom.btnBackToLoginView.addEventListener('click', () => this.showAdminLoginView());
    }
    if (this.dom.btnSubmitChangePwd) {
      this.dom.btnSubmitChangePwd.addEventListener('click', () => this.submitChangeAdminPassword());
    }
    if (this.dom.adminConfirmPwdInput) {
      this.dom.adminConfirmPwdInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.submitChangeAdminPassword();
      });
    }

    // Dismiss progress banner button
    if (this.dom.progressDismissBtn) {
      this.dom.progressDismissBtn.addEventListener('click', () => {
        this.dom.updateProgressBanner.style.display = 'none';
      });
    }

    // Tutorial controls
    if (this.dom.btnOpenTutorial) {
      this.dom.btnOpenTutorial.addEventListener('click', () => {
        this.startTutorial();
      });
    }

    if (this.dom.tutorialNextBtn) {
      this.dom.tutorialNextBtn.addEventListener('click', () => {
        this.nextTutorialStep();
      });
    }

    if (this.dom.tutorialPrevBtn) {
      this.dom.tutorialPrevBtn.addEventListener('click', () => {
        this.prevTutorialStep();
      });
    }

    if (this.dom.tutorialCloseBtn) {
      this.dom.tutorialCloseBtn.addEventListener('click', () => {
        this.closeTutorial();
      });
    }

    if (this.dom.tutorialOverlay) {
      this.dom.tutorialOverlay.addEventListener('click', (e) => {
        if (e.target === this.dom.tutorialOverlay) {
          this.closeTutorial();
        }
      });
    }

    // Keep spotlight locked to target on scroll/resize
    window.addEventListener('scroll', () => {
      this.updateSpotlightPosition();
    }, { passive: true });

    window.addEventListener('resize', () => {
      this.updateSpotlightPosition();
    }, { passive: true });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.dom.counterModal && this.dom.counterModal.style.display !== 'none') {
          this.closeCounterModal();
        } else if (this.dom.adminModal && this.dom.adminModal.style.display !== 'none') {
          this.closeAdminModal();
        } else if (this.dom.tutorialOverlay && this.dom.tutorialOverlay.style.display !== 'none') {
          this.closeTutorial();
        }
      }
    });
  }

  t(key, vars = {}) {
    const dict = TRANSLATIONS[this.currentLang] || TRANSLATIONS.it;
    let str = dict[key] || TRANSLATIONS.it[key] || key;
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, v);
    }
    return str;
  }

  setLanguage(lang) {
    if (lang !== 'it' && lang !== 'en') return;
    this.currentLang = lang;
    try {
      localStorage.setItem('lol_user_lang', lang);
    } catch (e) {}
    this.applyTranslations();
    this.render();
  }

  applyTranslations() {
    document.documentElement.lang = this.currentLang;

    // Update active state of language buttons
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLang);
    });

    // Header & Subtitle
    const subtitleEl = document.querySelector('.brand-subtitle span:first-child');
    if (subtitleEl) subtitleEl.textContent = this.t('subtitle');

    if (this.dom.eloSelect) {
      const opts = this.dom.eloSelect.options;
      if (opts[0]) opts[0].textContent = this.t('rank_emerald');
      if (opts[1]) opts[1].textContent = this.t('rank_diamond');
      if (opts[2]) opts[2].textContent = this.t('rank_master');
      if (opts[3]) opts[3].textContent = this.t('rank_platinum');
      if (opts[4]) opts[4].textContent = this.t('rank_overall');
    }

    if (this.dom.btnOpenTutorial) {
      this.dom.btnOpenTutorial.title = this.t('btn_guide_title');
      const sp = this.dom.btnOpenTutorial.querySelector('span');
      if (sp) sp.textContent = this.t('btn_guide');
    }

    if (this.dom.btnUpdateData && !this.isUpdating) {
      this.dom.btnUpdateData.title = this.t('btn_update_title');
      const sp = this.dom.btnUpdateData.querySelector('span');
      if (sp) sp.textContent = this.t('btn_update');
    }

    if (this.dom.progressTitle) this.dom.progressTitle.textContent = this.t('progress_title');

    // Dashboard & Coverage
    const covTitle = document.getElementById('coverageTitle');
    if (covTitle) covTitle.textContent = this.t('coverage_title');
    const dblCovTitle = document.getElementById('doubleCoverageTitle');
    if (dblCovTitle) dblCovTitle.textContent = this.t('double_coverage_title');

    if (this.dom.tabUncoveredSingle) {
      this.dom.tabUncoveredSingle.innerHTML = `<span>${this.t('tab_uncovered')} (<span id="uncoveredCountBadge">${this.dom.uncoveredCountBadge ? this.dom.uncoveredCountBadge.textContent : '0'}</span>)</span>`;
      this.dom.uncoveredCountBadge = document.getElementById('uncoveredCountBadge');
    }
    if (this.dom.tabUncoveredDouble) {
      this.dom.tabUncoveredDouble.innerHTML = `<span>${this.t('tab_uncovered_double')} (<span id="uncoveredDoubleCountBadge">${this.dom.uncoveredDoubleCountBadge ? this.dom.uncoveredDoubleCountBadge.textContent : '0'}</span>)</span>`;
      this.dom.uncoveredDoubleCountBadge = document.getElementById('uncoveredDoubleCountBadge');
    }

    if (this.dom.filterUncoveredBtn) {
      this.dom.filterUncoveredBtn.textContent = this.filterMode === 'all' ? this.t('btn_filter_table') : this.t('btn_show_all');
    }

    const recomTitle = document.querySelector('.recom-header-title');
    if (recomTitle) recomTitle.textContent = this.t('recom_title');
    if (this.dom.recomCountBadge) this.dom.recomCountBadge.textContent = this.t('recom_badge');

    // Quick Pick
    const qpLabel = document.querySelector('.quick-pick-label span');
    if (qpLabel) qpLabel.textContent = this.t('quick_pick_label');
    if (this.dom.quickPickInput) this.dom.quickPickInput.placeholder = this.t('quick_pick_placeholder');

    // Pool Section
    const poolTitle = document.querySelector('.pool-title-group h2');
    if (poolTitle) poolTitle.textContent = this.t('pool_title');
    if (this.dom.btnLoadFavorites) {
      this.dom.btnLoadFavorites.title = this.t('btn_load_fav_title');
      const sp = this.dom.btnLoadFavorites.querySelector('span');
      if (sp) sp.textContent = this.t('btn_load_fav');
    }
    if (this.dom.btnSaveFavorites) {
      this.dom.btnSaveFavorites.title = this.t('btn_save_fav_title');
      const sp = this.dom.btnSaveFavorites.querySelector('span');
      if (sp) sp.textContent = this.t('btn_save_fav');
    }
    if (this.dom.btnAddPool) this.dom.btnAddPool.textContent = this.t('btn_add_champ');
    if (this.dom.btnClearPool) this.dom.btnClearPool.textContent = this.t('btn_clear');

    // Table controls
    if (this.dom.tableSearchInput) this.dom.tableSearchInput.placeholder = this.t('table_search_placeholder');
    if (this.dom.tableSortSelect) {
      const opts = this.dom.tableSortSelect.options;
      if (opts[0]) opts[0].textContent = this.t('sort_name_asc');
      if (opts[1]) opts[1].textContent = this.t('sort_wr_desc');
      if (opts[2]) opts[2].textContent = this.t('sort_wr_asc');
    }

    // Add Pool Modal
    const modalTitle = document.querySelector('#addPoolModal .modal-title');
    if (modalTitle) modalTitle.textContent = this.t('modal_add_title');
    if (this.dom.modalSearchInput) this.dom.modalSearchInput.placeholder = this.t('modal_add_search');

    // Admin Modal
    const adminDesc = document.querySelector('#adminLoginView .admin-modal-desc');
    if (adminDesc) adminDesc.textContent = this.t('admin_login_desc');
    const adminPwdLabel = document.querySelector('label[for="adminPasswordInput"]');
    if (adminPwdLabel) adminPwdLabel.textContent = this.t('admin_pwd_label');
    if (this.dom.adminPasswordInput) this.dom.adminPasswordInput.placeholder = this.t('admin_pwd_placeholder');
    if (this.dom.btnCancelAdminLogin) this.dom.btnCancelAdminLogin.textContent = this.t('btn_cancel');
    if (this.dom.btnSubmitAdminLogin) this.dom.btnSubmitAdminLogin.textContent = this.t('btn_start_update');
    if (this.dom.btnSwitchToChangePwd) this.dom.btnSwitchToChangePwd.textContent = this.t('btn_change_pwd_link');

    const adminChangeDesc = document.querySelector('#adminChangePwdView .admin-modal-desc');
    if (adminChangeDesc) adminChangeDesc.textContent = this.t('admin_change_desc');
    const oldPwdLbl = document.querySelector('label[for="adminOldPwdInput"]');
    if (oldPwdLbl) oldPwdLbl.textContent = this.t('admin_old_pwd_label');
    if (this.dom.adminOldPwdInput) this.dom.adminOldPwdInput.placeholder = this.t('admin_old_pwd_placeholder');
    const newPwdLbl = document.querySelector('label[for="adminNewPwdInput"]');
    if (newPwdLbl) newPwdLbl.textContent = this.t('admin_new_pwd_label');
    if (this.dom.adminNewPwdInput) this.dom.adminNewPwdInput.placeholder = this.t('admin_new_pwd_placeholder');
    const confPwdLbl = document.querySelector('label[for="adminConfirmPwdInput"]');
    if (confPwdLbl) confPwdLbl.textContent = this.t('admin_confirm_pwd_label');
    if (this.dom.adminConfirmPwdInput) this.dom.adminConfirmPwdInput.placeholder = this.t('admin_confirm_pwd_placeholder');
    if (this.dom.btnBackToLoginView) this.dom.btnBackToLoginView.textContent = this.t('btn_back');
    if (this.dom.btnSubmitChangePwd) this.dom.btnSubmitChangePwd.textContent = this.t('btn_save_pwd');

    // Update tutorial steps text dynamically
    this.tutorialSteps = [
      { badge: this.t('tut_step_badge', { step: 1, total: 5 }), title: this.t('tut_1_title'), text: this.t('tut_1_text'), target: null },
      { badge: this.t('tut_step_badge', { step: 2, total: 5 }), title: this.t('tut_2_title'), text: this.t('tut_2_text'), target: '#laneSelector' },
      { badge: this.t('tut_step_badge', { step: 3, total: 5 }), title: this.t('tut_3_title'), text: this.t('tut_3_text'), target: '#btnAddPool' },
      { badge: this.t('tut_step_badge', { step: 4, total: 5 }), title: this.t('tut_4_title'), text: this.t('tut_4_text'), target: '#coverageDashboard' },
      { badge: this.t('tut_step_badge', { step: 5, total: 5 }), title: this.t('tut_5_title'), text: this.t('tut_5_text'), target: '.matrix-section' }
    ];
    if (this.dom.tutorialPrevBtn) this.dom.tutorialPrevBtn.textContent = this.t('tut_prev');
  }

  getAdminPassword() {
    try {
      return localStorage.getItem('lol_admin_pwd') || 'ADMIN';
    } catch (e) {
      return 'ADMIN';
    }
  }

  setAdminPassword(newPwd) {
    try {
      localStorage.setItem('lol_admin_pwd', newPwd);
    } catch (e) {}
  }

  openCounterModal(enemyKey) {
    const enemy = this.dataService.getChampionRoleMeta(enemyKey, this.currentRole);
    if (!enemy || !this.dom.counterModal) return;

    this.dom.counterModalImg.src = this.dataService.getChampionImageUrl(enemy.image);
    this.dom.counterModalImg.alt = enemy.name;
    this.dom.counterModalTitle.textContent = this.currentLang === 'en'
      ? `Best Counters vs ${enemy.name}`
      : `Migliori Counter vs ${enemy.name}`;

    const roleChamps = this.dataService.getRoleChampions(this.currentRole);
    const counters = [];

    for (const champ of roleChamps) {
      if (String(champ.key) === String(enemyKey)) continue;
      const m = this.engine.getMatchup(champ.key, enemyKey, this.currentRole, this.currentRank);
      if (m && m.winrate > 0) {
        counters.push({
          champion: champ,
          winrate: m.winrate,
          matches: m.matches || 0
        });
      }
    }

    counters.sort((a, b) => b.winrate - a.winrate);
    const topCounters = counters.slice(0, 15);

    if (topCounters.length === 0) {
      this.dom.counterModalList.innerHTML = `<div style="padding: 16px; text-align: center; color: #94a3b8; font-size: 13px;">${this.currentLang === 'en' ? 'No counter data available.' : 'Nessun dato counter disponibile.'}</div>`;
    } else {
      this.dom.counterModalList.innerHTML = topCounters.map((c, idx) => {
        const isWin = c.winrate >= 50.0;
        const wrColor = isWin ? '#4ade80' : '#f87171';
        const inPool = this.userPool.includes(String(c.champion.key));
        const poolBadge = inPool
          ? `<span style="font-size: 10px; padding: 2px 6px; border-radius: 4px; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3);">Nel Pool</span>`
          : '';
        return `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 10px; background: #14171d; border: 1px solid #262b36; border-radius: 6px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="width: 18px; font-size: 11px; color: #64748b; font-weight: 700;">#${idx + 1}</span>
              <img src="${this.dataService.getChampionImageUrl(c.champion.image)}" alt="${c.champion.name}" style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid #334155;">
              <div>
                <div style="font-size: 13px; font-weight: 600; color: #e2e8f0; display: flex; align-items: center; gap: 6px;">
                  ${c.champion.name}
                  ${poolBadge}
                </div>
                <div style="font-size: 11px; color: #64748b;">${c.matches.toLocaleString()} ${this.currentLang === 'en' ? 'matches' : 'partite'}</div>
              </div>
            </div>
            <div style="font-size: 13px; font-weight: 700; color: ${wrColor};">${c.winrate.toFixed(2)}%</div>
          </div>
        `;
      }).join('');
    }

    this.dom.counterModal.style.display = 'flex';
  }

  closeCounterModal() {
    if (this.dom.counterModal) {
      this.dom.counterModal.style.display = 'none';
    }
  }

  openAdminModal() {
    this.dom.adminModal.style.display = 'flex';
    this.showAdminLoginView();
  }

  closeAdminModal() {
    this.dom.adminModal.style.display = 'none';
  }

  showAdminLoginView() {
    this.dom.adminLoginView.style.display = 'block';
    this.dom.adminChangePwdView.style.display = 'none';
    this.dom.adminModalTitle.textContent = 'Accesso Amministratore';
    this.dom.adminPasswordInput.value = '';
    this.dom.adminPasswordInput.type = 'password';
    this.dom.adminLoginError.style.display = 'none';
    setTimeout(() => {
      this.dom.adminPasswordInput.focus();
    }, 100);
  }

  showAdminChangePwdView() {
    this.dom.adminLoginView.style.display = 'none';
    this.dom.adminChangePwdView.style.display = 'block';
    this.dom.adminModalTitle.textContent = 'Modifica Password Admin';
    this.dom.adminOldPwdInput.value = '';
    this.dom.adminNewPwdInput.value = '';
    this.dom.adminConfirmPwdInput.value = '';
    this.dom.adminChangePwdError.style.display = 'none';
    setTimeout(() => {
      this.dom.adminOldPwdInput.focus();
    }, 100);
  }

  async submitAdminLogin() {
    const entered = this.dom.adminPasswordInput.value;
    if (!entered) {
      this.dom.adminLoginError.textContent = 'Inserisci la password admin.';
      this.dom.adminLoginError.style.display = 'block';
      this.dom.adminPasswordInput.focus();
      return;
    }

    // Try validating with the local backend server first
    try {
      const res = await fetch('./api/verify-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: entered })
      });
      if (res.ok) {
        this.setAdminPassword(entered);
        this.closeAdminModal();
        this.startDataUpdate(entered);
        return;
      } else if (res.status === 401) {
        this.dom.adminLoginError.textContent = 'Password admin non corretta. Riprova.';
        this.dom.adminLoginError.style.display = 'block';
        this.dom.adminPasswordInput.focus();
        return;
      }
    } catch (e) {
      // Backend server not running (e.g. static host), check local storage fallback
      const expected = this.getAdminPassword();
      if (entered !== expected) {
        this.dom.adminLoginError.textContent = 'Password admin non corretta. Riprova.';
        this.dom.adminLoginError.style.display = 'block';
        this.dom.adminPasswordInput.focus();
        return;
      }
      this.closeAdminModal();
      this.startDataUpdate(entered);
    }
  }

  async submitChangeAdminPassword() {
    const oldPwd = this.dom.adminOldPwdInput.value;
    const newPwd = this.dom.adminNewPwdInput.value;
    const confirmPwd = this.dom.adminConfirmPwdInput.value;
    const errEl = this.dom.adminChangePwdError;

    if (!newPwd || newPwd.length < 3) {
      errEl.textContent = 'La nuova password deve contenere almeno 3 caratteri.';
      errEl.style.display = 'block';
      this.dom.adminNewPwdInput.focus();
      return;
    }

    if (newPwd !== confirmPwd) {
      errEl.textContent = 'La conferma password non coincide.';
      errEl.style.display = 'block';
      this.dom.adminConfirmPwdInput.focus();
      return;
    }

    // Attempt to update on backend server if reachable
    let serverUpdated = false;
    try {
      const res = await fetch('./api/change-admin-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        errEl.textContent = data.error || 'Password attuale non corretta.';
        errEl.style.display = 'block';
        this.dom.adminOldPwdInput.focus();
        return;
      }
      serverUpdated = true;
    } catch (e) {
      // Backend server offline/static, check against local cache
      const expected = this.getAdminPassword();
      if (oldPwd !== expected) {
        errEl.textContent = 'La password attuale non è corretta.';
        errEl.style.display = 'block';
        this.dom.adminOldPwdInput.focus();
        return;
      }
    }

    // Save locally in cache
    this.setAdminPassword(newPwd);
    this.showToast('Password admin aggiornata con successo.');
    this.showAdminLoginView();
  }

  async startDataUpdate(password) {
    if (this.isUpdating) return;
    this.isUpdating = true;

    const pwdToSend = password || this.getAdminPassword();
    const btn = this.dom.btnUpdateData;
    btn.disabled = true;
    btn.classList.add('updating');
    btn.innerHTML = `<svg class="spin-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg><span>Aggiornamento in corso...</span>`;

    // Show progress banner
    const banner = this.dom.updateProgressBanner;
    banner.style.display = 'block';
    this.dom.progressPercent.textContent = '0%';
    this.dom.progressBarFill.style.width = '0%';
    this.dom.progressStatusDesc.textContent = 'Inizializzazione job di aggiornamento in background...';

    try {
      // Trigger background job on server with admin credentials
      const res = await fetch('./api/start-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Password': pwdToSend
        },
        body: JSON.stringify({ password: pwdToSend })
      });

      if (!res.ok && res.status === 401) {
        this.isUpdating = false;
        btn.disabled = false;
        btn.classList.remove('updating');
        btn.innerHTML = `<svg class="update-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg><span>Aggiorna Dati</span>`;
        banner.style.display = 'none';
        this.showToast('Accesso negato: password admin non valida.');
        return;
      }
    } catch (e) {
      console.warn('Could not call /api/start-update:', e);
    }

    this.startPollingStatus();
  }

  startPollingStatus() {
    const btn = this.dom.btnUpdateData;
    const banner = this.dom.updateProgressBanner;
    let failCount = 0;

    if (this.updatePollInterval) clearInterval(this.updatePollInterval);
    this.updatePollInterval = setInterval(async () => {
      try {
        const res = await fetch('./api/update-status?t=' + Date.now());
        if (!res.ok) {
          failCount++;
          if (failCount >= 3) {
            clearInterval(this.updatePollInterval);
            this.updatePollInterval = null;
            this.isUpdating = false;
            btn.disabled = false;
            btn.classList.remove('updating');
            btn.innerHTML = `<svg class="update-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg><span>Aggiorna Dati</span>`;
            banner.style.display = 'none';
            this.showToast('Aggiornamento via script disponibile solo in locale sul tuo PC.');
          }
          return;
        }
        failCount = 0;
        const data = await res.json();

        const pct = Math.min(100, Math.max(0, data.percent || 0));
        this.dom.progressPercent.textContent = `${pct}%`;
        this.dom.progressBarFill.style.width = `${pct}%`;
        this.dom.progressStatusDesc.textContent = data.message || 'Aggiornamento dati in corso...';

        if (data.status === 'completed' || pct >= 100) {
          clearInterval(this.updatePollInterval);
          this.updatePollInterval = null;
          this.isUpdating = false;

          btn.disabled = false;
          btn.classList.remove('updating');
          btn.innerHTML = `<svg class="update-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg><span>Aggiorna Dati</span>`;

          this.dom.progressStatusDesc.innerHTML = `<span style="color: #4ade80; font-weight: 600;">Aggiornamento completato con successo. Dati applicati.</span>`;

          // CRUCIAL: Only reload and switch data ONCE the job has finished!
          await this.dataService.reload();
          this.render();

          this.showToast('Dati aggiornati con successo.');

          // Auto-hide progress banner after 4 seconds
          setTimeout(() => {
            banner.style.display = 'none';
          }, 4000);
        } else if (data.status === 'error') {
          clearInterval(this.updatePollInterval);
          this.updatePollInterval = null;
          this.isUpdating = false;
          btn.disabled = false;
          btn.classList.remove('updating');
          btn.innerHTML = `<svg class="update-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg><span>Aggiorna Dati</span>`;
          this.dom.progressStatusDesc.innerHTML = `<span style="color: #f87171;">${data.message || 'Errore durante aggiornamento'}</span>`;
        }
      } catch (err) {
        console.warn('Error polling update status:', err);
      }
    }, 400);
  }

  checkTutorial() {
    try {
      const completed = localStorage.getItem('lol_tutorial_completed');
      if (!completed) {
        // First-time visitor: launch the interactive tutorial
        setTimeout(() => {
          this.startTutorial();
        }, 400);
      }
    } catch (e) {}
  }

  startTutorial() {
    this.currentTutorialStep = 0;
    this.dom.tutorialOverlay.style.display = 'flex';
    this.renderTutorialStep();
  }

  renderTutorialStep() {
    const step = this.tutorialSteps[this.currentTutorialStep];
    if (!step) return;

    this.dom.tutorialStepBadge.textContent = step.badge;
    this.dom.tutorialTitle.textContent = step.title;
    this.dom.tutorialText.innerHTML = step.text;

    // Prev / Next button states
    if (this.currentTutorialStep === 0) {
      this.dom.tutorialPrevBtn.style.display = 'none';
    } else {
      this.dom.tutorialPrevBtn.style.display = 'block';
    }

    if (this.currentTutorialStep === this.tutorialSteps.length - 1) {
      this.dom.tutorialNextBtn.textContent = 'Inizia a Giocare!';
    } else {
      this.dom.tutorialNextBtn.textContent = 'Avanti';
    }

    // Update dots
    const dots = this.dom.tutorialDots.querySelectorAll('.tutorial-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === this.currentTutorialStep);
    });

    // Remove any previous target highlight
    document.querySelectorAll('.tutorial-highlight-target').forEach(el => {
      el.classList.remove('tutorial-highlight-target');
    });

    // Highlight current target if available
    if (step.target) {
      const targetEl = document.querySelector(step.target);
      if (targetEl) {
        targetEl.classList.add('tutorial-highlight-target');
        const headerOffset = 90;
        const elementPosition = targetEl.getBoundingClientRect().top + window.scrollY;
        const offsetPosition = elementPosition - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });

        // Track spotlight cutout position immediately and after smooth scroll
        this.updateSpotlightPosition();
        setTimeout(() => this.updateSpotlightPosition(), 120);
        setTimeout(() => this.updateSpotlightPosition(), 300);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.updateSpotlightPosition();
    }
  }

  updateSpotlightPosition() {
    if (!this.dom.tutorialOverlay || this.dom.tutorialOverlay.style.display === 'none') {
      if (this.dom.tutorialSpotlight) this.dom.tutorialSpotlight.style.display = 'none';
      return;
    }
    const step = this.tutorialSteps[this.currentTutorialStep];
    const spot = this.dom.tutorialSpotlight;
    if (!step || !step.target) {
      if (spot) spot.style.display = 'none';
      this.dom.tutorialOverlay.style.background = 'rgba(5, 7, 10, 0.7)';
      return;
    }

    const targetEl = document.querySelector(step.target);
    if (!targetEl || !spot) {
      if (spot) spot.style.display = 'none';
      return;
    }

    const rect = targetEl.getBoundingClientRect();
    const pad = 6;
    spot.style.display = 'block';
    spot.style.top = `${Math.max(0, rect.top - pad)}px`;
    spot.style.left = `${Math.max(0, rect.left - pad)}px`;
    spot.style.width = `${rect.width + (pad * 2)}px`;
    spot.style.height = `${rect.height + (pad * 2)}px`;
    this.dom.tutorialOverlay.style.background = 'transparent';
  }

  nextTutorialStep() {
    if (this.currentTutorialStep < this.tutorialSteps.length - 1) {
      this.currentTutorialStep++;
      this.renderTutorialStep();
    } else {
      this.closeTutorial();
    }
  }

  prevTutorialStep() {
    if (this.currentTutorialStep > 0) {
      this.currentTutorialStep--;
      this.renderTutorialStep();
    }
  }

  closeTutorial() {
    this.dom.tutorialOverlay.style.display = 'none';
    if (this.dom.tutorialSpotlight) {
      this.dom.tutorialSpotlight.style.display = 'none';
    }
    this.dom.tutorialOverlay.style.background = 'rgba(5, 7, 10, 0.7)';
    document.querySelectorAll('.tutorial-highlight-target').forEach(el => {
      el.classList.remove('tutorial-highlight-target');
    });
    try {
      localStorage.setItem('lol_tutorial_completed', 'true');
    } catch (e) {}
  }

  loadPoolForRole(role) {
    this.userPool = this.dataService.getUserPool(role);
  }

  applyFavoritePool(showToast = true) {
    const favs = this.dataService.getFavoritePool(this.currentRole);
    if (!favs || favs.length === 0) {
      if (showToast) {
        this.showToast(`Nessun preferito salvato per ${this.currentRole.toUpperCase()}. Aggiungi campioni e clicca 'Salva nei Preferiti'.`);
      }
      return;
    }
    this.userPool = favs;
    this.savePool();
    this.render();
    if (showToast) {
      this.showToast(`Pool preferiti ${this.currentRole.toUpperCase()} caricato (${favs.length} campioni).`);
    }
  }

  savePool() {
    this.dataService.saveUserPool(this.currentRole, this.userPool);
  }

  showToast(message) {
    const toast = this.dom.toastNotification;
    toast.textContent = message;
    toast.classList.add('show');

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }

  addToPool(champId) {
    champId = String(champId);
    const champ = this.dataService.getChampionInfo(champId);
    if (!this.dataService.hasLaneMatchups(champId, this.currentRole)) {
      this.showToast(`${champ?.name || 'Questo campione'} non ha dati di matchup in corsia ${this.currentRole.toUpperCase()}.`);
      return;
    }
    if (!this.userPool.includes(champId)) {
      this.userPool.push(champId);
      this.savePool();
      this.render();
      this.showToast(`Aggiunto ${champ?.name || 'Campione'} al pool ${this.currentRole.toUpperCase()}.`);
    }
    this.dom.addPoolModal.style.display = 'none';
  }

  removeFromPool(champId) {
    champId = String(champId);
    this.userPool = this.userPool.filter(id => id !== champId);
    this.savePool();
    this.render();
  }

  clearPool() {
    if (this.userPool.length === 0) {
      this.showToast('Il pool è già vuoto.');
      return;
    }
    const count = this.userPool.length;
    this.userPool = [];
    this.savePool();
    this.render();
    this.showToast(`Rimossi ${count} campioni. Pool ${this.currentRole.toUpperCase()} svuotato.`);
  }

  render() {
    this.renderCoverageAndTable();
    this.populateDatalist();
  }

  renderPoolBar(bestCounts = {}, bestWinningCounts = {}) {
    this.dom.poolCount.textContent = `${this.userPool.length} Campioni`;
    this.dom.poolChampionsList.innerHTML = '';

    const isFav = this.dataService.isPoolFavorite(this.currentRole, this.userPool);
    if (isFav) {
      this.dom.btnSaveFavorites.classList.add('saved-active');
      this.dom.btnSaveFavorites.innerHTML = `<span>Preferiti Salvati</span>`;
    } else {
      this.dom.btnSaveFavorites.classList.remove('saved-active');
      this.dom.btnSaveFavorites.innerHTML = `<span>Salva nei Preferiti</span>`;
    }

    if (this.userPool.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-pool-message';
      emptyMsg.innerHTML = `<span>Nessun campione nel pool. Usa <strong>Aggiungi Campione</strong> o <strong>Imposta Preferiti</strong> per iniziare.</span>`;
      this.dom.poolChampionsList.appendChild(emptyMsg);
      return;
    }

    this.userPool.forEach(champId => {
      const info = this.dataService.getChampionInfo(champId);
      const meta = this.dataService.getChampionRoleMeta(champId, this.currentRole);
      if (!info) return;

      const card = document.createElement('div');
      card.className = 'pool-champ-card';

      const tierBadge = meta ? `<span class="pool-champ-tier tier-${meta.tier.toLowerCase().replace('+', 'plus')}">${meta.tier}</span>` : '';
      const wrText = meta ? `<span style="font-size: 11px; color: var(--text-muted);">${meta.winrate}% WR</span>` : '';

      const count = (bestCounts && bestCounts[champId] !== undefined) ? bestCounts[champId] : 0;
      const winCount = (bestWinningCounts && bestWinningCounts[champId] !== undefined) ? bestWinningCounts[champId] : 0;
      const bestBadge = `<span class="pool-champ-best-tag" title="Miglior pick del tuo pool contro ${count} avversari (${winCount} con WR > 50%)">Best vs <strong>${count}</strong></span>`;

      card.innerHTML = `
        <img class="pool-champ-img" src="${this.dataService.getChampionImageUrl(info.image)}" alt="${info.name}">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="pool-champ-name">${info.name}</span>
            ${tierBadge}
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${wrText}
            ${bestBadge}
          </div>
        </div>
        <button class="btn-remove-pool" title="Rimuovi dal pool" data-id="${champId}">&times;</button>
      `;

      card.querySelector('.btn-remove-pool').addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeFromPool(champId);
      });

      this.dom.poolChampionsList.appendChild(card);
    });
  }

  renderCoverageAndTable() {
    const matrixData = this.engine.computeMatrix(
      this.currentRole,
      this.currentRank,
      this.userPool,
      this.filterMode,
      this.searchQuery,
      this.tableSort
    );

    // Update pool bar with computed best pick counts
    this.renderPoolBar(matrixData.bestCounts, matrixData.bestWinningCounts);

    // Update Coverage Gauge (Single Coverage)
    const hasPool = this.userPool.length > 0;
    const pct = hasPool ? matrixData.stats.coveragePct : 0;
    this.dom.gaugeCircle.style.setProperty('--coverage-pct', pct);
    this.dom.gaugeVal.textContent = `${pct}%`;
    this.dom.coverageStats.textContent = hasPool 
      ? `${matrixData.stats.coveredCount} coperti • ${matrixData.stats.uncoveredCount} scoperti`
      : '0 coperti • Pool vuoto';
    this.dom.uncoveredCountBadge.textContent = hasPool ? matrixData.stats.uncoveredCount : 0;

    // Update Double Coverage Gauge (Anti-Ban: 2+ Picks)
    if (this.dom.doubleGaugeCircle) {
      const dblPct = hasPool ? matrixData.stats.doubleCoveragePct : 0;
      this.dom.doubleGaugeCircle.style.setProperty('--coverage-pct', dblPct);
      this.dom.doubleGaugeVal.textContent = `${dblPct}%`;
      this.dom.doubleCoverageStats.textContent = hasPool 
        ? `${matrixData.stats.doubleCoveredCount} con 2° pick anti-ban`
        : '0 con 2° pick anti-ban';
      if (this.dom.uncoveredDoubleCountBadge) {
        this.dom.uncoveredDoubleCountBadge.textContent = hasPool ? matrixData.stats.uncoveredDoubleCount : 0;
      }
    }

    // Render Uncovered Chips depending on active tab
    this.dom.uncoveredChips.innerHTML = '';
    if (!hasPool) {
      this.dom.uncoveredChips.innerHTML = `<span style="font-size: 12px; color: var(--text-muted); padding: 6px 0;">Il tuo pool è vuoto. Clicca su <strong>+ Aggiungi Campione</strong> per visualizzare i blind spot.</span>`;
    } else if (this.uncoveredTabMode === 'uncovered') {
      if (matrixData.uncoveredOpponents.length === 0) {
        this.dom.uncoveredChips.innerHTML = `<span style="font-size: 13px; color: #4ade80;">Copertura completa: tutti i ${matrixData.stats.totalOpponents} campioni della corsia ${this.currentRole.toUpperCase()} sono coperti con WR &gt; 50%.</span>`;
      } else {
        matrixData.uncoveredOpponents.forEach(unc => {
          const chip = document.createElement('div');
          chip.className = 'uncovered-chip';
          const bestText = unc.bestWinrate ? `Max ${unc.bestWinrate}%` : 'Nessun Dato';
          chip.title = `Nessun pick >50% WR nel pool. Meno svantaggiato: ${unc.bestPick?.champion?.name || 'Nessuno'} (${bestText})`;
          chip.innerHTML = `
            <img src="${this.dataService.getChampionImageUrl(unc.enemy.image)}" alt="${unc.enemy.name}">
            <span>${unc.enemy.name}</span>
            <span class="chip-wr">${bestText}</span>
          `;
          chip.addEventListener('click', () => {
            this.dom.quickPickInput.value = unc.enemy.name;
            this.handleQuickPick(unc.enemy.name);
          });
          this.dom.uncoveredChips.appendChild(chip);
        });
      }
    } else {
      // Uncovered Double (Anti-Ban Vulnerable: 0 or only 1 winning pick)
      if (matrixData.uncoveredDoubleOpponents.length === 0) {
        this.dom.uncoveredChips.innerHTML = `<span style="font-size: 13px; color: #4ade80;">Doppia copertura completa: tutti i ${matrixData.stats.totalOpponents} campioni hanno almeno 2 pick vincenti anti-ban!</span>`;
      } else {
        matrixData.uncoveredDoubleOpponents.forEach(unc => {
          const chip = document.createElement('div');
          chip.className = 'uncovered-chip chip-warning';
          const pickLabel = unc.winningPicksCount === 1 ? '1 solo pick' : '0 pick';
          const titleText = `1°: ${unc.bestPick?.champion?.name || 'Nessuno'} (${unc.bestWinrate || 'N/D'}%) • 2°: ${unc.secondPick?.champion?.name || 'Nessuno'} (${unc.secondWinrate || 'N/D'}%)`;
          chip.title = `${unc.enemy.name}: ${pickLabel}. ${titleText}`;
          chip.innerHTML = `
            <img src="${this.dataService.getChampionImageUrl(unc.enemy.image)}" alt="${unc.enemy.name}">
            <span>${unc.enemy.name}</span>
            <span class="chip-wr">${pickLabel}</span>
          `;
          chip.addEventListener('click', () => {
            this.dom.quickPickInput.value = unc.enemy.name;
            this.handleQuickPick(unc.enemy.name);
          });
          this.dom.uncoveredChips.appendChild(chip);
        });
      }
    }

    // Render Smart Recommendations strictly for this lane (full ranked scrollable list)
    const recommendations = this.engine.getCoverageRecommendations(
      this.currentRole,
      this.currentRank,
      this.userPool,
      hasPool ? matrixData.uncoveredOpponents : [],
      hasPool ? matrixData.uncoveredDoubleOpponents : [],
      null
    );

    if (this.dom.recomCountBadge) {
      this.dom.recomCountBadge.textContent = !hasPool
        ? 'Migliori Meta Pick'
        : recommendations.length > 0 
        ? `${recommendations.length} Consigliati (In Ordine)` 
        : 'Migliori in Ordine';
    }

    this.dom.recomContent.innerHTML = '';

    if (recommendations.length > 0) {
      const listEl = document.createElement('div');
      listEl.className = 'recom-list';

      recommendations.forEach((rec, idx) => {
        const item = document.createElement('div');
        item.className = 'recom-item';

        const tierClass = rec.champion.tier ? `tier-${rec.champion.tier.toLowerCase().replace('+', 'plus')}` : 'tier-b';
        let benefitHtml = '';

        if (!hasPool) {
          benefitHtml = `Top Meta Pick (${rec.champion.winrate}% WR • ${rec.champion.pickrate}% Pick)`;
        } else if (rec.singleCoversCount > 0 && rec.doubleCoversCount > 0) {
          const sNames = rec.singleCovered.slice(0, 2).join(', ');
          const sExtra = rec.singleCovered.length > 2 ? ` +${rec.singleCovered.length - 2}` : '';
          benefitHtml = `Copre <strong>+${rec.singleCoversCount}</strong> scoperti (${sNames}${sExtra}) e <strong>+${rec.doubleCoversCount}</strong> anti-ban`;
        } else if (rec.singleCoversCount > 0) {
          const sNames = rec.singleCovered.slice(0, 3).join(', ');
          const sExtra = rec.singleCovered.length > 3 ? ` +${rec.singleCovered.length - 3}` : '';
          benefitHtml = `Copre <strong>+${rec.singleCoversCount}</strong> scoperti (${sNames}${sExtra})`;
        } else if (rec.doubleCoversCount > 0) {
          const dNames = rec.doubleCovered.slice(0, 3).join(', ');
          const dExtra = rec.doubleCovered.length > 3 ? ` +${rec.doubleCovered.length - 3}` : '';
          benefitHtml = `Copre <strong>+${rec.doubleCoversCount}</strong> anti-ban (${dNames}${dExtra})`;
        } else {
          benefitHtml = `Meta Pick (${rec.champion.winrate}% WR • ${rec.champion.pickrate}% Pick)`;
        }

        item.innerHTML = `
          <div class="recom-item-left">
            <span class="recom-rank-num">#${idx + 1}</span>
            <img class="recom-avatar" src="${this.dataService.getChampionImageUrl(rec.champion.image)}" alt="${rec.champion.name}">
            <div class="recom-info">
              <div class="recom-champ-row">
                <span class="recom-champ-name">${rec.champion.name}</span>
                <span class="tier-badge ${tierClass}">${rec.champion.tier || 'A'}</span>
                <span class="recom-wr-tag">${rec.champion.winrate}% WR</span>
              </div>
              <div class="recom-benefit">${benefitHtml}</div>
            </div>
          </div>
          <button class="btn-add-recom" data-key="${rec.champion.key}" title="Aggiungi ${rec.champion.name} al pool">+ Aggiungi</button>
        `;

        item.querySelector('.btn-add-recom').addEventListener('click', (e) => {
          e.stopPropagation();
          this.addToPool(rec.champion.key);
        });

        listEl.appendChild(item);
      });

      this.dom.recomContent.appendChild(listEl);
    } else {
      this.dom.recomContent.innerHTML = `<div class="recom-optimal-message">Copertura ottimale: tutti i campioni della corsia ${this.currentRole.toUpperCase()} sono coperti con WR &gt; 50%.</div>`;
    }

    // Render Double-Entry Table
    this.renderTableWithData(matrixData);
  }

  renderTable() {
    const matrixData = this.engine.computeMatrix(
      this.currentRole,
      this.currentRank,
      this.userPool,
      this.filterMode,
      this.searchQuery,
      this.tableSort
    );
    this.renderPoolBar(matrixData.bestCounts, matrixData.bestWinningCounts);
    this.renderTableWithData(matrixData);
  }

  renderTableWithData(matrixData) {
    const sortLabel = this.tableSort === 'name_asc' ? '(A-Z) ↓' : this.tableSort === 'name_desc' ? '(Z-A) ↓' : '↓';
    // Header Row: Columns = User Pool
    this.dom.matrixHeaderRow.innerHTML = `
      <th class="corner-header">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <span style="font-size: 11px; text-transform: uppercase; color: var(--border-gold); font-weight: 700;">Avversario ${this.currentRole.toUpperCase()} ${sortLabel}</span>
          <span style="font-size: 10px; text-transform: uppercase; color: #86efac; font-weight: 600; letter-spacing: 0.3px;">I 2 Migliori (1° e 2°)</span>
        </div>
        <div style="font-size: 11px; text-transform: uppercase; color: var(--teal-accent);">I tuoi Campioni (Colonna) →</div>
      </th>
    `;

    matrixData.userPoolChamps.forEach(myChamp => {
      const meta = this.dataService.getChampionRoleMeta(myChamp.key, this.currentRole);
      const champKey = String(myChamp.key);
      const count = (matrixData.bestCounts && matrixData.bestCounts[champKey] !== undefined) ? matrixData.bestCounts[champKey] : 0;
      const winCount = (matrixData.bestWinningCounts && matrixData.bestWinningCounts[champKey] !== undefined) ? matrixData.bestWinningCounts[champKey] : 0;

      const th = document.createElement('th');
      th.innerHTML = `
        <div class="header-champ-card">
          <img class="header-champ-img" src="${this.dataService.getChampionImageUrl(myChamp.image)}" alt="${myChamp.name}">
          <span class="header-champ-name">${myChamp.name}</span>
          <div class="header-champ-stats">
            ${meta ? `<span class="tier-badge tier-${meta.tier.toLowerCase().replace('+', 'plus')}">${meta.tier}</span>` : ''}
            ${meta ? `<span style="font-size: 11px; color: var(--text-muted);">${meta.winrate}%</span>` : ''}
            <span class="col-best-badge" title="Miglior pick nel tuo pool contro ${count} avversari di corsia (${winCount} con WR > 50%)">Best vs <strong>${count}</strong></span>
          </div>
        </div>
      `;
      this.dom.matrixHeaderRow.appendChild(th);
    });

    if (matrixData.userPoolChamps.length === 0) {
      const th = document.createElement('th');
      th.style.padding = '16px 20px';
      th.style.color = 'var(--text-muted)';
      th.style.fontWeight = '400';
      th.style.fontSize = '12px';
      th.innerHTML = `<span>Pool vuoto — Clicca <strong>Aggiungi Campione</strong> o <strong>Imposta Preferiti</strong> per visualizzare i matchup</span>`;
      this.dom.matrixHeaderRow.appendChild(th);
    }

    // Body: Rows = Opponents (strictly lane champions)
    this.dom.matrixBody.innerHTML = '';

    if (matrixData.rows.length === 0) {
      const emptyRow = document.createElement('tr');
      const colSpan = Math.max(2, matrixData.userPoolChamps.length + 1);
      emptyRow.innerHTML = `<td colspan="${colSpan}" style="padding: 40px; color: var(--text-muted);">Nessun campione di ${this.currentRole.toUpperCase()} trovato con i filtri correnti.</td>`;
      this.dom.matrixBody.appendChild(emptyRow);
      return;
    }

    matrixData.rows.forEach(row => {
      const tr = document.createElement('tr');

      // Left sticky cell: Opponent Info
      const enemy = row.enemy;
      
      // Render the top 2 best picks in order (1° and 2° Anti-Ban)
      let bestPicksHtml = '';
      if (!row.hasData) {
        bestPicksHtml = `<span class="opponent-best-pick-tag no-data">Nessun Dato</span>`;
      } else if (row.bestPick && row.bestPick.champion) {
        const top1 = row.bestPick;
        const top2 = row.secondPick;

        const isWin1 = top1.winrate >= 50.0;
        const tagClass1 = isWin1 ? 'covered' : 'uncovered';

        const item1 = `
          <div class="opponent-best-pick-tag ${tagClass1}" title="1° Miglior pick: ${top1.champion.name} (${top1.winrate}% WR)">
            <span class="pick-order-tag">1°</span>
            <img class="mini-best-avatar" src="${this.dataService.getChampionImageUrl(top1.champion.image)}" alt="${top1.champion.name}">
            <span class="best-pick-name">${top1.champion.name}</span>
            <span class="best-pick-wr">${top1.winrate}%</span>
          </div>
        `;

        let item2 = '';
        if (top2 && top2.champion) {
          const isWin2 = top2.winrate >= 50.0;
          const tagClass2 = isWin2 ? 'covered' : 'uncovered';
          const title2 = isWin2
            ? `2° Miglior pick (Anti-Ban coperto): ${top2.champion.name} (${top2.winrate}% WR)`
            : `2° Miglior pick (Sotto il 50%): ${top2.champion.name} (${top2.winrate}% WR)`;

          item2 = `
            <div class="opponent-best-pick-tag ${tagClass2}" title="${title2}">
              <span class="pick-order-tag">2°</span>
              <img class="mini-best-avatar" src="${this.dataService.getChampionImageUrl(top2.champion.image)}" alt="${top2.champion.name}">
              <span class="best-pick-name">${top2.champion.name}</span>
              <span class="best-pick-wr">${top2.winrate}%</span>
            </div>
          `;
        }

        bestPicksHtml = `
          <div class="opponent-picks-stack">
            ${item1}
            ${item2}
          </div>
        `;
      } else {
        bestPicksHtml = `<span class="opponent-best-pick-tag no-data">Nessun Pick</span>`;
      }

      let tdOpponent = document.createElement('td');
      tdOpponent.className = 'opponent-cell';
      tdOpponent.style.cursor = 'pointer';
      tdOpponent.title = this.currentLang === 'en' ? `Click to see best counters vs ${enemy.name}` : `Clicca per vedere i migliori counter contro ${enemy.name}`;
      tdOpponent.addEventListener('click', () => this.openCounterModal(enemy.key));
      tdOpponent.style.cursor = 'pointer';
      tdOpponent.title = `Clicca per selezionare ${enemy.name} in Quick Pick`;
      tdOpponent.innerHTML = `
        <div class="opponent-info">
          <div class="opponent-main">
            <img class="opponent-img" src="${this.dataService.getChampionImageUrl(enemy.image)}" alt="${enemy.name}">
            <div class="opponent-name-group">
              <span class="opponent-name">${enemy.name}</span>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span class="tier-badge tier-${enemy.tier.toLowerCase().replace('+', 'plus')}">${enemy.tier}</span>
                <span class="opponent-role-stats">${enemy.winrate}% WR • ${enemy.pickrate}% Pick</span>
              </div>
            </div>
          </div>
          <div>${bestPicksHtml}</div>
        </div>
      `;

      // Clicking opponent cell triggers Quick Pick
      tdOpponent.addEventListener('click', () => {
        this.dom.quickPickInput.value = enemy.name;
        this.handleQuickPick(enemy.name);
      });

      tr.appendChild(tdOpponent);

      if (matrixData.userPoolChamps.length === 0) {
        const tdEmpty = document.createElement('td');
        tdEmpty.style.padding = '12px 20px';
        tdEmpty.style.color = 'var(--text-muted)';
        tdEmpty.style.fontSize = '12px';
        tdEmpty.style.textAlign = 'center';
        tdEmpty.textContent = '—';
        tr.appendChild(tdEmpty);
      }

      // Matchup Intersection Cells
      matrixData.userPoolChamps.forEach(myChamp => {
        const stat = row.cells[myChamp.key] || { winrate: null, noData: true };
        const td = document.createElement('td');
        td.className = 'matrix-cell';

        const isMirror = String(myChamp.key) === String(enemy.key);
        const isBestPick = row.bestPick && String(row.bestPick.champion.key) === String(myChamp.key) && stat.winrate > 50.0;

        if (isMirror) {
          td.classList.add('mirror-match');
          td.textContent = 'Mirror';
        } else if (stat.noData || stat.winrate === null) {
          td.classList.add('no-data');
          td.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;">N/D</span>`;
          td.title = `Nessuna partita registrata in corsia ${this.currentRole.toUpperCase()}`;
        } else {
          // Color grading strictly based on whether MY champion has advantage against this enemy
          if (stat.winrate >= 53.0) td.classList.add('wr-great');
          else if (stat.winrate > 50.0) td.classList.add('wr-good');
          else if (stat.winrate === 50.0) td.classList.add('wr-even');
          else if (stat.winrate >= 47.0) td.classList.add('wr-bad');
          else td.classList.add('wr-worst');

          td.innerHTML = `
            ${Number(stat.winrate).toFixed(1)}%
            ${isBestPick ? '<span class="best-pick-indicator" title="Miglior pick nel tuo pool contro questo avversario"></span>' : ''}
          `;
        }

        // Tooltip events
        td.addEventListener('mouseenter', (e) => {
          this.showTooltip(e, myChamp, enemy, stat);
        });
        td.addEventListener('mouseleave', () => {
          this.hideTooltip();
        });

        // Click on matrix cell opens YouTube video search: [Campione Pool] Top vs [Campione Avversario]
        td.addEventListener('click', () => {
          const lane = (this.currentRole || 'top').toLowerCase() === 'adc'
            ? 'ADC'
            : (this.currentRole || 'top').toLowerCase() === 'supp'
            ? 'Support'
            : ((this.currentRole || 'top').charAt(0).toUpperCase() + (this.currentRole || 'top').slice(1));
          const query = `${myChamp.name} ${lane} vs ${enemy.name}`;
          const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
          window.open(url, '_blank', 'noopener,noreferrer');
          this.showToast(`Ricerca video: "${query}" su YouTube`);
        });

        tr.appendChild(td);
      });

      this.dom.matrixBody.appendChild(tr);
    });
  }

  showTooltip(event, myChamp, enemy, stat) {
    const tt = this.dom.detailTooltip;
    this.dom.tooltipTitle.textContent = `${myChamp.name} (Tu) vs ${enemy.name} (Avversario) • ${this.currentRole.toUpperCase()}`;

    if (stat.noData || stat.winrate === null) {
      this.dom.tooltipWinrate.textContent = 'N/D (Nessun dato registrato)';
      this.dom.tooltipMatches.textContent = `0 partite in corsia ${this.currentRole.toUpperCase()}`;
      this.dom.tooltipGold.textContent = 'N/D';
      this.dom.tooltipCs.textContent = 'N/D';
      this.dom.tooltipXp.textContent = 'N/D';
    } else {
      this.dom.tooltipWinrate.textContent = `${Number(stat.winrate).toFixed(2)}%`;
      this.dom.tooltipMatches.textContent = stat.matches ? stat.matches.toLocaleString() : 'N/D';

      const goldDiffEl = this.dom.tooltipGold;
      goldDiffEl.textContent = (stat.goldDiff > 0 ? `+${stat.goldDiff}` : stat.goldDiff) || '0';
      goldDiffEl.className = stat.goldDiff > 0 ? 'tooltip-val-positive' : stat.goldDiff < 0 ? 'tooltip-val-negative' : '';

      const csDiffEl = this.dom.tooltipCs;
      csDiffEl.textContent = (stat.csDiff > 0 ? `+${stat.csDiff}` : stat.csDiff) || '0';
      csDiffEl.className = stat.csDiff > 0 ? 'tooltip-val-positive' : stat.csDiff < 0 ? 'tooltip-val-negative' : '';

      const xpDiffEl = this.dom.tooltipXp;
      xpDiffEl.textContent = (stat.xpDiff > 0 ? `+${stat.xpDiff}` : stat.xpDiff) || '0';
      xpDiffEl.className = stat.xpDiff > 0 ? 'tooltip-val-positive' : stat.xpDiff < 0 ? 'tooltip-val-negative' : '';
    }

    const rect = event.target.getBoundingClientRect();
    tt.style.display = 'block';
    tt.style.top = `${window.scrollY + rect.bottom + 8}px`;
    tt.style.left = `${Math.min(window.innerWidth - 220, window.scrollX + rect.left)}px`;
  }

  hideTooltip() {
    this.dom.detailTooltip.style.display = 'none';
  }

  populateDatalist() {
    const list = this.dataService.getRoleChampions(this.currentRole);
    this.dom.opponentsDatalist.innerHTML = '';
    list.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.name;
      this.dom.opponentsDatalist.appendChild(opt);
    });
  }

  handleQuickPick(nameQuery) {
    if (!nameQuery || nameQuery.trim().length === 0) {
      this.dom.quickPickResult.style.display = 'none';
      return;
    }

    const list = this.dataService.getRoleChampions(this.currentRole);
    const enemy = list.find(c => c.name.toLowerCase() === nameQuery.toLowerCase().trim());
    if (!enemy) {
      this.dom.quickPickResult.style.display = 'none';
      return;
    }

    const advice = this.engine.getDraftAdvice(
      enemy.key,
      this.userPool,
      this.currentRole,
      this.currentRank
    );

    if (!advice || !advice.bestPick) {
      const resEl = this.dom.quickPickResult;
      resEl.className = 'quick-pick-result danger';
      resEl.innerHTML = `
        <div>
          <div style="font-size: 14px; font-weight: 600; color: #f87171;">
            Nessun dato registrato contro ${enemy.name} in corsia ${this.currentRole.toUpperCase()}.
          </div>
        </div>
      `;
      resEl.style.display = 'flex';
      return;
    }

    const best = advice.bestPick;
    const isSafe = advice.isCovered;
    const resEl = this.dom.quickPickResult;

    resEl.className = `quick-pick-result ${isSafe ? '' : 'danger'}`;
    resEl.innerHTML = `
      <img src="${this.dataService.getChampionImageUrl(best.champion.image)}" style="width: 38px; height: 38px; border-radius: 6px; border: 2px solid ${isSafe ? 'var(--wr-great)' : 'var(--wr-worst)'};">
      <div>
        <div style="font-size: 14px; font-weight: 600;">
          ${isSafe ? 'Miglior pick consigliato:' : 'Matchup sfavorevole:'} 
          <span style="color: #fff;">${best.champion.name}</span> (${Number(best.winrate).toFixed(1)}% WR)
        </div>
        <div style="font-size: 12px; color: var(--text-muted);">
          ${best.goldDiff ? `Vantaggio medio: ${best.goldDiff > 0 ? '+' : ''}${best.goldDiff} Gold @15m • ` : ''}
          ${advice.matchups.length > 1 ? `Alternative: ${advice.matchups.slice(1, 3).map(m => `${m.champion.name} (${Number(m.winrate).toFixed(1)}%)`).join(', ')}` : ''}
        </div>
      </div>
    `;
    resEl.style.display = 'flex';
  }

  openAddModal() {
    this.dom.modalSearchInput.value = '';
    this.renderModalGrid('');
    this.dom.addPoolModal.style.display = 'flex';
    this.dom.modalSearchInput.focus();
  }

  renderModalGrid(searchQuery) {
    const list = this.dataService.getRoleChampions(this.currentRole);
    const grid = this.dom.modalChampGrid;
    grid.innerHTML = '';

    const q = searchQuery.toLowerCase().trim();
    const filtered = list.filter(c => !q || c.name.toLowerCase().includes(q));

    filtered.forEach(c => {
      const inPool = this.userPool.includes(String(c.key));
      const card = document.createElement('div');
      card.className = `modal-champ-item ${inPool ? 'in-pool' : ''}`;
      card.innerHTML = `
        <img src="${this.dataService.getChampionImageUrl(c.image)}" alt="${c.name}">
        <span class="modal-champ-name">${c.name}</span>
        <div style="display: flex; gap: 4px; align-items: center;">
          <span class="tier-badge tier-${c.tier.toLowerCase().replace('+', 'plus')}">${c.tier}</span>
          <span style="font-size: 11px; color: var(--text-muted);">${c.winrate}%</span>
        </div>
        <span style="font-size: 10px; color: ${inPool ? 'var(--text-muted)' : 'var(--teal-accent)'};">
          ${inPool ? 'Già nel pool' : '+ Aggiungi'}
        </span>
      `;

      if (!inPool) {
        card.addEventListener('click', () => {
          this.addToPool(c.key);
        });
      }

      grid.appendChild(card);
    });
  }
}

// Start app once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
