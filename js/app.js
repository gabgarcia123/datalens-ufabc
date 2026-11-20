/**
 * DataLens v2.0 — Motor de Interface Estilo shadcn/ui + Linear (Zero "Cara de IA")
 * UFABC • Interação Humano-Computador (2026) • Grupo DataLens (GC5)
 */

(function () {
  const cloneData = (obj) => JSON.parse(JSON.stringify(obj));

  const state = {
    theme: "dark", // 'dark' | 'light'
    activeTab: "dashboard",
    sites: cloneData(window.DATALENS_INITIAL_DATA.sites),
    preferences: cloneData(window.DATALENS_INITIAL_DATA.preferences),
    simulatorScenarios: cloneData(window.DATALENS_INITIAL_DATA.simulatorScenarios),
    timelineHistory: cloneData(window.DATALENS_INITIAL_DATA.timelineHistory),
    expandedSiteIds: {}, // Linhas da tabela com detalhes técnicos expandidos
    filters: {
      search: "",
      risk: "all",
      date: "all",
      category: "all"
    },
    simulator: {
      currentScenarioId: "sim-ecommerce",
      viewMode: "datalens", // 'datalens' | 'darkpattern'
      overlayOpen: true,
      customSelectOpen: false,
      selectedCustomCategories: {
        essential: true,
        analytics: false,
        marketing: false,
        thirdParty: false
      },
      decisionMade: null
    },
    chartMode: "donut"
  };

  const CATEGORY_META = {
    essential: {
      label: "Essenciais / Seguros",
      shortLabel: "Essenciais",
      color: "#10B981",
      badgeClass: "dl-badge-low",
      dotClass: "dl-dot-low"
    },
    analytics: {
      label: "Desempenho / Analytics",
      shortLabel: "Analytics",
      color: "#F59E0B",
      badgeClass: "dl-badge-medium",
      dotClass: "dl-dot-medium"
    },
    marketing: {
      label: "Marketing / Publicidade",
      shortLabel: "Marketing",
      color: "#F97316",
      badgeClass: "dl-badge-medium",
      dotClass: "dl-dot-medium"
    },
    thirdParty: {
      label: "Rastreamento de Terceiros",
      shortLabel: "Terceiros",
      color: "#EF4444",
      badgeClass: "dl-badge-high",
      dotClass: "dl-dot-high"
    }
  };

  const RISK_META = {
    low: {
      label: "Baixo",
      fullLabel: "Baixo Risco",
      badge: "dl-badge-low",
      dot: "dl-dot-low"
    },
    medium: {
      label: "Médio",
      fullLabel: "Médio Risco",
      badge: "dl-badge-medium",
      dot: "dl-dot-medium"
    },
    high: {
      label: "Alto",
      fullLabel: "Alto Risco",
      badge: "dl-badge-high",
      dot: "dl-dot-high"
    }
  };

  // ============================================================================
  // CÁLCULO DE MÉTRICAS E KPIS EM TEMPO REAL
  // ============================================================================
  function computeMetrics() {
    const totalSites = state.sites.length;
    let activeTrackers = 0;
    let blockedTrackers = 0;
    let totalTrackers = 0;
    let riskPoints = 0;
    const maxPossiblePoints = Math.max(totalSites * 100, 1);

    const categoryCounts = {
      essential: 0,
      analytics: 0,
      marketing: 0,
      thirdParty: 0
    };

    state.sites.forEach((site) => {
      totalTrackers += site.trackersTotal;
      activeTrackers += site.trackersActive;
      blockedTrackers += site.trackersBlocked;

      if (site.status === "full") {
        riskPoints += site.riskLevel === "high" ? 95 : site.riskLevel === "medium" ? 55 : 15;
      } else if (site.status === "essential_only") {
        riskPoints += 10;
      }

      site.dataCollected.forEach((item) => {
        const isItemActive =
          site.status === "full" ||
          (site.status === "essential_only" && item.category === "essential");
        if (isItemActive) {
          categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        }
      });
    });

    const exposureIndex = Math.round((riskPoints / maxPossiblePoints) * 100);

    const todayEntry = state.timelineHistory[state.timelineHistory.length - 1];
    if (todayEntry) {
      todayEntry.exposureScore = exposureIndex;
      todayEntry.trackersBlocked = blockedTrackers;
      todayEntry.consentsGiven = state.sites.filter((s) => s.status === "full").length;
    }

    return {
      totalSites,
      exposureIndex,
      activeTrackers,
      blockedTrackers,
      totalTrackers,
      categoryCounts
    };
  }

  // ============================================================================
  // TOAST MINIMALISTA ESTILO SONNER / SHADCN
  // ============================================================================
  function showToast(title, message, status = "low") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const dotClass =
      status === "high"
        ? "dl-dot-high"
        : status === "medium"
        ? "dl-dot-medium"
        : "dl-dot-low";

    const toast = document.createElement("div");
    toast.className = "dl-card toast-enter";
    toast.style.cssText =
      "padding: 12px 14px; box-shadow: 0 10px 25px rgba(0,0,0,0.45); display: flex; align-items: flex-start; gap: 10px;";
    toast.innerHTML = `
      <span class="dl-dot ${dotClass}" style="margin-top: 5px;"></span>
      <div style="flex: 1; font-size: 12px;">
        <div style="font-weight: 600; color: var(--text-primary);">${title}</div>
        <div style="color: var(--text-secondary); margin-top: 2px; line-height: 1.4;">${message}</div>
      </div>
      <button data-action="close-toast" class="dl-btn-ghost" style="padding: 2px 5px; font-size: 11px; cursor: pointer;">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 3800);
  }

  // ============================================================================
  // AÇÕES DE MANIPULAÇÃO DIRETA NOS SITES (MÓDULO 1)
  // ============================================================================
  // Helper para executar ação de limpeza de cookies reais tanto em modo chrome-extension:// quanto via Content Script
  function triggerRealSiteCookieClean(domain, url, mode) {
    window.postMessage(
      {
        source: "DATALENS_WEB_APP",
        type: "DASHBOARD_COOKIE_ACTION",
        payload: { domain, url, mode }
      },
      "*"
    );
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "CLEAR_SITE_COOKIES", domain, url, mode });
    }
  }

  window.handleSiteAction = function (siteId, actionType) {
    const site = state.sites.find((s) => s.id === siteId);
    if (!site) return;

    if (actionType === "essential_only") {
      const newlyBlocked = Math.max(0, site.trackersTotal - 1);
      site.status = "essential_only";
      site.trackersActive = 1;
      site.trackersBlocked = newlyBlocked;
      site.riskLevel = "low";
      if (site.isRealSite) {
        triggerRealSiteCookieClean(site.domain, site.url, "non_essential");
      }
      showToast(
        `Restrição aplicada: ${site.domain}`,
        `${site.trackersBlocked} coletores não-essenciais foram desativados.`,
        "low"
      );
    } else if (actionType === "revoke") {
      site.status = "revoked";
      site.trackersBlocked = site.trackersTotal;
      site.trackersActive = 0;
      site.riskLevel = "low";
      if (site.isRealSite) {
        triggerRealSiteCookieClean(site.domain, site.url, "all");
      }
      showToast(
        `Consentimento revogado: ${site.domain}`,
        `Todos os ${site.trackersTotal} rastreadores e vínculos com ${site.thirdPartyCompanies} terceiros foram cortados.`,
        "high"
      );
    } else if (actionType === "clear_cookies") {
      site.status = "essential_only";
      site.trackersBlocked = site.trackersTotal;
      site.trackersActive = 0;
      site.riskLevel = "low";
      if (site.isRealSite) {
        triggerRealSiteCookieClean(site.domain, site.url, "all");
      }
      showToast(
        `Cookies expurgados: ${site.domain}`,
        `Identificadores locais e tokens de retargeting removidos do navegador.`,
        "low"
      );
    } else if (actionType === "restore") {
      const orig = window.DATALENS_INITIAL_DATA.sites.find((s) => s.id === siteId);
      if (orig) {
        Object.assign(site, cloneData(orig));
        showToast(
          `Estado original restaurado`,
          `O perfil inicial de ${site.domain} foi reativado.`,
          "medium"
        );
      } else if (site.isRealSite) {
        site.status = "full";
        site.trackersActive = site.trackersTotal;
        site.trackersBlocked = 0;
        site.riskLevel = site.thirdPartyCompanies >= 3 ? "high" : "medium";
        showToast(
          `Status redefinido`,
          `Recarregue a aba de ${site.domain} para auditar novamente.`,
          "medium"
        );
      }
    }

    renderAll();
  };

  window.handleBulkAction = function (mode) {
    if (mode === "protect_all") {
      let totalRevoked = 0;
      state.sites.forEach((site) => {
        if (site.status === "full") {
          totalRevoked += Math.max(0, site.trackersTotal - 1);
          site.status = "essential_only";
          site.trackersActive = 1;
          site.trackersBlocked = Math.max(0, site.trackersTotal - 1);
          site.riskLevel = "low";
        }
      });
      window.postMessage({ source: "DATALENS_WEB_APP", type: "DASHBOARD_BULK_PROTECT" }, "*");
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: "PROTECT_ALL_REAL_SITES" });
      }
      showToast(
        "Política Estrita Aplicada em Lote",
        `Todos os domínios foram restritos ao modo essencial (${totalRevoked} rastreadores bloqueados).`,
        "low"
      );
    } else if (mode === "reset_demo") {
      state.sites = cloneData(window.DATALENS_INITIAL_DATA.sites);
      state.timelineHistory = cloneData(window.DATALENS_INITIAL_DATA.timelineHistory);
      window.postMessage({ source: "DATALENS_WEB_APP", type: "DASHBOARD_RESET_SITES" }, "*");
      if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({ type: "RESET_REAL_SITES" });
      }
      showToast(
        "Inventário de Demonstração Restaurado",
        "Os domínios retornaram ao estado inicial de auditoria.",
        "medium"
      );
    }
    renderAll();
  };

  // ============================================================================
  // GRÁFICOS TÉCNICOS (MÓDULO 1.2)
  // ============================================================================
  function renderCategoryChart(metrics) {
    const container = document.getElementById("category-chart-container");
    if (!container) return;

    const counts = metrics.categoryCounts;
    const total =
      counts.essential + counts.analytics + counts.marketing + counts.thirdParty || 1;

    const items = [
      { key: "essential", count: counts.essential, ...CATEGORY_META.essential },
      { key: "analytics", count: counts.analytics, ...CATEGORY_META.analytics },
      { key: "marketing", count: counts.marketing, ...CATEGORY_META.marketing },
      { key: "thirdParty", count: counts.thirdParty, ...CATEGORY_META.thirdParty }
    ];

    if (state.chartMode === "donut") {
      const radius = 56;
      const circumference = 2 * Math.PI * radius;
      let acc = 0;

      const segments = items
        .map((item) => {
          const pct = item.count / total;
          const dash = `${pct * circumference} ${circumference}`;
          const offset = -acc * circumference;
          acc += pct;
          return `<circle cx="76" cy="76" r="${radius}" fill="transparent" stroke="${item.color}" stroke-width="16" stroke-dasharray="${dash}" stroke-dashoffset="${offset}" style="cursor:pointer;" data-action="category-filter" data-category="${item.key}"><title>${item.label}: ${item.count}</title></circle>`;
        })
        .join("");

      container.innerHTML = `
        <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
          <div style="position: relative; width: 152px; height: 152px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <svg width="152" height="152" viewBox="0 0 152 152" style="transform: rotate(-90deg);">
              <circle cx="76" cy="76" r="${radius}" fill="transparent" stroke="var(--bg-muted)" stroke-width="16"></circle>
              ${segments}
            </svg>
            <div style="position: absolute; text-align: center; pointer-events: none;">
              <div class="font-mono" style="font-size: 22px; font-weight: 700;">${total}</div>
              <div class="text-xs text-muted">vetores</div>
            </div>
          </div>

          <div style="flex: 1; min-width: 210px; display: flex; flex-direction: column; gap: 6px;">
            ${items
              .map((item) => {
                const pct = Math.round((item.count / total) * 100);
                const active = state.filters.category === item.key;
                return `
                  <button
                    data-action="category-filter"
                    data-category="${item.key}"
                    style="display: flex; align-items: center; justify-content: space-between; padding: 7px 10px; border-radius: var(--radius-md); border: 1px solid ${
                      active ? "var(--teal-brand)" : "var(--border-subtle)"
                    }; background-color: ${
                  active ? "var(--teal-subtle)" : "var(--bg-background)"
                }; cursor: pointer; text-align: left;"
                  >
                    <span class="flex items-center gap-2 text-xs font-medium" style="color: var(--text-primary);">
                      <span class="dl-dot" style="background-color: ${item.color};"></span>
                      ${item.label}
                    </span>
                    <span class="font-mono text-xs" style="color: var(--text-secondary);">
                      <strong style="color: var(--text-primary);">${item.count}</strong> (${pct}%)
                    </span>
                  </button>
                `;
              })
              .join("")}
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px; padding: 4px 0;">
          ${items
            .map((item) => {
              const pct = Math.round((item.count / total) * 100);
              return `
                <div data-action="category-filter" data-category="${item.key}" style="cursor: pointer;">
                  <div class="flex justify-between text-xs" style="margin-bottom: 5px;">
                    <span class="flex items-center gap-2 font-medium">
                      <span class="dl-dot" style="background-color: ${item.color};"></span>
                      ${item.label}
                    </span>
                    <span class="font-mono text-secondary">${item.count} vetores (${pct}%)</span>
                  </div>
                  <div style="width: 100%; height: 7px; background-color: var(--bg-muted); border-radius: 99px; overflow: hidden;">
                    <div style="height: 100%; width: ${Math.max(pct, 3)}%; background-color: ${item.color};"></div>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `;
    }
  }

  function renderTimelineChart() {
    const container = document.getElementById("timeline-chart-container");
    if (!container) return;

    const history = state.timelineHistory;
    const width = 500;
    const height = 152;
    const padX = 28;
    const padY = 20;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    const expPoints = history.map((d, idx) => {
      const x = padX + (idx / (history.length - 1)) * plotW;
      const y = padY + plotH - (d.exposureScore / 100) * plotH;
      return { x, y, ...d };
    });

    const maxBlocked = Math.max(100, ...history.map((d) => d.trackersBlocked));
    const blkPoints = history.map((d, idx) => {
      const x = padX + (idx / (history.length - 1)) * plotW;
      const y = padY + plotH - (d.trackersBlocked / maxBlocked) * plotH;
      return { x, y, ...d };
    });

    const expPolyline = expPoints.map((p) => `${p.x},${p.y}`).join(" ");
    const blkPolyline = blkPoints.map((p) => `${p.x},${p.y}`).join(" ");

    container.innerHTML = `
      <div>
        <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 152px; overflow: visible;">
          <line x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" stroke="var(--border-subtle)" stroke-dasharray="3,3"/>
          <line x1="${padX}" y1="${padY + plotH / 2}" x2="${width - padX}" y2="${padY + plotH / 2}" stroke="var(--border-subtle)" stroke-dasharray="3,3"/>
          <line x1="${padX}" y1="${padY + plotH}" x2="${width - padX}" y2="${padY + plotH}" stroke="var(--border-strong)"/>

          <polyline fill="none" stroke="var(--sem-high)" stroke-width="2" points="${expPolyline}" />
          <polyline fill="none" stroke="var(--teal-brand)" stroke-width="2" stroke-dasharray="4,3" points="${blkPolyline}" />

          ${expPoints
            .map(
              (p) => `
            <g>
              <circle cx="${p.x}" cy="${p.y}" r="3.5" fill="var(--sem-high)" />
              <text x="${p.x}" y="${p.y - 8}" text-anchor="middle" fill="var(--text-secondary)" font-family="monospace" font-size="10">${p.exposureScore}%</text>
              <text x="${p.x}" y="${height - 2}" text-anchor="middle" fill="var(--text-muted)" font-family="monospace" font-size="10">${p.day}</text>
            </g>
          `
            )
            .join("")}

          ${blkPoints
            .map(
              (p) => `
            <circle cx="${p.x}" cy="${p.y}" r="3" fill="var(--teal-brand)">
              <title>${p.dateLabel}: ${p.trackersBlocked} bloqueados</title>
            </circle>
          `
            )
            .join("")}
        </svg>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px; padding-top: 8px; border-top: 1px solid var(--border-subtle); font-size: 11.5px; color: var(--text-muted);">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5"><span class="dl-dot dl-dot-high"></span> Exposição (%)</span>
            <span class="flex items-center gap-1.5"><span class="dl-dot" style="background: var(--teal-brand);"></span> Bloqueios acumulados</span>
          </div>
          <span class="font-mono">Janela: 7 dias</span>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // DATA TABLE DE SITES MONITORADOS (ESTILO SHADCN / LINEAR)
  // ============================================================================
  function getFilteredSites() {
    return state.sites.filter((site) => {
      const q = state.filters.search.trim().toLowerCase();
      if (
        q &&
        !site.name.toLowerCase().includes(q) &&
        !site.domain.toLowerCase().includes(q) &&
        !site.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      if (state.filters.risk !== "all" && site.riskLevel !== state.filters.risk) {
        return false;
      }
      const todayIso = new Date().toISOString().split("T")[0];
      if (
        state.filters.date === "today" &&
        site.lastAccess !== todayIso &&
        site.lastAccess !== "2026-11-08"
      ) {
        return false;
      }
      if (state.filters.date === "recent") {
        const siteTime = new Date(site.lastAccess + "T12:00:00").getTime();
        const daysDiff = (Date.now() - siteTime) / (1000 * 60 * 60 * 24);
        const isMockRecent = ["2026-11-08", "2026-11-07", "2026-11-06"].includes(site.lastAccess);
        if (daysDiff > 3.5 && !isMockRecent) {
          return false;
        }
      }
      if (state.filters.category !== "all") {
        const hasCat = site.dataCollected.some(
          (d) => d.category === state.filters.category
        );
        if (!hasCat) return false;
      }
      return true;
    });
  }

  function renderSitesList() {
    const container = document.getElementById("sites-list-container");
    const countBadge = document.getElementById("filtered-sites-count");
    if (!container) return;

    const filtered = getFilteredSites();
    if (countBadge) {
      countBadge.textContent = `${filtered.length} de ${state.sites.length} domínios`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="padding: 40px 20px; text-align: center;">
          <div style="font-weight: 600; color: var(--text-primary);">Nenhum domínio corresponde aos critérios de filtro</div>
          <div class="text-xs text-muted" style="margin-top: 4px; margin-bottom: 14px;">Redefina os parâmetros de busca ou categoria para inspecionar o inventário completo.</div>
          <button data-action="reset-filters" class="dl-btn dl-btn-sm">Limpar Filtros</button>
        </div>
      `;
      return;
    }

    const rowsHtml = filtered
      .map((site) => {
        const riskInfo = RISK_META[site.riskLevel];
        const isExpanded = Boolean(state.expandedSiteIds[site.id]);

        const statusLabel =
          site.status === "full"
            ? `<span class="font-mono text-xs" style="color: var(--sem-high);">Coleta Total (${site.trackersActive})</span>`
            : site.status === "essential_only"
            ? `<span class="font-mono text-xs" style="color: var(--sem-low);">Estrito (${site.trackersBlocked} bloq.)</span>`
            : `<span class="font-mono text-xs" style="color: var(--text-muted);">Revogado (${site.trackersBlocked} bloq.)</span>`;

        return `
          <tr class="dl-row">
            <!-- Coluna 1: Domínio & Origem -->
            <td>
              <div class="flex items-center gap-2.5">
                <button
                  data-action="toggle-row-detail"
                  data-site-id="${site.id}"
                  class="dl-btn dl-btn-ghost dl-btn-sm font-mono"
                  style="padding: 2px 6px;"
                  title="Inspecionar finalidade e rastreadores"
                >
                  ${isExpanded ? "▾" : "▸"}
                </button>
                <div>
                  <div class="flex items-center gap-2">
                    <span style="font-weight: 600; color: var(--text-primary);">${site.name}</span>
                    ${
                      site.isRealSite
                        ? `<span class="dl-badge dl-badge-teal font-mono" style="font-size: 10px; padding: 1px 6px;">EXTENSÃO REAL</span>`
                        : `<span class="text-xs text-muted">${site.category}</span>`
                    }
                  </div>
                  <div class="font-mono text-xs text-muted">${site.domain} · acesso ${site.accessTime}</div>
                </div>
              </div>
            </td>

            <!-- Coluna 2: Risco Semiótico -->
            <td>
              <span class="dl-badge ${riskInfo.badge}">
                <span class="dl-dot ${riskInfo.dot}"></span>
                ${riskInfo.fullLabel}
              </span>
            </td>

            <!-- Coluna 3: Vetores de Dados Coletados -->
            <td>
              <div class="flex flex-wrap gap-1.5">
                ${site.dataCollected
                  .map((item) => {
                    const catMeta = CATEGORY_META[item.category];
                    const isBlocked =
                      site.status === "revoked" ||
                      (site.status === "essential_only" && item.category !== "essential");
                    return `
                      <span
                        class="dl-badge ${isBlocked ? "" : catMeta.badgeClass}"
                        style="${isBlocked ? "opacity: 0.45; text-decoration: line-through;" : ""}"
                        title="${catMeta.label}"
                      >
                        <span class="dl-dot ${isBlocked ? "" : catMeta.dotClass}" style="${isBlocked ? "background: var(--text-muted);" : ""}"></span>
                        ${item.label}
                      </span>
                    `;
                  })
                  .join("")}
              </div>
            </td>

            <!-- Coluna 4: Terceiros & Status -->
            <td>
              <div class="font-mono text-xs">
                <strong>${site.status === "full" ? site.thirdPartyCompanies : 0}</strong> terceiros
              </div>
              <div>${statusLabel}</div>
            </td>

            <!-- Coluna 5: Ações Rápidas de Manipulação Direta -->
            <td style="text-align: right; white-space: nowrap;">
              <div class="inline-flex items-center gap-1.5">
                <button
                  data-action="site-action"
                  data-site-id="${site.id}"
                  data-type="essential_only"
                  class="dl-btn dl-btn-sm"
                  style="${site.status === "essential_only" ? "border-color: var(--sem-low); color: var(--sem-low);" : ""}"
                >
                  Apenas Essenciais
                </button>
                <button
                  data-action="site-action"
                  data-site-id="${site.id}"
                  data-type="revoke"
                  class="dl-btn dl-btn-sm"
                  style="${site.status === "revoked" ? "border-color: var(--sem-high); color: var(--sem-high);" : ""}"
                >
                  Revogar
                </button>
                <button
                  data-action="site-action"
                  data-site-id="${site.id}"
                  data-type="clear_cookies"
                  class="dl-btn dl-btn-sm"
                  title="Expurgar cookies locais"
                >
                  Limpar Cookies
                </button>
                ${
                  site.status !== "full"
                    ? `<button data-action="site-action" data-site-id="${site.id}" data-type="restore" class="dl-btn dl-btn-ghost dl-btn-sm" title="Restaurar estado inicial">↺</button>`
                    : ""
                }
              </div>
            </td>
          </tr>
          ${
            isExpanded
              ? `
            <tr class="dl-row-detail">
              <td colspan="5">
                <div style="display: flex; flex-direction: column; gap: 12px; font-size: 12px;">
                  <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
                    <div>
                      <span class="font-mono text-xs text-muted">FINALIDADE DECLARADA (TRADUÇÃO SEM JARGÃO):</span>
                      <div style="color: var(--text-primary); margin-top: 2px;">${site.purposeSummary}</div>
                    </div>
                    <div class="font-mono text-xs text-secondary">
                      Total auditado: ${site.trackersTotal} coletores (${site.trackersActive} ativos / ${site.trackersBlocked} bloqueados)
                    </div>
                  </div>

                  ${
                    site.rawCookies && site.rawCookies.length > 0
                      ? `
                    <div style="padding-top: 10px; border-top: 1px solid var(--border-subtle);">
                      <div class="font-mono text-xs text-muted" style="margin-bottom: 6px;">COOKIES REAIS AUDITADOS NESTE DOMÍNIO (${site.rawCookies.length}):</div>
                      <div class="flex flex-wrap gap-1.5">
                        ${site.rawCookies
                          .slice(0, 14)
                          .map(
                            (ck) => `
                          <span class="dl-badge font-mono" style="font-size: 11px;" title="Domínio: ${ck.domain} | Categoria: ${ck.category}">
                            <span class="dl-dot ${
                              ck.risk === "high"
                                ? "dl-dot-high"
                                : ck.risk === "medium"
                                ? "dl-dot-medium"
                                : "dl-dot-low"
                            }"></span>
                            ${ck.name}
                            <span class="text-muted">(${ck.secure ? "Secure" : "HTTP"})</span>
                          </span>
                        `
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                      : ""
                  }

                  ${
                    site.thirdPartyList && site.thirdPartyList.length > 0
                      ? `
                    <div style="padding-top: 8px; border-top: 1px solid var(--border-subtle);">
                      <div class="font-mono text-xs text-muted" style="margin-bottom: 6px;">CONEXÕES EXTERNAS DE TERCEIROS DETECTADAS:</div>
                      <div class="flex flex-wrap gap-1.5">
                        ${site.thirdPartyList
                          .map(
                            (tp) => `<span class="dl-badge dl-badge-high font-mono" style="font-size: 11px;">${tp}</span>`
                          )
                          .join("")}
                      </div>
                    </div>
                  `
                      : ""
                  }
                </div>
              </td>
            </tr>
          `
              : ""
          }
        `;
      })
      .join("");

    container.innerHTML = `
      <table class="dl-table">
        <thead>
          <tr>
            <th>Domínio / Identificação</th>
            <th>Severidade</th>
            <th>Dados Coletados & Significadores</th>
            <th>Exposição Externa</th>
            <th style="text-align: right;">Controle Direto</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;
  }

  // ============================================================================
  // MÓDULO 2: SIMULADOR DA EXTENSÃO WEB (MEDIAÇÃO EFÊMERA EM 5s)
  // ============================================================================
  function renderSimulator() {
    const container = document.getElementById("simulator-Mount");
    if (!container) return;

    const scenario =
      state.simulatorScenarios.find((s) => s.id === state.simulator.currentScenarioId) ||
      state.simulatorScenarios[0];

    const isAutoProtected =
      state.preferences.prophylacticBlock && scenario.riskLevel !== "low";
    const isSilentMode = state.preferences.notificationSuppression;

    const badgeClass =
      state.simulator.decisionMade === "rejected" || isAutoProtected
        ? "dl-badge-low"
        : scenario.riskLevel === "high"
        ? "dl-badge-high"
        : scenario.riskLevel === "medium"
        ? "dl-badge-medium"
        : "dl-badge-low";

    const currentBadgeLabel =
      state.simulator.decisionMade === "rejected" || isAutoProtected
        ? "Protegido · 0 Terceiros"
        : state.simulator.decisionMade === "selected"
        ? "Parcial · Limites Ativos"
        : state.simulator.decisionMade === "accepted"
        ? "Exposto · Coleta Total"
        : scenario.badgeText;

    container.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 18px;">
        <!-- Sub-header e Seletor de Cenário -->
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
          <div>
            <span class="font-mono text-xs text-muted">MÓDULO 02 // MEDIAÇÃO ATIVA NO CONTEXTO DE NAVEGAÇÃO</span>
            <h2 style="font-size: 18px; font-weight: 700; margin: 2px 0 0 0;">Simulador do Cartão de Síntese Veloz (Leitura em 5 Segundos)</h2>
          </div>

          <div class="dl-tabs">
            ${state.simulatorScenarios
              .map(
                (sc) => `
              <button
                data-action="select-sim-scenario"
                data-scenario-id="${sc.id}"
                class="dl-tab-btn ${sc.id === scenario.id ? "active" : ""}"
              >
                <span class="dl-dot ${
                  sc.riskLevel === "high"
                    ? "dl-dot-high"
                    : sc.riskLevel === "medium"
                    ? "dl-dot-medium"
                    : "dl-dot-low"
                }"></span>
                ${sc.name}
              </button>
            `
              )
              .join("")}
          </div>
        </div>

        <!-- Viewport do Navegador Simulado -->
        <div class="dl-card" style="overflow: hidden;">
          <!-- Barra de Endereço Técnica do Navegador -->
          <div style="background-color: var(--bg-elevated); border-bottom: 1px solid var(--border-subtle); padding: 10px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
            <div class="flex items-center gap-2">
              <span style="width: 10px; height: 10px; border-radius: 50%; background-color: var(--border-strong);"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background-color: var(--border-strong);"></span>
              <span style="width: 10px; height: 10px; border-radius: 50%; background-color: var(--border-strong);"></span>
            </div>

            <div class="font-mono text-xs" style="flex: 1; max-width: 540px; background-color: var(--bg-background); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 5px 12px; color: var(--text-secondary); display: flex; align-items: center; justify-content: space-between;">
              <span>🔒 ${scenario.url}</span>
              <span class="text-muted">TLS 1.3</span>
            </div>

            <!-- Ícone Discreto de Risco na Barra do Navegador (Requisito B.1) -->
            <div class="flex items-center gap-2">
              <button
                data-action="toggle-sim-overlay"
                class="dl-badge ${badgeClass}"
                style="cursor: pointer; padding: 4px 10px;"
              >
                <span class="dl-dot ${
                  badgeClass === "dl-badge-high"
                    ? "dl-dot-high"
                    : badgeClass === "dl-badge-medium"
                    ? "dl-dot-medium"
                    : "dl-dot-low"
                }"></span>
                <span class="font-mono">DataLens: ${currentBadgeLabel}</span>
              </button>

              <button data-action="toggle-sim-viewmode" class="dl-btn dl-btn-sm">
                ${
                  state.simulator.viewMode === "datalens"
                    ? "Comparar com Dark Pattern"
                    : "Voltar para Síntese DataLens"
                }
              </button>
            </div>
          </div>

          <!-- Corpo da Página Simulada -->
          <div style="padding: 24px; background-color: var(--bg-background); min-height: 460px; display: flex; flex-direction: column; justify-content: space-between;">
            <!-- Wireframe Sóbrio da Página Hospedeira -->
            <div style="opacity: 0.75; padding-bottom: 16px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: baseline;">
              <div>
                <div class="font-mono text-xs text-muted">DOMÍNIO HOSPEDEIRO SIMULADO</div>
                <div style="font-size: 16px; font-weight: 700; margin-top: 2px;">${scenario.pageTitle}</div>
                <div class="text-xs text-secondary">${scenario.pageSubtitle}</div>
              </div>
              <span class="font-mono text-xs text-muted">HTTP 200 OK</span>
            </div>

            <!-- Estado de Supressão Silenciosa -->
            ${
              isSilentMode && isAutoProtected && !state.simulator.overlayOpen
                ? `
              <div class="dl-card" style="max-width: 520px; margin: 32px auto; padding: 20px; text-align: center;">
                <span class="dl-badge dl-badge-low font-mono">SUPRESSÃO SILENCIOSA ATIVA</span>
                <h4 style="font-size: 14.5px; font-weight: 700; margin: 10px 0 4px 0;">Banner Interceptado sem Interrupção Visual</h4>
                <p class="text-xs text-secondary" style="margin: 0 0 14px 0;">
                  O DataLens aplicou seu perfil profilático em segundo plano e bloqueou <strong>${scenario.synthesis.sharedWith.count} redes terceiras</strong>.
                </p>
                <button data-action="toggle-sim-overlay" data-force="true" class="dl-btn dl-btn-sm">
                  Inspecionar Cartão de Síntese (5s)
                </button>
              </div>
            `
                : ""
            }

            <!-- Cartão de Síntese Veloz (5s) ou Banner Dark Pattern -->
            ${
              state.simulator.overlayOpen
                ? state.simulator.viewMode === "datalens"
                  ? renderQuickSynthesisCard(scenario, isAutoProtected)
                  : renderDarkPatternComparison(scenario)
                : `
              <div class="dl-card" style="padding: 12px 16px; display: flex; align-items: center; justify-content: space-between;">
                <span class="text-xs text-secondary">
                  Política de consentimento registrada para <strong>${scenario.name}</strong>.
                </span>
                <button data-action="toggle-sim-overlay" data-force="true" class="dl-btn dl-btn-sm">
                  Abrir Cartão de Síntese (5s)
                </button>
              </div>
            `
            }
          </div>
        </div>
      </div>
    `;
  }

  function renderQuickSynthesisCard(scenario, isAutoProtected) {
    const syn = scenario.synthesis;
    const riskMeta = RISK_META[scenario.riskLevel];

    return `
      <div class="dl-card" style="max-width: 880px; width: 100%; margin: 20px auto 0 auto; box-shadow: 0 16px 36px rgba(0,0,0,0.4);">
        <div class="dl-card-header">
          <div class="flex items-center gap-2.5">
            <span class="dl-dot ${riskMeta.dot}"></span>
            <div>
              <div style="font-weight: 700; font-size: 13.5px;">DataLens · Síntese Transparente em 5 Segundos</div>
              <div class="text-xs text-muted">Substituição de banner de cookies com tradução sem jargão jurídico</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="dl-badge ${riskMeta.badge} font-mono">Score: ${scenario.riskScore}/100</span>
            <button data-action="toggle-sim-overlay" data-force="false" class="dl-btn dl-btn-ghost dl-btn-sm">✕</button>
          </div>
        </div>

        <div class="dl-card-body" style="display: flex; flex-direction: column; gap: 16px;">
          ${
            isAutoProtected
              ? `
            <div style="padding: 10px 12px; border-radius: var(--radius-md); background-color: var(--sem-low-bg); border: 1px solid var(--sem-low-border); color: var(--sem-low); font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span><strong>Bloqueio Profilático Ativo:</strong> Rastreadores não-essenciais foram pré-rejeitados pelo seu perfil.</span>
              <button data-action="switch-tab" data-tab="preferences" class="dl-btn dl-btn-sm">Configurar</button>
            </div>
          `
              : ""
          }

          <!-- 3 Colunas Estruturadas -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
            <!-- 1. O que é coletado -->
            <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background-color: var(--bg-background);">
              <div class="font-mono text-xs text-muted" style="margin-bottom: 8px;">01 // O QUE É COLETADO?</div>
              <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                ${syn.whatIsCollected
                  .map(
                    (item) => `
                  <li class="flex items-start gap-2">
                    <span class="dl-dot ${
                      item.risk === "high"
                        ? "dl-dot-high"
                        : item.risk === "medium"
                        ? "dl-dot-medium"
                        : "dl-dot-low"
                    }" style="margin-top: 5px;"></span>
                    <span>${item.label}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </div>

            <!-- 2. Finalidade -->
            <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background-color: var(--bg-background);">
              <div class="font-mono text-xs text-muted" style="margin-bottom: 8px;">02 // PARA QUAL FINALIDADE?</div>
              <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; font-size: 12px;">
                ${syn.purpose
                  .map(
                    (item) => `
                  <li class="flex items-start gap-2">
                    <span class="dl-dot ${
                      item.risk === "high"
                        ? "dl-dot-high"
                        : item.risk === "medium"
                        ? "dl-dot-medium"
                        : "dl-dot-low"
                    }" style="margin-top: 5px;"></span>
                    <span>${item.label}</span>
                  </li>
                `
                  )
                  .join("")}
              </ul>
            </div>

            <!-- 3. Compartilhamento -->
            <div style="padding: 12px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background-color: var(--bg-background);">
              <div class="font-mono text-xs text-muted" style="margin-bottom: 8px;">03 // COM QUEM É COMPARTILHADO?</div>
              <div style="font-size: 12px; font-weight: 600; margin-bottom: 8px;">${syn.sharedWith.summary}</div>
              <div class="flex flex-wrap gap-1">
                ${syn.sharedWith.entities
                  .map((ent) => `<span class="dl-badge font-mono" style="font-size: 10.5px;">${ent}</span>`)
                  .join("")}
              </div>
            </div>
          </div>

          ${
            state.simulator.customSelectOpen
              ? `
            <div style="padding: 12px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); background-color: var(--bg-elevated);">
              <div class="text-xs font-semibold" style="margin-bottom: 8px;">Seleção Granular de Categorias:</div>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                <label class="flex items-center gap-2"><input type="checkbox" checked disabled /> Essenciais (Fixo)</label>
                <label class="flex items-center gap-2"><input type="checkbox" ${state.simulator.selectedCustomCategories.analytics ? "checked" : ""} data-change="sim-custom-cat" data-cat="analytics" /> Analytics</label>
                <label class="flex items-center gap-2"><input type="checkbox" ${state.simulator.selectedCustomCategories.marketing ? "checked" : ""} data-change="sim-custom-cat" data-cat="marketing" /> Marketing</label>
                <label class="flex items-center gap-2"><input type="checkbox" ${state.simulator.selectedCustomCategories.thirdParty ? "checked" : ""} data-change="sim-custom-cat" data-cat="thirdParty" /> Terceiros (${syn.sharedWith.count})</label>
              </div>
            </div>
          `
              : ""
          }

          <!-- Botões com Affordances Estritamente Simétricas (Sem Dark Patterns) -->
          <div style="padding-top: 12px; border-top: 1px solid var(--border-subtle); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
            <span class="text-xs text-muted">
              Simetria de Affordances (Norman): 3 ações com idêntico peso visual e contraste.
            </span>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-2" style="min-width: 420px;">
              <button data-action="sim-decision" data-decision="rejected" class="dl-btn" style="font-weight: 600;">
                Rejeitar Não-Essenciais
              </button>
              <button data-action="sim-decision" data-decision="selected" class="dl-btn" style="font-weight: 600;">
                ${state.simulator.customSelectOpen ? "Confirmar Seleção" : "Permitir Selecionados"}
              </button>
              <button data-action="sim-decision" data-decision="accepted" class="dl-btn" style="font-weight: 600;">
                Aceitar Tudo
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderDarkPatternComparison(scenario) {
    return `
      <div class="dl-card" style="max-width: 720px; margin: 20px auto 0 auto; border-color: var(--sem-med);">
        <div class="dl-card-header">
          <span class="dl-badge dl-badge-medium font-mono">CONTRA-EXEMPLO: BANNER CONVENCIONAL COM DARK PATTERNS</span>
          <button data-action="toggle-sim-viewmode" class="dl-btn dl-btn-sm">Voltar ao DataLens →</button>
        </div>
        <div class="dl-card-body" style="display: flex; flex-direction: column; gap: 12px;">
          <p class="text-xs text-secondary" style="margin: 0;">${scenario.darkPatternBannerText}</p>
          <div class="flex items-center justify-end gap-3">
            <button data-action="toggle-sim-viewmode" style="background: none; border: none; color: var(--text-muted); text-decoration: underline; font-size: 11px; cursor: pointer;">
              configurações avançadas (14 cliques)
            </button>
            <button data-action="toggle-sim-viewmode" class="dl-btn dl-btn-teal">
              ACEITAR E CONTINUAR
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // MÓDULO 2.3: POLÍTICAS & LIMITES DE PRIVACIDADE
  // ============================================================================
  function renderPreferences() {
    const container = document.getElementById("preferences-mount");
    if (!container) return;

    const p = state.preferences;

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div class="lg:col-span-8" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="dl-card">
            <div class="dl-card-header">
              <div>
                <span class="font-mono text-xs text-muted">AUTOMAÇÃO DE CONSENTIMENTO</span>
                <div style="font-weight: 700; font-size: 14.5px;">Regras Globais de Intervenção</div>
              </div>
            </div>
            <div class="dl-card-body" style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Switch 1 -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--border-subtle);">
                <div>
                  <div style="font-weight: 600;">Bloqueio Automático Profilático ("Rejeitar sempre que possível")</div>
                  <div class="text-xs text-secondary">Aciona automaticamente botões de rejeição em banners de cookies e limpa rastreadores de terceiros ao carregar a página.</div>
                </div>
                <button
                  data-action="toggle-pref"
                  data-pref-key="prophylacticBlock"
                  class="dl-switch"
                  data-checked="${Boolean(p.prophylacticBlock)}"
                  aria-label="Alternar Bloqueio Profilático"
                >
                  <div class="dl-switch-thumb"></div>
                </button>
              </div>

              <!-- Switch 2 -->
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div>
                  <div style="font-weight: 600;">Modo de Supressão de Notificações (Navegação Silenciosa)</div>
                  <div class="text-xs text-secondary">Oculta avisos flutuantes e aplica seu perfil padrão sem interromper o fluxo de trabalho.</div>
                </div>
                <button
                  data-action="toggle-pref"
                  data-pref-key="notificationSuppression"
                  class="dl-switch"
                  data-checked="${Boolean(p.notificationSuppression)}"
                  aria-label="Alternar Modo Silencioso"
                >
                  <div class="dl-switch-thumb"></div>
                </button>
              </div>
            </div>
          </div>

          <!-- Limites e Categorias -->
          <div class="dl-card">
            <div class="dl-card-header">
              <div>
                <span class="font-mono text-xs text-muted">CALIBRAGEM GRANULAR</span>
                <div style="font-weight: 700; font-size: 14.5px;">Limites de Tolerância e Categorias Padrão</div>
              </div>
            </div>
            <div class="dl-card-body" style="display: flex; flex-direction: column; gap: 18px;">
              <div>
                <div class="flex justify-between text-xs" style="margin-bottom: 6px;">
                  <span class="font-medium">Teto Máximo de Terceiros por Domínio</span>
                  <span id="lbl-slider-maxThirdPartyTrackers" class="font-mono font-bold">${p.maxThirdPartyTrackers} empresas</span>
                </div>
                <input type="range" min="0" max="20" step="1" value="${p.maxThirdPartyTrackers}" data-input="slider-pref" data-pref-key="maxThirdPartyTrackers" />
              </div>

              <div>
                <div class="flex justify-between text-xs" style="margin-bottom: 6px;">
                  <span class="font-medium">Retenção Máxima de Cookies Locais</span>
                  <span id="lbl-slider-maxRetentionDays" class="font-mono font-bold">${p.maxRetentionDays} dias</span>
                </div>
                <input type="range" min="1" max="90" step="1" value="${p.maxRetentionDays}" data-input="slider-pref" data-pref-key="maxRetentionDays" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3" style="padding-top: 8px; border-top: 1px solid var(--border-subtle);">
                <label class="flex items-start gap-2.5 text-xs" style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
                  <input type="checkbox" checked disabled style="margin-top: 2px;" />
                  <div>
                    <div class="font-semibold">Essenciais (Obrigatório)</div>
                    <div class="text-muted">Sessão, segurança e autenticação.</div>
                  </div>
                </label>

                <label class="flex items-start gap-2.5 text-xs" style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer;">
                  <input type="checkbox" ${p.allowedCategories.analytics ? "checked" : ""} data-change="category-pref" data-cat="analytics" style="margin-top: 2px;" />
                  <div>
                    <div class="font-semibold">Desempenho & Analytics</div>
                    <div class="text-muted">Telemetria anônima de navegação.</div>
                  </div>
                </label>

                <label class="flex items-start gap-2.5 text-xs" style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer;">
                  <input type="checkbox" ${p.allowedCategories.marketing ? "checked" : ""} data-change="category-pref" data-cat="marketing" style="margin-top: 2px;" />
                  <div>
                    <div class="font-semibold">Marketing Contextual</div>
                    <div class="text-muted">Segmentação de campanhas próprias.</div>
                  </div>
                </label>

                <label class="flex items-start gap-2.5 text-xs" style="padding: 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer;">
                  <input type="checkbox" ${p.allowedCategories.thirdParty ? "checked" : ""} data-change="category-pref" data-cat="thirdParty" style="margin-top: 2px;" />
                  <div>
                    <div class="font-semibold">Rastreamento de Terceiros</div>
                    <div class="text-muted">Data brokers e redes de leilão RTB.</div>
                  </div>
                </label>
              </div>

              <div class="flex justify-end" style="padding-top: 8px;">
                <button data-action="apply-prefs-all" class="dl-btn dl-btn-teal">
                  Sincronizar Política em Todo o Inventário
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Lateral de Status da Política -->
        <div class="lg:col-span-4">
          <div class="dl-card">
            <div class="dl-card-header">
              <span class="font-mono text-xs text-muted">ESPECIFICAÇÃO ATIVA</span>
              <span class="dl-badge dl-badge-teal font-mono">SINCRONIZADO</span>
            </div>
            <div class="dl-card-body" style="display: flex; flex-direction: column; gap: 10px; font-size: 12.5px;">
              <div class="flex justify-between">
                <span class="text-secondary">Modo Profilático</span>
                <span class="font-mono font-semibold">${p.prophylacticBlock ? "ATIVO" : "MANUAL"}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary">Notificações</span>
                <span class="font-mono font-semibold">${p.notificationSuppression ? "SUPRIMIDAS" : "SÍNTESE 5S"}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary">Limite de Terceiros</span>
                <span id="spec-maxThirdPartyTrackers" class="font-mono font-semibold">&le; ${p.maxThirdPartyTrackers}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-secondary">TTL de Cookies</span>
                <span id="spec-maxRetentionDays" class="font-mono font-semibold">${p.maxRetentionDays}d</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // CONTROLES GLOBAIS, PERSISTÊNCIA LOCAL & EXPORTAÇÃO LGPD (ART. 18)
  // ============================================================================
  function saveLocalState() {
    try {
      localStorage.setItem(
        "datalens_v2_state",
        JSON.stringify({
          theme: state.theme,
          preferences: state.preferences,
          mockSites: state.sites.filter((s) => !s.isRealSite)
        })
      );
    } catch (e) {}
  }

  function loadLocalState() {
    try {
      const raw = localStorage.getItem("datalens_v2_state");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.theme === "light" || parsed.theme === "dark") {
        state.theme = parsed.theme;
        const root = document.documentElement;
        root.classList.toggle("dark", state.theme === "dark");
        root.classList.toggle("light", state.theme === "light");
        const lbl = document.getElementById("theme-indicator-text");
        if (lbl) lbl.textContent = `Tema: ${state.theme === "dark" ? "Escuro" : "Claro"}`;
      }
      if (parsed.preferences) {
        state.preferences = { ...state.preferences, ...parsed.preferences };
      }
      if (Array.isArray(parsed.mockSites) && parsed.mockSites.length > 0) {
        const realSites = state.sites.filter((s) => s.isRealSite);
        state.sites = [...realSites, ...parsed.mockSites];
      }
    } catch (e) {}
  }

  window.exportPrivacyReport = function (format = "json") {
    const metrics = computeMetrics();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

    if (format === "json") {
      const report = {
        metadata: {
          system: "DataLens — Painel de Transparência e Controle Ativo de Dados Pessoais",
          institution: "UFABC • Interação Humano-Computador (2026) • Grupo DataLens (GC5)",
          legalBasis: "LGPD Art. 18 — Portabilidade e Confirmação de Tratamento de Dados",
          exportedAt: new Date().toISOString()
        },
        summaryMetrics: metrics,
        activePreferences: state.preferences,
        auditedDomains: state.sites
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `datalens-relatorio-lgpd-${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Relatório JSON Exportado", "Inventário técnico de conformidade LGPD baixado com sucesso.", "low");
    } else if (format === "csv") {
      const headers = [
        "Nome",
        "Dominio",
        "Origem",
        "Nivel_Risco",
        "Status_Consentimento",
        "Coletores_Total",
        "Coletores_Ativos",
        "Coletores_Bloqueados",
        "Empresas_Terceiras",
        "Ultimo_Acesso"
      ];
      const rows = state.sites.map((s) => [
        `"${(s.name || "").replace(/"/g, '""')}"`,
        `"${s.domain}"`,
        s.isRealSite ? "Extensao_Real" : "Simulacao_IHC",
        s.riskLevel,
        s.status,
        s.trackersTotal,
        s.trackersActive,
        s.trackersBlocked,
        s.thirdPartyCompanies,
        `${s.lastAccess} ${s.accessTime}`
      ]);
      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `datalens-inventario-lgpd-${timestamp}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Planilha CSV Exportada", "Tabela de auditoria exportada para Excel / LibreOffice.", "low");
    }
  };

  window.toggleTheme = function () {
    state.theme = state.theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    root.classList.toggle("dark", state.theme === "dark");
    root.classList.toggle("light", state.theme === "light");
    const lbl = document.getElementById("theme-indicator-text");
    if (lbl) lbl.textContent = `Tema: ${state.theme === "dark" ? "Escuro" : "Claro"}`;
    saveLocalState();
  };

  window.switchTab = function (tabName) {
    state.activeTab = tabName;
    document.querySelectorAll("[data-tab-section]").forEach((sec) => {
      sec.classList.toggle("hidden", sec.getAttribute("data-tab-section") !== tabName);
    });
    document.querySelectorAll("[data-nav-btn]").forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-nav-btn") === tabName);
    });
    renderAll();
  };

  window.setChartMode = function (mode) {
    state.chartMode = mode;
    document.querySelectorAll('[data-action="chart-mode"]').forEach((btn) => {
      btn.classList.toggle("active", btn.getAttribute("data-mode") === mode);
    });
    renderAll();
  };

  window.setCategoryFilter = function (categoryKey) {
    state.filters.category =
      state.filters.category === categoryKey ? "all" : categoryKey;
    const sel = document.getElementById("filter-category");
    if (sel) sel.value = state.filters.category;
    renderAll();
  };

  window.resetFilters = function () {
    state.filters = { search: "", risk: "all", date: "all", category: "all" };
    const searchInput = document.getElementById("search-input");
    const riskSel = document.getElementById("filter-risk");
    const dateSel = document.getElementById("filter-date");
    const catSel = document.getElementById("filter-category");
    if (searchInput) searchInput.value = "";
    if (riskSel) riskSel.value = "all";
    if (dateSel) dateSel.value = "all";
    if (catSel) catSel.value = "all";
    renderAll();
  };

  window.selectSimScenario = function (scenarioId) {
    state.simulator.currentScenarioId = scenarioId;
    state.simulator.decisionMade = null;
    state.simulator.customSelectOpen = false;
    state.simulator.viewMode = "datalens";
    const sc = state.simulatorScenarios.find((s) => s.id === scenarioId);
    state.simulator.overlayOpen = !(
      state.preferences.prophylacticBlock &&
      state.preferences.notificationSuppression &&
      sc &&
      sc.riskLevel !== "low"
    );
    renderSimulator();
  };

  window.toggleSimulatorOverlay = function (forceState) {
    state.simulator.overlayOpen =
      typeof forceState === "boolean" ? forceState : !state.simulator.overlayOpen;
    renderSimulator();
  };

  window.toggleSimViewMode = function () {
    state.simulator.viewMode =
      state.simulator.viewMode === "datalens" ? "darkpattern" : "datalens";
    state.simulator.overlayOpen = true;
    renderSimulator();
  };

  window.toggleSimCustomCat = function (cat, checked) {
    state.simulator.selectedCustomCategories[cat] = checked;
  };

  window.applySimulatorDecision = function (decision) {
    const scenario = state.simulatorScenarios.find(
      (s) => s.id === state.simulator.currentScenarioId
    );
    if (!scenario) return;

    if (decision === "selected" && !state.simulator.customSelectOpen) {
      state.simulator.customSelectOpen = true;
      renderSimulator();
      return;
    }

    state.simulator.decisionMade = decision;
    state.simulator.customSelectOpen = false;
    state.simulator.overlayOpen = false;

    const linkedSiteMap = {
      "sim-ecommerce": "site-2",
      "sim-news": "site-3",
      "sim-academic": "site-8"
    };
    const dashboardSite = state.sites.find((s) => s.id === linkedSiteMap[scenario.id]);

    if (decision === "rejected") {
      if (dashboardSite) {
        dashboardSite.status = "essential_only";
        dashboardSite.trackersBlocked = Math.max(0, dashboardSite.trackersTotal - 1);
        dashboardSite.trackersActive = 1;
        dashboardSite.riskLevel = "low";
      }
      showToast(
        `Não-essenciais rejeitados (${scenario.name})`,
        `${scenario.synthesis.sharedWith.count} terceiros bloqueados e sincronizados no inventário.`,
        "low"
      );
    } else if (decision === "selected") {
      if (dashboardSite) {
        dashboardSite.status = "essential_only";
        dashboardSite.trackersBlocked = Math.max(1, Math.floor(dashboardSite.trackersTotal * 0.7));
        dashboardSite.trackersActive = dashboardSite.trackersTotal - dashboardSite.trackersBlocked;
        dashboardSite.riskLevel = "medium";
      }
      showToast(`Seleção granular aplicada`, `Preferências salvas para ${scenario.name}.`, "low");
    } else if (decision === "accepted") {
      if (dashboardSite) {
        dashboardSite.status = "full";
        dashboardSite.trackersActive = dashboardSite.trackersTotal;
        dashboardSite.trackersBlocked = 0;
        dashboardSite.riskLevel = scenario.riskLevel;
      }
      showToast(
        `Coleta total autorizada`,
        `Compartilhamento ativo com ${scenario.synthesis.sharedWith.count} terceiros.`,
        "medium"
      );
    }

    renderAll();
  };

  function syncPreferencesToExtension() {
    window.postMessage(
      {
        source: "DATALENS_WEB_APP",
        type: "DASHBOARD_PREFS_UPDATE",
        payload: state.preferences
      },
      "*"
    );
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ datalens_preferences: state.preferences });
    }
  }

  window.togglePreference = function (key) {
    state.preferences[key] = !state.preferences[key];
    syncPreferencesToExtension();
    showToast(
      "Política atualizada",
      `Parâmetro ${key} definido como ${state.preferences[key] ? "ATIVO" : "INATIVO"}.`,
      "low"
    );
    renderAll();
  };

  window.updateSliderPreference = function (key, val) {
    const numVal = parseInt(val, 10);
    state.preferences[key] = numVal;
    syncPreferencesToExtension();

    // Atualiza apenas os rótulos no DOM sem destruir o elemento <input type="range"> durante o drag
    const lbl = document.getElementById(`lbl-slider-${key}`);
    const spec = document.getElementById(`spec-${key}`);
    if (key === "maxThirdPartyTrackers") {
      if (lbl) lbl.textContent = `${numVal} empresas`;
      if (spec) spec.innerHTML = `&le; ${numVal}`;
    } else if (key === "maxRetentionDays") {
      if (lbl) lbl.textContent = `${numVal} dias`;
      if (spec) spec.textContent = `${numVal}d`;
    }
  };

  window.toggleCategoryPref = function (catKey, checked) {
    state.preferences.allowedCategories[catKey] = checked;
    syncPreferencesToExtension();
    renderPreferences();
  };

  window.applyPreferencesToAllSites = function () {
    const allowThird = state.preferences.allowedCategories.thirdParty;
    const allowMkt = state.preferences.allowedCategories.marketing;
    const allowAna = state.preferences.allowedCategories.analytics;
    const maxTp = state.preferences.maxThirdPartyTrackers;
    let updatedCount = 0;

    state.sites.forEach((site) => {
      if (!allowThird && !allowMkt && !allowAna) {
        site.status = "essential_only";
        site.trackersBlocked = Math.max(0, site.trackersTotal - 1);
        site.trackersActive = 1;
        site.riskLevel = "low";
        updatedCount++;
      } else if (!allowThird && (site.thirdPartyCompanies > maxTp || !allowMkt)) {
        site.status = "essential_only";
        site.trackersBlocked = Math.max(0, site.trackersTotal - 2);
        site.trackersActive = Math.min(2, site.trackersTotal);
        site.riskLevel = "low";
        updatedCount++;
      } else if (site.thirdPartyCompanies > maxTp) {
        site.status = "essential_only";
        site.trackersBlocked = Math.max(1, site.thirdPartyCompanies - maxTp);
        site.trackersActive = Math.max(1, site.trackersTotal - site.trackersBlocked);
        site.riskLevel = "medium";
        updatedCount++;
      } else {
        site.status = "full";
        site.trackersActive = site.trackersTotal;
        site.trackersBlocked = 0;
        updatedCount++;
      }
    });

    window.postMessage({ source: "DATALENS_WEB_APP", type: "DASHBOARD_BULK_PROTECT" }, "*");
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
      chrome.runtime.sendMessage({ type: "PROTECT_ALL_REAL_SITES" });
    }

    showToast(
      "Política sincronizada no inventário",
      `${updatedCount} domínios ajustados conforme seus limites globais.`,
      "low"
    );
    renderAll();
  };

  window.toggleAcademicModal = function (show) {
    const modal = document.getElementById("academic-modal");
    if (modal) modal.classList.toggle("hidden", !show);
  };

  function renderKPIs(metrics) {
    const elTotalSites = document.getElementById("kpi-total-sites");
    const elExposure = document.getElementById("kpi-exposure-index");
    const elExposureBar = document.getElementById("kpi-exposure-bar");
    const elExposureBadge = document.getElementById("kpi-exposure-badge");
    const elBlocked = document.getElementById("kpi-blocked-trackers");
    const elActive = document.getElementById("kpi-active-trackers");

    if (elTotalSites) elTotalSites.textContent = metrics.totalSites;
    if (elExposure) elExposure.textContent = `${metrics.exposureIndex}%`;
    if (elBlocked) elBlocked.textContent = metrics.blockedTrackers;
    if (elActive) elActive.textContent = `${metrics.activeTrackers} ativos / ${metrics.totalTrackers} total`;

    if (elExposureBar) {
      elExposureBar.style.width = `${metrics.exposureIndex}%`;
      elExposureBar.style.backgroundColor =
        metrics.exposureIndex > 60
          ? "var(--sem-high)"
          : metrics.exposureIndex > 30
          ? "var(--sem-med)"
          : "var(--sem-low)";
    }

    if (elExposureBadge) {
      if (metrics.exposureIndex > 60) {
        elExposureBadge.className = "dl-badge dl-badge-high";
        elExposureBadge.textContent = "Risco Elevado";
      } else if (metrics.exposureIndex > 30) {
        elExposureBadge.className = "dl-badge dl-badge-medium";
        elExposureBadge.textContent = "Moderado";
      } else {
        elExposureBadge.className = "dl-badge dl-badge-low";
        elExposureBadge.textContent = "Controlado";
      }
    }
  }

  function renderAll() {
    saveLocalState();
    const metrics = computeMetrics();
    renderKPIs(metrics);
    renderCategoryChart(metrics);
    renderTimelineChart();
    renderSitesList();
    renderSimulator();
    renderPreferences();
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadLocalState();
    const searchInput = document.getElementById("search-input");
    const riskSel = document.getElementById("filter-risk");
    const dateSel = document.getElementById("filter-date");
    const catSel = document.getElementById("filter-category");

    // Atalhos Globais de Teclado (Acessibilidade & UX estilo Linear / shadcn)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        window.toggleAcademicModal(false);
        if (state.activeTab === "simulator" && state.simulator.overlayOpen) {
          window.toggleSimulatorOverlay(false);
        }
      } else if (
        (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) &&
        document.activeElement !== searchInput &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
      ) {
        e.preventDefault();
        if (state.activeTab !== "dashboard") {
          window.switchTab("dashboard");
        }
        if (searchInput) searchInput.focus();
      }
    });

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        state.filters.search = e.target.value;
        renderSitesList();
      });
    }
    if (riskSel) {
      riskSel.addEventListener("change", (e) => {
        state.filters.risk = e.target.value;
        renderSitesList();
      });
    }
    if (dateSel) {
      dateSel.addEventListener("change", (e) => {
        state.filters.date = e.target.value;
        renderSitesList();
      });
    }
    if (catSel) {
      catSel.addEventListener("change", (e) => {
        state.filters.category = e.target.value;
        renderSitesList();
      });
    }

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");

      if (action === "switch-tab") {
        window.switchTab(btn.getAttribute("data-tab"));
      } else if (action === "toggle-theme") {
        window.toggleTheme();
      } else if (action === "academic-modal") {
        window.toggleAcademicModal(btn.getAttribute("data-show") === "true");
      } else if (action === "bulk-action") {
        window.handleBulkAction(btn.getAttribute("data-mode"));
      } else if (action === "chart-mode") {
        window.setChartMode(btn.getAttribute("data-mode"));
      } else if (action === "reset-filters") {
        window.resetFilters();
      } else if (action === "category-filter") {
        window.setCategoryFilter(btn.getAttribute("data-category"));
      } else if (action === "site-action") {
        window.handleSiteAction(
          btn.getAttribute("data-site-id"),
          btn.getAttribute("data-type")
        );
      } else if (action === "toggle-row-detail") {
        const id = btn.getAttribute("data-site-id");
        state.expandedSiteIds[id] = !state.expandedSiteIds[id];
        renderSitesList();
      } else if (action === "select-sim-scenario") {
        window.selectSimScenario(btn.getAttribute("data-scenario-id"));
      } else if (action === "toggle-sim-overlay") {
        const forceAttr = btn.getAttribute("data-force");
        if (forceAttr !== null) {
          window.toggleSimulatorOverlay(forceAttr === "true");
        } else {
          window.toggleSimulatorOverlay();
        }
      } else if (action === "toggle-sim-viewmode") {
        window.toggleSimViewMode();
      } else if (action === "sim-decision") {
        window.applySimulatorDecision(btn.getAttribute("data-decision"));
      } else if (action === "toggle-pref") {
        window.togglePreference(btn.getAttribute("data-pref-key"));
      } else if (action === "apply-prefs-all") {
        window.applyPreferencesToAllSites();
      } else if (action === "export-report") {
        window.exportPrivacyReport(btn.getAttribute("data-format") || "json");
      } else if (action === "close-toast") {
        const card = btn.closest(".dl-card");
        if (card) card.remove();
      }
    });

    document.addEventListener("change", (e) => {
      const el = e.target.closest("[data-change]");
      if (!el) return;
      const changeType = el.getAttribute("data-change");

      if (changeType === "sim-custom-cat") {
        window.toggleSimCustomCat(el.getAttribute("data-cat"), el.checked);
      } else if (changeType === "category-pref") {
        window.toggleCategoryPref(el.getAttribute("data-cat"), el.checked);
      }
    });

    document.addEventListener("input", (e) => {
      const el = e.target.closest("[data-input]");
      if (!el) return;
      if (el.getAttribute("data-input") === "slider-pref") {
        window.updateSliderPreference(el.getAttribute("data-pref-key"), el.value);
      }
    });

    function mergeExtensionData(realSites, extPrefs) {
      if (Array.isArray(realSites) && realSites.length > 0) {
        const mockSites = state.sites.filter((s) => !s.isRealSite);
        state.sites = [...realSites, ...mockSites];
      }
      if (extPrefs) {
        state.preferences = { ...state.preferences, ...extPrefs };
      }
      renderAll();
    }

    window.addEventListener("message", (event) => {
      if (
        event.data &&
        event.data.source === "DATALENS_EXTENSION" &&
        event.data.type === "EXTENSION_STATE_SYNC"
      ) {
        const { realSites, preferences } = event.data.payload || {};
        mergeExtensionData(realSites, preferences);
      }
    });

    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["datalens_sites", "datalens_preferences"], (data) => {
        mergeExtensionData(data.datalens_sites || [], data.datalens_preferences);
      });
      chrome.storage.onChanged.addListener(() => {
        chrome.storage.local.get(["datalens_sites", "datalens_preferences"], (data) => {
          mergeExtensionData(data.datalens_sites || [], data.datalens_preferences);
        });
      });
    }

    renderAll();
  });
})();
