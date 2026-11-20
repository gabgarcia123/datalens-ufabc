/**
 * DataLens — Content Script de Mediação Ativa (Injetado em Sites Reais)
 * 1. Detecta coleta de dados sensíveis no DOM (CPF, cartão, senha, geolocalização, câmera, rastreadores externos)
 * 2. Localiza e rejeita automaticamente banners de cookies reais (OneTrust, Cookiebot, LGPD/GDPR)
 * 3. Exibe o Cartão de Síntese Veloz (5s) sem Dark Patterns quando dados sensíveis/alto risco são detectados
 * 4. Sincroniza em tempo real se a aba aberta for o próprio Dashboard do DataLens
 * UFABC • Interação Humano-Computador (2026) • Grupo DataLens (GC5)
 */

(function () {
  // Evita múltipla injeção na mesma página
  if (window.__DATALENS_CONTENT_LOADED__) return;
  window.__DATALENS_CONTENT_LOADED__ = true;

  // ============================================================================
  // A) PONTE DE SINCRONIZAÇÃO QUANDO O USUÁRIO ABRE O DASHBOARD (index.html)
  // ============================================================================
  const isDataLensDashboard =
    document.title.includes("DataLens") ||
    window.location.pathname.endsWith("/datalens-ufabc/index.html") ||
    Boolean(document.getElementById("kpi-total-sites"));

  if (isDataLensDashboard) {
    // Injeta os sites reais auditados pela extensão dentro do Dashboard!
    function syncExtensionToDashboard() {
      chrome.runtime.sendMessage({ type: "GET_DASHBOARD_DATA" }, (response) => {
        if (!response || !response.ok) return;
        window.postMessage(
          {
            source: "DATALENS_EXTENSION",
            type: "EXTENSION_STATE_SYNC",
            payload: {
              realSites: response.sites || [],
              preferences: response.preferences
            }
          },
          "*"
        );
      });
    }

    syncExtensionToDashboard();

    // Escuta ações disparadas pelo usuário dentro do Dashboard para apagar cookies reais no navegador
    window.addEventListener("message", (event) => {
      if (!event.data || event.data.source !== "DATALENS_WEB_APP") return;

      if (event.data.type === "DASHBOARD_COOKIE_ACTION") {
        const { domain, url, mode } = event.data.payload;
        chrome.runtime.sendMessage(
          { type: "CLEAR_SITE_COOKIES", domain, url, mode },
          () => syncExtensionToDashboard()
        );
      } else if (event.data.type === "DASHBOARD_PREFS_UPDATE") {
        chrome.runtime.sendMessage({
          type: "SAVE_PREFERENCES",
          preferences: event.data.payload
        });
      } else if (event.data.type === "DASHBOARD_BULK_PROTECT") {
        chrome.runtime.sendMessage({ type: "PROTECT_ALL_REAL_SITES" }, () =>
          syncExtensionToDashboard()
        );
      } else if (event.data.type === "DASHBOARD_RESET_SITES") {
        chrome.runtime.sendMessage({ type: "RESET_REAL_SITES" }, () =>
          syncExtensionToDashboard()
        );
      }
    });

    // Atualiza o Dashboard automaticamente sempre que o storage da extensão mudar
    chrome.storage.onChanged.addListener(() => {
      syncExtensionToDashboard();
    });

    return; // Não exibe pop-up de alerta sobre o próprio Dashboard
  }

  // ============================================================================
  // B) DETECÇÃO DE DADOS SENSÍVEIS E RASTREADORES DE TERCEIROS NA PÁGINA REAL
  // ============================================================================
  function scanPagePrivacySignals() {
    const currentHost = window.location.hostname.replace(/^www\./, "").toLowerCase();
    const thirdPartyDomains = new Set();

    // 1. Inspeciona scripts e iframes externos carregados pela página
    document.querySelectorAll("script[src], iframe[src], img[src]").forEach((el) => {
      const src = el.getAttribute("src") || "";
      if (src.startsWith("http")) {
        try {
          const u = new URL(src);
          const host = u.hostname.replace(/^www\./, "").toLowerCase();
          if (
            host &&
            host !== currentHost &&
            !host.endsWith("." + currentHost) &&
            !currentHost.endsWith("." + host)
          ) {
            // Filtra CDNs puramente estáticas para focar em domínios externos relevantes
            if (!host.includes("gstatic.com") && !host.includes("cloudflare.com")) {
              thirdPartyDomains.add(host);
            }
          }
        } catch (e) {}
      }
    });

    // 2. Detecta campos de entrada de Dados Sensíveis no DOM (LGPD Art. 5º / Dados Críticos)
    const sensitiveFields = [];
    const seenLabels = new Set();

    const addSensitive = (label, category = "thirdParty") => {
      if (!seenLabels.has(label)) {
        seenLabels.add(label);
        sensitiveFields.push({ label, category });
      }
    };

    // Verifica inputs de senha, cartão, CPF/documento, telefone, saúde/biometria e e-mail
    document.querySelectorAll("input, select, textarea").forEach((input) => {
      const type = (input.getAttribute("type") || "").toLowerCase();
      const name = (input.getAttribute("name") || "").toLowerCase();
      const id = (input.getAttribute("id") || "").toLowerCase();
      const placeholder = (input.getAttribute("placeholder") || "").toLowerCase();
      const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();
      const combined = `${type} ${name} ${id} ${placeholder} ${autocomplete}`;

      if (type === "password" || combined.includes("senha")) {
        addSensitive("Credenciais / Senha de Acesso", "essential");
      }
      if (
        combined.includes("cc-number") ||
        combined.includes("cardnumber") ||
        combined.includes("cartao") ||
        combined.includes("cvv") ||
        combined.includes("creditcard")
      ) {
        addSensitive("Dados Financeiros / Cartão de Crédito", "thirdParty");
      }
      if (
        combined.includes("cpf") ||
        combined.includes("cnpj") ||
        combined.includes("rg") ||
        combined.includes("passport") ||
        combined.includes("documento")
      ) {
        addSensitive("Documento Pessoal (CPF / RG)", "thirdParty");
      }
      if (
        type === "email" ||
        combined.includes("email") ||
        combined.includes("e-mail")
      ) {
        addSensitive("Endereço de E-mail Pessoal", "marketing");
      }
      if (
        type === "tel" ||
        combined.includes("telefone") ||
        combined.includes("celular") ||
        combined.includes("whatsapp") ||
        combined.includes("phone")
      ) {
        addSensitive("Telefone / Contato Móvel", "marketing");
      }
      if (
        combined.includes("cep") ||
        combined.includes("endereco") ||
        combined.includes("address") ||
        combined.includes("logradouro")
      ) {
        addSensitive("Localização / Endereço Residencial", "thirdParty");
      }
    });

    // Verifica se há scripts conhecidos de gravação de tela / session replay ou fingerprinting
    const scriptsHtml = Array.from(document.querySelectorAll("script"))
      .map((s) => s.src || s.textContent.slice(0, 300))
      .join(" ")
      .toLowerCase();

    if (scriptsHtml.includes("hotjar") || scriptsHtml.includes("clarity.ms") || scriptsHtml.includes("fullstory")) {
      addSensitive("Gravação de Tela e Mapa de Cliques (Session Replay)", "analytics");
    }
    if (scriptsHtml.includes("fbevents.js") || scriptsHtml.includes("connect.facebook.net")) {
      addSensitive("Pixel de Rastreamento Cruzado (Meta/Facebook)", "thirdParty");
    }
    if (scriptsHtml.includes("googletagmanager") || scriptsHtml.includes("doubleclick.net")) {
      addSensitive("Tag de Publicidade Programática (Google/DoubleClick)", "marketing");
    }

    // 3. Verifica presença de Banner de Cookies na página
    const bannerSelectors = [
      "#onetrust-banner-sdk",
      "#CybotCookiebotDialog",
      ".cc-window",
      "[id*='cookie-banner']",
      "[class*='cookie-banner']",
      "[id*='cookie-consent']",
      "[class*='cookie-consent']",
      "[id*='lgpd']",
      "[class*='lgpd']",
      "[aria-label*='cookie' i]"
    ];
    const bannerDetected = bannerSelectors.some((sel) => {
      const el = document.querySelector(sel);
      return el && el.offsetParent !== null;
    });

    return {
      pageTitle: document.title || window.location.hostname,
      thirdPartyDomains: Array.from(thirdPartyDomains),
      sensitiveFields,
      bannerDetected
    };
  }

  // ============================================================================
  // C) FUNÇÃO DE REJEITAR COOKIES AUTOMATICAMENTE NOS BANNERS REAIS DA WEB
  // ============================================================================
  function tryRejectCookieBanners(hideBannerFallback = false) {
    // 1. Seletores diretos dos principais CMPs do mercado (OneTrust, Cookiebot, Quantcast, Didomi, TrustArc, etc.)
    const knownRejectSelectors = [
      "#onetrust-reject-all-handler",
      "#CybotCookiebotDialogBodyButtonDecline",
      ".cc-deny",
      ".qc-cmp2-summary-buttons button[mode='secondary']",
      "#didomi-notice-disagree-button",
      ".truste-button2",
      "button[data-testid*='reject' i]",
      "button[id*='reject' i]",
      "button[class*='reject' i]",
      "button[id*='decline' i]",
      "button[class*='decline' i]"
    ];

    for (const sel of knownRejectSelectors) {
      const btn = document.querySelector(sel);
      if (btn && btn.offsetParent !== null) {
        btn.click();
        return { clicked: true, method: `CMP Padrão (${sel})` };
      }
    }

    // 2. Busca heurística por texto em português, inglês e espanhol em botões/links visíveis
    const rejectKeywords = [
      "rejeitar tudo",
      "rejeitar todos",
      "rejeitar não essenciais",
      "rejeitar não-essenciais",
      "recusar tudo",
      "recusar cookies",
      "recusar",
      "apenas essenciais",
      "somente essenciais",
      "somente necessários",
      "apenas necessários",
      "continuar sem aceitar",
      "reject all",
      "reject non-essential",
      "decline all",
      "decline",
      "only necessary",
      "necessary only",
      "essential only",
      "deny all"
    ];

    const candidates = document.querySelectorAll(
      "button, a[role='button'], input[type='button'], [class*='btn'], [class*='button']"
    );

    for (const el of candidates) {
      if (el.offsetParent === null) continue; // Ignora invisíveis
      const text = (el.innerText || el.value || el.getAttribute("aria-label") || "")
        .trim()
        .toLowerCase();
      if (!text || text.length > 48) continue;

      if (rejectKeywords.some((kw) => text === kw || (kw.length > 8 && text.includes(kw)))) {
        el.click();
        return { clicked: true, method: `Botão "${text.slice(0, 28)}"` };
      }
    }

    // 3. Se solicitado ocultar banners incômodos sem botão de rejeição (Dark Pattern de bloqueio)
    if (hideBannerFallback) {
      const annoyingBanners = document.querySelectorAll(
        "#onetrust-banner-sdk, #CybotCookiebotDialog, [id*='cookie-banner'], [class*='cookie-banner'], [id*='lgpd'], [class*='lgpd']"
      );
      let hidden = 0;
      annoyingBanners.forEach((b) => {
        b.style.setProperty("display", "none", "important");
        hidden++;
      });
      if (hidden > 0) {
        return { clicked: true, method: "Supressão Visual de Dark Pattern" };
      }
    }

    return { clicked: false, method: null };
  }

  // ============================================================================
  // C.2) LIMPEZA DE RASTREADORES EM LOCALSTORAGE E SESSIONSTORAGE
  // ============================================================================
  function cleanWebStorageTrackers() {
    const trackerKeyRegex =
      /(_ga|_gid|__utm|_fbp|_fbc|amplitude|mixpanel|mp_|_hj|hotjar|clarity|_clck|_clsk|criteo|taboola|outbrain|adroll|hubspot|pardot|retarget|pixel|visitor_id|ab_test)/i;
    let removedKeys = 0;

    [window.localStorage, window.sessionStorage].forEach((store) => {
      if (!store) return;
      try {
        const keysToRemove = [];
        for (let i = 0; i < store.length; i++) {
          const k = store.key(i);
          if (k && trackerKeyRegex.test(k)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => {
          store.removeItem(k);
          removedKeys++;
        });
      } catch (e) {}
    });

    return removedKeys;
  }

  // ============================================================================
  // D) CARTÃO DE SÍNTESE VELOZ (5s) FLUTUANTE SOBRE O SITE REAL (SHADOW DOM)
  // ============================================================================
  function renderFloatingDataLensAlert(siteRecord, preferences) {
    // Remove instância anterior se existir
    const oldHost = document.getElementById("datalens-shadow-host");
    if (oldHost) oldHost.remove();

    const host = document.createElement("div");
    host.id = "datalens-shadow-host";
    host.style.cssText =
      "position: fixed; bottom: 20px; right: 20px; z-index: 2147483647; font-family: system-ui, -apple-system, sans-serif;";
    (document.body || document.documentElement).appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    const isHighRisk = siteRecord.riskLevel === "high";
    const borderColor = isHighRisk ? "rgba(239, 68, 68, 0.45)" : "#27272A";
    const badgeBg = isHighRisk ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)";
    const badgeColor = isHighRisk ? "#EF4444" : "#F59E0B";

    const sensitiveListHtml =
      siteRecord.sensitiveSignals && siteRecord.sensitiveSignals.length > 0
        ? siteRecord.sensitiveSignals
            .map(
              (s) =>
                `<li style="color:#EF4444; font-weight:600; display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                  <span style="width:6px; height:6px; border-radius:50%; background:#EF4444; display:inline-block; flex-shrink:0;"></span>
                  <span>Dado Sensível: ${s.label}</span>
                </li>`
            )
            .join("")
        : "";

    const collectedItemsHtml = (siteRecord.dataCollected || [])
      .slice(0, 4)
      .map((item) => {
        const dot =
          item.risk === "high"
            ? "#EF4444"
            : item.risk === "medium"
            ? "#F59E0B"
            : "#10B981";
        return `<li style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
          <span style="width:6px; height:6px; border-radius:50%; background:${dot}; display:inline-block; flex-shrink:0;"></span>
          <span>${item.label}</span>
        </li>`;
      })
      .join("");

    shadow.innerHTML = `
      <style>
        .dl-card {
          width: 380px;
          max-width: calc(100vw - 32px);
          background: #09090B;
          color: #FAFAFA;
          border: 1px solid ${borderColor};
          border-radius: 8px;
          padding: 14px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
          font-size: 12px;
          line-height: 1.45;
          animation: dlSlideUp 0.2s ease-out;
        }
        @keyframes dlSlideUp {
          from { transform: translateY(14px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .dl-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #27272A;
          padding-bottom: 9px;
          margin-bottom: 10px;
        }
        .dl-brand {
          display: flex;
          align-items: center;
          gap: 7px;
          font-weight: 700;
          font-size: 13px;
          color: #FAFAFA;
        }
        .dl-badge {
          background: ${badgeBg};
          color: ${badgeColor};
          border: 1px solid ${borderColor};
          padding: 2px 7px;
          border-radius: 5px;
          font-size: 10.5px;
          font-weight: 600;
          font-family: ui-monospace, Consolas, monospace;
        }
        .dl-close {
          background: transparent;
          border: none;
          color: #71717A;
          cursor: pointer;
          font-size: 13px;
          padding: 2px 5px;
        }
        .dl-close:hover { color: #FAFAFA; }
        .dl-section {
          background: #121215;
          border: 1px solid #27272A;
          border-radius: 6px;
          padding: 8px 10px;
          margin-bottom: 8px;
        }
        .dl-sec-title {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #71717A;
          margin-bottom: 5px;
          font-family: ui-monospace, Consolas, monospace;
        }
        .dl-list {
          list-style: none;
          padding: 0;
          margin: 0;
          color: #D4D4D8;
        }
        .dl-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-top: 10px;
        }
        .dl-btn {
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          border: 1px solid #27272A;
          background: #18181B;
          color: #FAFAFA;
          text-align: center;
          transition: all 0.12s;
        }
        .dl-btn:hover {
          background: #27272A;
          border-color: #3F3F46;
        }
        .dl-btn-primary {
          background: #0D9488;
          border-color: #0D9488;
          color: #FFFFFF;
        }
        .dl-btn-primary:hover {
          background: #0F766E;
        }
        .dl-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
          padding-top: 8px;
          border-top: 1px solid #27272A;
          font-size: 11px;
          color: #A1A1AA;
        }
        .dl-link {
          color: #FAFAFA;
          text-decoration: underline;
          cursor: pointer;
          background: none;
          border: none;
          font-size: 11px;
          font-weight: 600;
          padding: 0;
        }
      </style>

      <div class="dl-card" role="dialog" aria-label="Alerta de Privacidade DataLens">
        <div class="dl-header">
          <div class="dl-brand">
            <span style="width:8px; height:8px; border-radius:2px; background:#0D9488; display:inline-block;"></span>
            <span>DataLens · Síntese (5s)</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="dl-badge">${
              isHighRisk ? "ALTO RISCO" : "ATENÇÃO"
            }</span>
            <button class="dl-close" id="dl-close-btn" title="Fechar">✕</button>
          </div>
        </div>

        <div class="dl-section">
          <div class="dl-sec-title">01 // COLETADO EM ${siteRecord.domain.toUpperCase()}</div>
          <ul class="dl-list">
            ${sensitiveListHtml}
            ${collectedItemsHtml}
          </ul>
        </div>

        <div class="dl-section">
          <div class="dl-sec-title">02 // FINALIDADE & COMPARTILHAMENTO</div>
          <div style="color:#D4D4D8; font-size:11.5px;">
            ${siteRecord.purposeSummary}
            <div style="margin-top:4px; color:#A1A1AA; font-family:ui-monospace,Consolas,monospace; font-size:11px;">
              Exposição: <strong style="color:#FAFAFA;">${siteRecord.thirdPartyCompanies} terceiros</strong> · <strong style="color:#FAFAFA;">${siteRecord.cookieCount} cookies</strong>
            </div>
          </div>
        </div>

        <div id="dl-feedback-msg" style="display:none; padding:7px; border-radius:6px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.3); color:#10B981; font-weight:600; text-align:center; margin-top:8px;"></div>

        <!-- Botões Simétricos Sem Dark Patterns -->
        <div class="dl-actions" id="dl-action-buttons">
          <button class="dl-btn dl-btn-primary" id="dl-reject-btn">
            Rejeitar Não-Essenciais
          </button>
          <button class="dl-btn" id="dl-keep-btn">
            Permitir na Sessão
          </button>
        </div>

        <div class="dl-footer">
          <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
            <input type="checkbox" id="dl-always-reject-chk" ${
              preferences.prophylacticBlock ? "checked" : ""
            } style="accent-color:#0D9488;" />
            <span>Rejeitar sempre automaticamente</span>
          </label>
          <button class="dl-link" id="dl-open-dash-btn">Inventário ↗</button>
        </div>
      </div>
    `;

    shadow.getElementById("dl-close-btn").addEventListener("click", () => {
      host.remove();
    });

    shadow.getElementById("dl-keep-btn").addEventListener("click", () => {
      host.remove();
    });

    shadow.getElementById("dl-reject-btn").addEventListener("click", () => {
      const rejectBannerRes = tryRejectCookieBanners(true);
      const storageCleaned = cleanWebStorageTrackers();
      chrome.runtime.sendMessage(
        {
          type: "CLEAR_SITE_COOKIES",
          domain: siteRecord.domain,
          url: window.location.href,
          mode: "non_essential"
        },
        (res) => {
          const fb = shadow.getElementById("dl-feedback-msg");
          const btns = shadow.getElementById("dl-action-buttons");
          if (btns) btns.style.display = "none";
          if (fb) {
            fb.style.display = "block";
            fb.textContent = `✓ Protegido! ${
              (res?.removedCount || 0) + storageCleaned
            } rastreadores/cookies removidos${
              rejectBannerRes.clicked ? ` + Banner rejeitado (${rejectBannerRes.method})` : ""
            }.`;
          }
          setTimeout(() => host.remove(), 2600);
        }
      );
    });

    shadow.getElementById("dl-always-reject-chk").addEventListener("change", (e) => {
      const updatedPrefs = {
        ...preferences,
        prophylacticBlock: e.target.checked
      };
      chrome.runtime.sendMessage({
        type: "SAVE_PREFERENCES",
        preferences: updatedPrefs
      });
    });

    shadow.getElementById("dl-open-dash-btn").addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
    });
  }

  // ============================================================================
  // E) EXECUÇÃO AUTOMÁTICA AO CARREGAR QUALQUER PÁGINA REAL
  // ============================================================================
  function runPageInspection() {
    const signals = scanPagePrivacySignals();

    chrome.runtime.sendMessage(
      {
        type: "ANALYZE_PAGE",
        url: window.location.href,
        domSignals: signals
      },
      (response) => {
        if (!response || !response.ok || !response.siteRecord) return;
        const { siteRecord, preferences } = response;

        // 1. Se o "Bloqueio Automático Profilático" (Rejeitar sempre que possível) estiver ativo:
        if (preferences.prophylacticBlock) {
          cleanWebStorageTrackers();
          const rejectResult = tryRejectCookieBanners(true);
          if (rejectResult.clicked) {
            chrome.runtime.sendMessage({
              type: "ANALYZE_PAGE",
              url: window.location.href,
              domSignals: { ...signals, autoRejectedBanner: true }
            });
          } else {
            // MutationObserver de 8s para banners de cookies lentos (OneTrust/Cookiebot assíncronos em SPAs)
            let bannerHandled = false;
            const obs = new MutationObserver(() => {
              if (bannerHandled) return;
              const lateTry = tryRejectCookieBanners(true);
              if (lateTry.clicked) {
                bannerHandled = true;
                obs.disconnect();
                cleanWebStorageTrackers();
                chrome.runtime.sendMessage({
                  type: "ANALYZE_PAGE",
                  url: window.location.href,
                  domSignals: { ...scanPagePrivacySignals(), autoRejectedBanner: true }
                });
              }
            });
            if (document.body) {
              obs.observe(document.body, { childList: true, subtree: true });
              setTimeout(() => obs.disconnect(), 8500);
            }
          }
        }

        // 2. Se o site coletar dados sensíveis ou tiver alto risco (e não estiver em Modo Silencioso), exibe o aviso automático!
        const hasSensitiveOrHighRisk =
          siteRecord.riskLevel === "high" ||
          (siteRecord.sensitiveSignals && siteRecord.sensitiveSignals.length > 0) ||
          signals.bannerDetected;

        if (
          hasSensitiveOrHighRisk &&
          !preferences.notificationSuppression &&
          preferences.sensitiveAlertEnabled !== false
        ) {
          renderFloatingDataLensAlert(siteRecord, preferences);
        }
      }
    );
  }

  // Executa após o carregamento inicial da página
  setTimeout(runPageInspection, 900);

  // Fecha o alerta flutuante com a tecla Esc (Acessibilidade IHC)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const host = document.getElementById("datalens-shadow-host");
      if (host) host.remove();
    }
  });

  // Escuta comandos vindos do Popup ou Background da extensão
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "GET_DOM_SIGNALS") {
      sendResponse({ ok: true, domSignals: scanPagePrivacySignals() });
    } else if (msg.type === "TRIGGER_BANNER_REJECT") {
      const storageCleaned = cleanWebStorageTrackers();
      const res = tryRejectCookieBanners(true);
      sendResponse({ ...res, storageCleaned });
    } else if (msg.type === "SHOW_SYNTHESIS_CARD") {
      const signals = scanPagePrivacySignals();
      chrome.runtime.sendMessage(
        { type: "ANALYZE_PAGE", url: window.location.href, domSignals: signals },
        (response) => {
          if (response && response.siteRecord) {
            renderFloatingDataLensAlert(response.siteRecord, response.preferences || {});
          }
        }
      );
      sendResponse({ ok: true });
    }
  });
})();
