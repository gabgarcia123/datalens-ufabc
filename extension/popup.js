/**
 * DataLens — Controlador do Popup da Extensão (Barra do Navegador)
 * UFABC • Interação Humano-Computador (2026) • Grupo DataLens (GC5)
 */

document.addEventListener("DOMContentLoaded", () => {
  const elDomain = document.getElementById("site-domain");
  const elBadge = document.getElementById("risk-badge");
  const elEss = document.getElementById("cnt-ess");
  const elAna = document.getElementById("cnt-ana");
  const elMkt = document.getElementById("cnt-mkt");
  const elTp = document.getElementById("cnt-tp");
  const elList = document.getElementById("detected-list");
  const elStatus = document.getElementById("status-msg");

  const chkAutoReject = document.getElementById("chk-auto-reject");
  const chkSensitiveAlert = document.getElementById("chk-sensitive-alert");
  const chkSilentMode = document.getElementById("chk-silent-mode");

  let currentSiteRecord = null;
  let currentPreferences = {};

  function showStatus(text) {
    elStatus.style.display = "block";
    elStatus.textContent = text;
    setTimeout(() => {
      elStatus.style.display = "none";
    }, 3500);
  }

  function renderPopup(siteRecord, preferences) {
    currentSiteRecord = siteRecord;
    currentPreferences = preferences || {};

    chkAutoReject.checked = Boolean(currentPreferences.prophylacticBlock);
    chkSensitiveAlert.checked = currentPreferences.sensitiveAlertEnabled !== false;
    chkSilentMode.checked = Boolean(currentPreferences.notificationSuppression);

    if (!siteRecord) {
      elDomain.textContent = "Página Interna do Navegador";
      elBadge.className = "badge badge-low";
      elBadge.textContent = "Seguro";
      elList.innerHTML = `<li>Nenhum cookie HTTP ativo nesta guia interna. Abra um site (ex: uol.com.br, amazon.com.br) para auditar.</li>`;
      return;
    }

    elDomain.textContent = siteRecord.domain;

    if (siteRecord.riskLevel === "high") {
      elBadge.className = "badge badge-high";
      elBadge.textContent = "🔴 Alto Risco";
    } else if (siteRecord.riskLevel === "medium") {
      elBadge.className = "badge badge-medium";
      elBadge.textContent = "🟡 Médio Risco";
    } else {
      elBadge.className = "badge badge-low";
      elBadge.textContent = "🟢 Seguro / Protegido";
    }

    const bd = siteRecord.cookieBreakdown || {};
    elEss.textContent = bd.essential || 0;
    elAna.textContent = bd.analytics || 0;
    elMkt.textContent = bd.marketing || 0;
    elTp.textContent = (bd.thirdParty || 0) + (siteRecord.thirdPartyCompanies || 0);

    const items = siteRecord.dataCollected || [];
    const rawCookies = siteRecord.rawCookies || [];

    let html = "";
    items.forEach((item) => {
      const color =
        item.risk === "high"
          ? "#EF4444"
          : item.risk === "medium"
          ? "#F59E0B"
          : "#10B981";
      html += `<li><span class="dot" style="background:${color}"></span><strong>${item.label}</strong></li>`;
    });

    rawCookies.slice(0, 8).forEach((c) => {
      const color =
        c.risk === "high" ? "#EF4444" : c.risk === "medium" ? "#F59E0B" : "#10B981";
      html += `<li><span class="dot" style="background:${color}"></span>Cookie: <code>${c.name}</code> (${c.domain})</li>`;
    });

    elList.innerHTML = html || `<li>Apenas conexão HTTPS básica sem cookies salvos.</li>`;
  }

  // Solicita auditoria da aba atual ao abrir o popup
  chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB_AUDIT" }, (res) => {
    if (res && res.ok) {
      renderPopup(res.siteRecord, res.preferences);
    } else {
      renderPopup(null, {});
    }
  });

  // Botão: Rejeitar Banner e Limpar Cookies Não-Essenciais
  document.getElementById("btn-reject-clean").addEventListener("click", () => {
    if (!currentSiteRecord) return;
    chrome.runtime.sendMessage(
      {
        type: "CLEAR_SITE_COOKIES",
        domain: currentSiteRecord.domain,
        url: currentSiteRecord.url,
        mode: "non_essential"
      },
      (res) => {
        showStatus(
          `✓ ${res?.removedCount || 0} cookies não-essenciais apagados e banner rejeitado!`
        );
        chrome.runtime.sendMessage({ type: "GET_CURRENT_TAB_AUDIT" }, (r) => {
          if (r && r.ok) renderPopup(r.siteRecord, r.preferences);
        });
      }
    );
  });

  // Botão: Mostrar Cartão de Síntese Veloz (5s) na página atual
  document.getElementById("btn-show-card").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { type: "SHOW_SYNTHESIS_CARD" }).catch(() => {});
      window.close();
    }
  });

  // Salvar toggles de preferências
  function savePrefs() {
    const nextPrefs = {
      ...currentPreferences,
      prophylacticBlock: chkAutoReject.checked,
      sensitiveAlertEnabled: chkSensitiveAlert.checked,
      notificationSuppression: chkSilentMode.checked
    };
    currentPreferences = nextPrefs;
    chrome.runtime.sendMessage({ type: "SAVE_PREFERENCES", preferences: nextPrefs }, () => {
      showStatus("✓ Preferência de proteção salva!");
    });
  }

  chkAutoReject.addEventListener("change", savePrefs);
  chkSensitiveAlert.addEventListener("change", savePrefs);
  chkSilentMode.addEventListener("change", savePrefs);

  // Abrir Dashboard Central Completo
  document.getElementById("btn-open-dashboard").addEventListener("click", () => {
    chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
  });
});
