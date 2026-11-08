/**
 * DataLens — Motor de Background (Service Worker Manifest V3)
 * Coleta real de cookies do navegador, classificação semiótica, remoção ativa e sincronização com Dashboard.
 * UFABC • Interação Humano-Computador (2026) • Grupo DataLens (GC5)
 */

const DEFAULT_PREFERENCES = {
  prophylacticBlock: false,        // Rejeitar cookies não-essenciais sempre que possível automaticamente
  notificationSuppression: false,  // Modo silencioso (suprimir alertas visuais e agir em background)
  sensitiveAlertEnabled: true,     // Exibir Cartão de Síntese de 5s sempre que dado sensível/alto risco for detectado
  maxThirdPartyTrackers: 5,
  maxRetentionDays: 30,
  allowedCategories: {
    essential: true,
    analytics: true,
    marketing: false,
    thirdParty: false
  }
};

// Regras heurísticas para classificar cookies reais em 4 categorias semióticas
const COOKIE_PATTERNS = {
  thirdParty: [
    /_fbp/i, /_fbc/i, /fr$/i, /doubleclick/i, /IDE$/i, /test_cookie/i,
    /uuid/i, /uid/i, /visitor_id/i, /anj/i, /TapAd/i, /criteo/i,
    /taboola/i, /outbrain/i, /adroll/i, /pubmatic/i, /rubicon/i,
    /MUID/i, /ANONCHK/i, /_ttp/i, /tt_webid/i, /li_sugr/i, /bcookie/i,
    /personalization_id/i, /guest_id/i, /datr/i, /sb$/i
  ],
  marketing: [
    /_gcl_/i, /_gads/i, /_gac_/i, /NID$/i, /ads/i, /promo/i, /campaign/i,
    /aff/i, /retarget/i, /pixel/i, /_uetsid/i, /_uetvid/i, /_pin_unauth/i,
    /hubspotutk/i, /__hstc/i, /_mkto_trk/i, /pardot/i, /lead/i, /ab_test/i
  ],
  analytics: [
    /^_ga/i, /^_gid/i, /^_gat/i, /^__utm/i, /amplitude/i, /mixpanel/i,
    /mp_/i, /_hj/i, /hotjar/i, /clarity/i, /_clck/i, /_clsk/i,
    /s_cc/i, /s_sq/i, /s_vi/i, /optimizely/i, /plausible/i, /matomo/i,
    /_pk_/i, /vuid/i, /analytics/i, /telemetry/i, /perf/i
  ],
  essential: [
    /sess/i, /phpsessid/i, /jsessionid/i, /asp\.net_sessionid/i,
    /csrf/i, /xsrf/i, /token/i, /auth/i, /login/i, /sid$/i,
    /cf_clearance/i, /__cf_bm/i, /__cfduid/i, /AWSALB/i, /consent/i,
    /cookie_notice/i, /gdpr/i, /lgpd/i, /cart/i, /checkout/i, /theme/i, /lang/i
  ]
};

/**
 * Classifica um cookie real do Chrome/Edge e verifica se o domínio pertence a terceiros
 */
function classifyCookie(cookie, pageHostname) {
  const name = cookie.name || "";
  const cookieDomain = (cookie.domain || "").replace(/^\./, "").toLowerCase();
  const cleanHost = (pageHostname || "").replace(/^www\./, "").toLowerCase();

  // Verifica se o cookie pertence a outro domínio (Terceiro real)
  const isThirdPartyDomain =
    cleanHost &&
    cookieDomain &&
    !cleanHost.endsWith(cookieDomain) &&
    !cookieDomain.endsWith(cleanHost);

  if (isThirdPartyDomain) {
    return {
      category: "thirdParty",
      risk: "high",
      label: `Cookie de Terceiro (${cookieDomain})`,
      isThirdParty: true
    };
  }

  for (const regex of COOKIE_PATTERNS.thirdParty) {
    if (regex.test(name)) {
      return {
        category: "thirdParty",
        risk: "high",
        label: `Rastreador Publicitário (${name})`,
        isThirdParty: true
      };
    }
  }

  for (const regex of COOKIE_PATTERNS.marketing) {
    if (regex.test(name)) {
      return {
        category: "marketing",
        risk: "high",
        label: `Perfil de Marketing (${name})`,
        isThirdParty: false
      };
    }
  }

  for (const regex of COOKIE_PATTERNS.analytics) {
    if (regex.test(name)) {
      return {
        category: "analytics",
        risk: "medium",
        label: `Métrica Analytics (${name})`,
        isThirdParty: false
      };
    }
  }

  for (const regex of COOKIE_PATTERNS.essential) {
    if (regex.test(name)) {
      return {
        category: "essential",
        risk: "low",
        label: `Sessão / Segurança (${name})`,
        isThirdParty: false
      };
    }
  }

  // Heurística por tempo de expiração: cookies que duram > 90 dias sem ser de sessão tendem a ser identificadores persistentes
  if (!cookie.session && cookie.expirationDate) {
    const daysLeft = (cookie.expirationDate * 1000 - Date.now()) / (1000 * 60 * 60 * 24);
    if (daysLeft > 180) {
      return {
        category: "marketing",
        risk: "medium",
        label: `Identificador Persistente (${name})`,
        isThirdParty: false
      };
    }
  }

  return {
    category: "essential",
    risk: "low",
    label: `Funcional Local (${name})`,
    isThirdParty: false
  };
}

/**
 * Audita todos os cookies reais associados a uma URL/aba e mescla com os sinais do Content Script
 */
async function auditTabPrivacy(tabId, urlString, domSignals = {}) {
  if (!urlString || !urlString.startsWith("http")) return null;

  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (e) {
    return null;
  }

  const hostname = parsedUrl.hostname.replace(/^www\./, "");
  if (!hostname || hostname === "localhost" || hostname.includes("127.0.0.1")) {
    return null;
  }

  // Busca cookies pela URL e pelo domínio base
  const byUrl = await chrome.cookies.getAll({ url: urlString });
  const baseParts = hostname.split(".");
  const rootDomain = baseParts.length >= 2 ? baseParts.slice(-2).join(".") : hostname;
  const byDomain = await chrome.cookies.getAll({ domain: rootDomain });

  // Deduplica cookies reais encontrados
  const cookieMap = new Map();
  [...byUrl, ...byDomain].forEach((c) => {
    const key = `${c.name}@${c.domain}${c.path}`;
    cookieMap.set(key, c);
  });

  const allCookies = Array.from(cookieMap.values());
  const classifiedCookies = allCookies.map((c) => ({
    name: c.name,
    domain: c.domain,
    path: c.path,
    secure: c.secure,
    httpOnly: c.httpOnly,
    session: c.session,
    expirationDate: c.expirationDate,
    ...classifyCookie(c, hostname)
  }));

  // Contabiliza categorias reais
  const counts = {
    essential: 0,
    analytics: 0,
    marketing: 0,
    thirdParty: 0
  };
  const thirdPartyDomainsSet = new Set(domSignals.thirdPartyDomains || []);

  classifiedCookies.forEach((c) => {
    counts[c.category] = (counts[c.category] || 0) + 1;
    if (c.category === "thirdParty" || c.isThirdParty) {
      thirdPartyDomainsSet.add(c.domain.replace(/^\./, ""));
    }
  });

  // Adiciona scripts de rastreamento de terceiros detectados no DOM
  const externalTrackersCount = thirdPartyDomainsSet.size;
  const nonEssentialCookiesCount =
    counts.analytics + counts.marketing + counts.thirdParty;

  // Detecta tipos de dados coletados (Cookies + Sinais de Dados Sensíveis no DOM)
  const dataCollected = [];

  if (counts.essential > 0) {
    dataCollected.push({
      id: "ess-cookies",
      label: `${counts.essential} Cookies de Sessão/Essenciais`,
      category: "essential",
      risk: "low"
    });
  } else {
    dataCollected.push({
      id: "ess-nav",
      label: "Sessão Técnica HTTP",
      category: "essential",
      risk: "low"
    });
  }

  if (counts.analytics > 0) {
    dataCollected.push({
      id: "ana-cookies",
      label: `${counts.analytics} Cookies de Analytics/Métricas`,
      category: "analytics",
      risk: "medium"
    });
  }

  if (counts.marketing > 0) {
    dataCollected.push({
      id: "mkt-cookies",
      label: `${counts.marketing} Cookies de Publicidade/Perfil`,
      category: "marketing",
      risk: "high"
    });
  }

  if (counts.thirdParty > 0 || externalTrackersCount > 0) {
    dataCollected.push({
      id: "tp-trackers",
      label: `${counts.thirdParty + externalTrackersCount} Rastreadores/Terceiros`,
      category: "thirdParty",
      risk: "high"
    });
  }

  // Sinais de dados sensíveis detectados diretamente na página pelo content.js
  const sensitiveSignals = domSignals.sensitiveFields || [];
  sensitiveSignals.forEach((sig, i) => {
    dataCollected.push({
      id: `sens-${i}`,
      label: sig.label,
      category: sig.category || "thirdParty",
      risk: "high",
      isSensitiveDom: true
    });
  });

  // Calcula nível de risco real
  let riskLevel = "low";
  if (
    counts.thirdParty >= 2 ||
    counts.marketing >= 2 ||
    externalTrackersCount >= 3 ||
    sensitiveSignals.length > 0
  ) {
    riskLevel = "high";
  } else if (
    counts.analytics > 0 ||
    counts.marketing > 0 ||
    counts.thirdParty > 0 ||
    externalTrackersCount > 0
  ) {
    riskLevel = "medium";
  }

  // Verifica preferências para saber se deve aplicar rejeição/limpeza automática
  const storageData = await chrome.storage.local.get(["datalens_preferences", "datalens_sites"]);
  const prefs = storageData.datalens_preferences || DEFAULT_PREFERENCES;
  const existingSites = storageData.datalens_sites || [];

  let blockedByAuto = 0;
  let status = "full";

  if (prefs.prophylacticBlock && nonEssentialCookiesCount > 0) {
    const removed = await removeSiteCookies(hostname, urlString, "non_essential");
    blockedByAuto = removed;
    status = "essential_only";
    riskLevel = "low";
  }

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().slice(0, 5);

  const trackersTotal = Math.max(
    allCookies.length + externalTrackersCount,
    1
  );
  const trackersActive =
    status === "essential_only"
      ? counts.essential
      : allCookies.length + externalTrackersCount;

  const prevRecord = existingSites.find((s) => s.domain === hostname);
  const cumulativeBlocked =
    (prevRecord ? prevRecord.trackersBlocked || 0 : 0) +
    blockedByAuto +
    (domSignals.autoRejectedBanner ? nonEssentialCookiesCount : 0);

  if (domSignals.autoRejectedBanner) {
    status = "essential_only";
    riskLevel = "low";
  }

  // Monta síntese em linguagem natural sem jargão jurídico
  const purposeList = [];
  if (sensitiveSignals.length > 0) {
    purposeList.push(
      `Coleta de dados sensíveis (${sensitiveSignals.map((s) => s.label).join(", ")})`
    );
  }
  if (counts.thirdParty > 0 || externalTrackersCount > 0) {
    purposeList.push(
      `Rastreamento comportamental e compartilhamento com ${externalTrackersCount} domínios externos`
    );
  }
  if (counts.marketing > 0) {
    purposeList.push(`Criação de perfil para anúncios direcionados (${counts.marketing} cookies)`);
  }
  if (counts.analytics > 0) {
    purposeList.push(`Medição de cliques e tempo de navegação (${counts.analytics} cookies)`);
  }
  if (purposeList.length === 0) {
    purposeList.push("Apenas funcionamento técnico essencial da página e segurança da sessão");
  }

  const siteRecord = {
    id: `real-${hostname.replace(/[^a-z0-9]/gi, "-")}`,
    isRealSite: true,
    name: domSignals.pageTitle
      ? domSignals.pageTitle.split(/[-|•—]/)[0].trim().slice(0, 38) || hostname
      : hostname,
    domain: hostname,
    url: urlString,
    category: "Site Real Visitado",
    lastAccess: dateStr,
    accessTime: timeStr,
    riskLevel,
    status,
    trackersTotal,
    trackersActive,
    trackersBlocked: cumulativeBlocked,
    thirdPartyCompanies: externalTrackersCount,
    thirdPartyList: Array.from(thirdPartyDomainsSet).slice(0, 8),
    cookieCount: allCookies.length,
    cookieBreakdown: counts,
    rawCookies: classifiedCookies.slice(0, 30),
    sensitiveSignals,
    bannerDetected: Boolean(domSignals.bannerDetected),
    autoRejectedBanner: Boolean(domSignals.autoRejectedBanner),
    dataCollected,
    purposeSummary: purposeList.join(". ") + "."
  };

  // Salva/atualiza no armazenamento persistente da extensão
  const updatedSites = [
    siteRecord,
    ...existingSites.filter((s) => s.domain !== hostname)
  ].slice(0, 50);

  await chrome.storage.local.set({ datalens_sites: updatedSites });

  // Atualiza badge no ícone da extensão na barra do navegador
  updateToolbarBadge(tabId, siteRecord);

  return siteRecord;
}

/**
 * Atualiza o Badge Semiótico no ícone da extensão no Chrome/Edge
 */
function updateToolbarBadge(tabId, siteRecord) {
  if (!tabId || !siteRecord) return;

  const badgeColors = {
    high: "#EF4444",   // Vermelho Alto Risco
    medium: "#F59E0B", // Amarelo Atenção
    low: "#10B981"     // Verde Seguro
  };

  const countText =
    siteRecord.status !== "full"
      ? "OK"
      : String(siteRecord.cookieCount + siteRecord.thirdPartyCompanies);

  chrome.action.setBadgeText({ tabId, text: countText });
  chrome.action.setBadgeBackgroundColor({
    tabId,
    color: badgeColors[siteRecord.riskLevel] || "#0D9488"
  });
}

/**
 * Remove cookies reais do navegador Chrome/Edge para um domínio
 * mode: 'non_essential' | 'all'
 */
async function removeSiteCookies(hostname, urlString, mode = "non_essential") {
  const baseParts = hostname.split(".");
  const rootDomain = baseParts.length >= 2 ? baseParts.slice(-2).join(".") : hostname;

  const byDomain = await chrome.cookies.getAll({ domain: rootDomain });
  let byUrl = [];
  if (urlString && urlString.startsWith("http")) {
    byUrl = await chrome.cookies.getAll({ url: urlString });
  }

  const cookieMap = new Map();
  [...byDomain, ...byUrl].forEach((c) => {
    cookieMap.set(`${c.name}@${c.domain}${c.path}`, c);
  });

  let removedCount = 0;
  for (const cookie of cookieMap.values()) {
    const classification = classifyCookie(cookie, hostname);
    if (mode === "non_essential" && classification.category === "essential") {
      continue;
    }

    const protocol = cookie.secure ? "https:" : "http:";
    const cleanDom = cookie.domain.replace(/^\./, "");
    const cookieUrl = `${protocol}//${cleanDom}${cookie.path || "/"}`;

    try {
      await chrome.cookies.remove({
        url: cookieUrl,
        name: cookie.name,
        storeId: cookie.storeId
      });
      removedCount++;
    } catch (e) {
      // Ignora cookies protegidos pelo navegador
    }
  }

  return removedCount;
}

// Inicialização da Extensão
chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get(["datalens_preferences", "datalens_sites"]);
  if (!data.datalens_preferences) {
    await chrome.storage.local.set({ datalens_preferences: DEFAULT_PREFERENCES });
  }
  if (!data.datalens_sites) {
    await chrome.storage.local.set({ datalens_sites: [] });
  }
});

// Escuta mensagens do Content Script, do Popup e do Dashboard
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "ANALYZE_PAGE") {
      const tabId = sender.tab ? sender.tab.id : message.tabId;
      const url = sender.tab ? sender.tab.url : message.url;
      const record = await auditTabPrivacy(tabId, url, message.domSignals || {});
      const prefsData = await chrome.storage.local.get("datalens_preferences");
      sendResponse({
        ok: true,
        siteRecord: record,
        preferences: prefsData.datalens_preferences || DEFAULT_PREFERENCES
      });
    } else if (message.type === "GET_CURRENT_TAB_AUDIT") {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url) {
        sendResponse({ ok: false });
        return;
      }
      const record = await auditTabPrivacy(tab.id, tab.url, {});
      const prefsData = await chrome.storage.local.get("datalens_preferences");
      sendResponse({
        ok: true,
        siteRecord: record,
        preferences: prefsData.datalens_preferences || DEFAULT_PREFERENCES
      });
    } else if (message.type === "CLEAR_SITE_COOKIES") {
      const { domain, url, mode } = message;
      const removed = await removeSiteCookies(domain, url, mode || "non_essential");

      // Atualiza registro no storage
      const data = await chrome.storage.local.get("datalens_sites");
      const sites = data.datalens_sites || [];
      const updated = sites.map((s) => {
        if (s.domain === domain) {
          return {
            ...s,
            status: mode === "all" ? "revoked" : "essential_only",
            riskLevel: "low",
            trackersBlocked: (s.trackersBlocked || 0) + Math.max(removed, 1),
            trackersActive: mode === "all" ? 0 : (s.cookieBreakdown?.essential || 1)
          };
        }
        return s;
      });
      await chrome.storage.local.set({ datalens_sites: updated });

      // Se houver aba ativa desse domínio, envia comando para tentar rejeitar banner também
      const tabs = await chrome.tabs.query({});
      tabs.forEach((t) => {
        if (t.url && t.url.includes(domain)) {
          chrome.tabs.sendMessage(t.id, { type: "TRIGGER_BANNER_REJECT" }).catch(() => {});
          updateToolbarBadge(t.id, { status: "essential_only", riskLevel: "low", cookieCount: 0, thirdPartyCompanies: 0 });
        }
      });

      sendResponse({ ok: true, removedCount: removed, sites: updated });
    } else if (message.type === "SAVE_PREFERENCES") {
      await chrome.storage.local.set({ datalens_preferences: message.preferences });
      sendResponse({ ok: true });
    } else if (message.type === "GET_DASHBOARD_DATA") {
      const data = await chrome.storage.local.get(["datalens_sites", "datalens_preferences"]);
      sendResponse({
        ok: true,
        sites: data.datalens_sites || [],
        preferences: data.datalens_preferences || DEFAULT_PREFERENCES
      });
    } else if (message.type === "OPEN_DASHBOARD") {
      const dashUrl = chrome.runtime.getURL("index.html");
      await chrome.tabs.create({ url: dashUrl });
      sendResponse({ ok: true });
    }
  })();

  return true; // Mantém canal assíncrono aberto
});
