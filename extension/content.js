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
      if (!text || text.length > 55) continue;

      if (rejectKeywords.some((kw) => text === kw || text.includes(kw))) {
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
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: "open" });

    const isHighRisk = siteRecord.riskLevel === "high";
    const borderColor = isHighRisk ? "#EF4444" : "#F59E0B";
    const badgeBg = isHighRisk ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 158, 11, 0.2)";
    const badgeColor = isHighRisk ? "#FCA5A5" : "#FDE68A";

    const sensitiveListHtml =
      siteRecord.sensitiveSignals && siteRecord.sensitiveSignals.length > 0
        ? siteRecord.sensitiveSignals
            .map(
              (s) =>
                `<li style="color:#FCA5A5; font-weight:600;">⚠️ ${s.label}</li>`
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
          <span style="width:7px; height:7px; border-radius:50%; background:${dot}; display:inline-block; flex-shrink:0;"></span>
          <span>${item.label}</span>
        </li>`;
      })
      .join("");

    shadow.innerHTML = `
      <style>
        .dl-card {
          width: 390px;
          max-width: calc(100vw - 32px);
          background: rgba(15, 23, 42, 0.97);
          backdrop-filter: blur(16px);
          color: #F8FAFC;
          border: 2px solid ${borderColor};
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 20px 45px rgba(0, 0, 0, 0.65);
          font-size: 12.5px;
          line-height: 1.45;
          animation: dlSlideUp 0.3s ease-out;
        }
        @keyframes dlSlideUp {
          from { transform: translateY(25px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .dl-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #1E293B;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .dl-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 800;
          font-size: 13.5px;
          color: #2DD4BF;
        }
        .dl-badge {
          background: ${badgeBg};
          color: ${badgeColor};
          border: 1px solid ${borderColor};
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
        }
        .dl-close {
          background: transparent;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          font-size: 15px;
          font-weight: bold;
          padding: 2px 6px;
        }
        .dl-close:hover { color: #FFF; }
        .dl-section {
          background: rgba(2, 6, 23, 0.65);
          border: 1px solid #1E293B;
          border-radius: 10px;
          padding: 9px 11px;
          margin-bottom: 8px;
        }
        .dl-sec-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #2DD4BF;
          margin-bottom: 5px;
        }
        .dl-list {
          list-style: none;
          padding: 0;
          margin: 0;
          color: #E2E8F0;
        }
        .dl-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 12px;
        }
        .dl-btn {
          padding: 9px 10px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #475569;
          background: #1E293B;
          color: #F8FAFC;
          text-align: center;
          transition: all 0.15s;
        }
        .dl-btn:hover {
          background: #0D9488;
          border-color: #2DD4BF;
        }
        .dl-btn-primary {
          background: #0D9488;
          border-color: #14B8A6;
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
          border-top: 1px solid #1E293B;
          font-size: 11px;
          color: #94A3B8;
        }
        .dl-link {
          color: #2DD4BF;
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
            <span>🛡️ DataLens • Síntese em 5s</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="dl-badge">${
              isHighRisk ? "🔴 Dado Sensível / Alto Risco" : "🟡 Atenção"
            }</span>
            <button class="dl-close" id="dl-close-btn" title="Fechar">✕</button>
          </div>
        </div>

        <div class="dl-section">
          <div class="dl-sec-title">1. O que está sendo coletado em ${siteRecord.domain}?</div>
          <ul class="dl-list">
            ${sensitiveListHtml}
            ${collectedItemsHtml}
          </ul>
        </div>

        <div class="dl-section">
          <div class="dl-sec-title" style="color:#FBBF24;">2. Finalidade & Compartilhamento</div>
          <div style="color:#CBD5E1; font-size:12px;">
            ${siteRecord.purposeSummary}
            <div style="margin-top:4px; color:#FCA5A5; font-weight:700;">
              🔗 Conectado a ${siteRecord.thirdPartyCompanies} domínios de terceiros e ${siteRecord.cookieCount} cookies locais.
            </div>
          </div>
        </div>

        <div id="dl-feedback-msg" style="display:none; padding:8px; border-radius:8px; background:rgba(16,185,129,0.2); border:1px solid #10B981; color:#A7F3D0; font-weight:600; text-align:center; margin-top:8px;"></div>

        <!-- Botões Simétricos Sem Dark Patterns -->
        <div class="dl-actions" id="dl-action-buttons">
          <button class="dl-btn dl-btn-primary" id="dl-reject-btn">
            🚫 Rejeitar & Limpar Não-Essenciais
          </button>
          <button class="dl-btn" id="dl-keep-btn">
            Permitir Apenas Nesta Sessão
          </button>
        </div>

        <div class="dl-footer">
          <label style="display:flex; align-items:center; gap:5px; cursor:pointer;">
            <input type="checkbox" id="dl-always-reject-chk" ${
              preferences.prophylacticBlock ? "checked" : ""
            } style="accent-color:#0D9488;" />
            <span>Rejeitar sempre automaticamente</span>
          </label>
          <button class="dl-link" id="dl-open-dash-btn">Abrir Dashboard ↗</button>
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
              res?.removedCount || 0
            } cookies rastreadores apagados${
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
          const rejectResult = tryRejectCookieBanners(true);
          if (rejectResult.clicked) {
            // Informa ao background que o banner foi rejeitado automaticamente
            chrome.runtime.sendMessage({
              type: "ANALYZE_PAGE",
              url: window.location.href,
              domSignals: { ...signals, autoRejectedBanner: true }
            });
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

  // Escuta comandos vindos do Popup da extensão
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "TRIGGER_BANNER_REJECT") {
      const res = tryRejectCookieBanners(true);
      sendResponse(res);
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
