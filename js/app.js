/**
 * DataLens — Painel de Transparência e Controle Ativo de Dados Pessoais
 * Lógica Interativa, Gráficos SVG Dinâmicos e Simulador da Extensão Web
 * UFABC • Interação Humano-Computador (2026) • Grupo DataLens (GC5)
 */

(function () {
  // Clonagem profunda dos dados iniciais para permitir reset
  const cloneData = (obj) => JSON.parse(JSON.stringify(obj));

  const state = {
    activeTab: "dashboard", // 'dashboard' | 'simulator' | 'preferences' | 'research'
    sites: cloneData(window.DATALENS_INITIAL_DATA.sites),
    preferences: cloneData(window.DATALENS_INITIAL_DATA.preferences),
    simulatorScenarios: cloneData(window.DATALENS_INITIAL_DATA.simulatorScenarios),
    timelineHistory: cloneData(window.DATALENS_INITIAL_DATA.timelineHistory),
    filters: {
      search: "",
      risk: "all",       // 'all' | 'high' | 'medium' | 'low'
      date: "all",       // 'all' | 'today' | 'week'
      category: "all"    // 'all' | 'essential' | 'analytics' | 'marketing' | 'thirdParty'
    },
    simulator: {
      currentScenarioId: "sim-ecommerce",
      viewMode: "datalens", // 'datalens' (Cartão de Síntese Veloz) | 'darkpattern' (Banner Tradicional Comparativo)
      overlayOpen: true,
      customSelectOpen: false,
      selectedCustomCategories: {
        essential: true,
        analytics: false,
        marketing: false,
        thirdParty: false
      },
      decisionMade: null, // null | 'rejected' | 'selected' | 'accepted' | 'auto_blocked'
      configDrawerOpen: false
    },
    chartMode: "donut" // 'donut' | 'bars'
  };

  // Ícones SVG Inline (inspirados em Lucide Icons, garantem funcionamento 100% offline/CSP-safe)
  const ICONS = {
    shield: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    shieldCheck: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path stroke-linecap="round" stroke-linejoin="round" d="m9 12 2 2 4-4"/></svg>`,
    shieldAlert: `<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 16h.01"/></svg>`,
    eye: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
    eyeOff: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path stroke-linecap="round" stroke-linejoin="round" d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
    lock: `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
    trash: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>`,
    sliders: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg>`,
    check: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`,
    xCircle: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`,
    globe: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
    search: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
    refresh: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>`,
    externalLink: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>`,
    sparkles: `<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>`
  };

  // Mapeamento Semiótico de Categorias e Riscos
  const CATEGORY_META = {
    essential: {
      label: "Essenciais / Seguros",
      shortLabel: "Essenciais",
      color: "#10B981", // Verde Semiótico
      bgClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      dotClass: "bg-emerald-400"
    },
    analytics: {
      label: "Desempenho / Analytics",
      shortLabel: "Analytics",
      color: "#F59E0B", // Amarelo Semiótico
      bgClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      dotClass: "bg-amber-400"
    },
    marketing: {
      label: "Marketing / Publicidade",
      shortLabel: "Marketing",
      color: "#F97316", // Laranja Alerta
      bgClass: "bg-orange-500/15 text-orange-300 border-orange-500/30",
      dotClass: "bg-orange-400"
    },
    thirdParty: {
      label: "Rastreamento de Terceiros",
      shortLabel: "Terceiros",
      color: "#EF4444", // Vermelho Alto Risco
      bgClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      dotClass: "bg-rose-500"
    }
  };

  const RISK_META = {
    low: {
      label: "Baixo Risco (Seguro)",
      badge: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40",
      dot: "bg-emerald-400",
      hex: "#10B981"
    },
    medium: {
      label: "Médio Risco (Atenção)",
      badge: "bg-amber-500/20 text-amber-300 border border-amber-500/40",
      dot: "bg-amber-400",
      hex: "#F59E0B"
    },
    high: {
      label: "Alto Risco (Exposição)",
      badge: "bg-rose-500/20 text-rose-300 border border-rose-500/40",
      dot: "bg-rose-500 pulse-danger",
      hex: "#EF4444"
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
    let maxPossiblePoints = totalSites * 100;

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

      // Calcula pontos de risco baseados no status atual do site
      if (site.status === "full") {
        riskPoints += site.riskLevel === "high" ? 95 : site.riskLevel === "medium" ? 55 : 15;
      } else if (site.status === "essential_only") {
        riskPoints += 12; // Apenas essenciais reduz drasticamente a exposição
      } else if (site.status === "revoked") {
        riskPoints += 0;
      }

      // Contabiliza dados coletados ativos por categoria
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

    // Atualiza o ponto "Hoje" na linha do tempo dinamicamente
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
  // SISTEMA DE FEEDBACK VISUAL (TOAST NOTIFICATIONS)
  // ============================================================================
  function showToast(title, message, type = "teal") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const colors = {
      teal: "border-teal-500/60 bg-slate-900/95 text-teal-300",
      emerald: "border-emerald-500/60 bg-slate-900/95 text-emerald-300",
      amber: "border-amber-500/60 bg-slate-900/95 text-amber-300",
      rose: "border-rose-500/60 bg-slate-900/95 text-rose-300"
    };

    const toast = document.createElement("div");
    toast.className = `toast-enter flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md max-w-md ${colors[type] || colors.teal}`;
    toast.innerHTML = `
      <div class="mt-0.5 shrink-0">${ICONS.shieldCheck}</div>
      <div class="flex-1 text-xs">
        <p class="font-bold text-slate-100 text-sm">${title}</p>
        <p class="text-slate-300 mt-0.5 leading-relaxed">${message}</p>
      </div>
      <button class="text-slate-400 hover:text-slate-200 text-xs font-bold px-1" data-action="close-toast">✕</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(30px)";
        setTimeout(() => toast.remove(), 200);
      }
    }, 4200);
  }

  // ============================================================================
  // AÇÕES DE MANIPULAÇÃO DIRETA NOS SITES (MÓDULO 1)
  // ============================================================================
  window.handleSiteAction = function (siteId, actionType) {
    const site = state.sites.find((s) => s.id === siteId);
    if (!site) return;

    if (actionType === "essential_only") {
      const newlyBlocked = site.trackersTotal - 1;
      site.status = "essential_only";
      site.trackersActive = 1;
      site.trackersBlocked = Math.max(0, newlyBlocked);
      site.riskLevel = "low";
      if (site.isRealSite) {
        window.postMessage({
          source: "DATALENS_WEB_APP",
          type: "DASHBOARD_COOKIE_ACTION",
          payload: { domain: site.domain, url: site.url, mode: "non_essential" }
        }, "*");
      }
      showToast(
        `Modo "Apenas Essenciais" Aplicado`,
        `Em ${site.name}: ${site.trackersBlocked} rastreadores secundários e de terceiros foram bloqueados. Funcionalidade básica preservada.`,
        "emerald"
      );
    } else if (actionType === "revoke") {
      site.status = "revoked";
      site.trackersBlocked = site.trackersTotal;
      site.trackersActive = 0;
      site.riskLevel = "low";
      if (site.isRealSite) {
        window.postMessage({
          source: "DATALENS_WEB_APP",
          type: "DASHBOARD_COOKIE_ACTION",
          payload: { domain: site.domain, url: site.url, mode: "all" }
        }, "*");
      }
      showToast(
        `Permissões Revogadas com Sucesso`,
        `Todos os ${site.trackersTotal} coletores e compartilhamentos com ${site.thirdPartyCompanies} terceiros em ${site.name} foram interrompidos.`,
        "rose"
      );
    } else if (actionType === "clear_cookies") {
      site.status = "essential_only";
      site.trackersBlocked = site.trackersTotal;
      site.trackersActive = 0;
      site.riskLevel = "low";
      if (site.isRealSite) {
        window.postMessage({
          source: "DATALENS_WEB_APP",
          type: "DASHBOARD_COOKIE_ACTION",
          payload: { domain: site.domain, url: site.url, mode: "all" }
        }, "*");
      }
      showToast(
        `Cookies e Identificadores Limpos`,
        `Armazenamento local, hashes de retargeting e tokens de ${site.domain} foram apagados do navegador.`,
        "teal"
      );
    } else if (actionType === "restore") {
      const orig = window.DATALENS_INITIAL_DATA.sites.find((s) => s.id === siteId);
      if (orig) {
        Object.assign(site, cloneData(orig));
        showToast(
          `Estado Original Restaurado`,
          `O perfil inicial de coleta de ${site.name} foi reativado para fins de simulação.`,
          "amber"
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
      showToast(
        "Escudo Profilático Global Ativado",
        `Todos os sites monitorados foram restritos a "Apenas Essenciais". ${totalRevoked} rastreadores foram neutralizados simultaneamente!`,
        "emerald"
      );
    } else if (mode === "reset_demo") {
      state.sites = cloneData(window.DATALENS_INITIAL_DATA.sites);
      state.timelineHistory = cloneData(window.DATALENS_INITIAL_DATA.timelineHistory);
      showToast(
        "Dados de Simulação Restaurados",
        "Todos os 10 sites voltaram ao estado original de exposição para novos testes de IHC.",
        "amber"
      );
    }
    renderAll();
  };

  // ============================================================================
  // RENDERIZAÇÃO DOS GRÁFICOS INTERATIVOS (MÓDULO 1.2)
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
      // Gráfico de Rosca SVG Vetorial Responsivo
      const radius = 64;
      const circumference = 2 * Math.PI * radius;
      let accumulatedPercent = 0;

      const segmentsSvg = items
        .map((item) => {
          const pct = item.count / total;
          const strokeDasharray = `${pct * circumference} ${circumference}`;
          const strokeDashoffset = -accumulatedPercent * circumference;
          accumulatedPercent += pct;
          return `<circle cx="90" cy="90" r="${radius}" fill="transparent" stroke="${item.color}" stroke-width="24" stroke-dasharray="${strokeDasharray}" stroke-dashoffset="${strokeDashoffset}" class="cursor-pointer hover:opacity-80" data-action="category-filter" data-category="${item.key}"><title>${item.label}: ${item.count} tipos ativos (${Math.round(pct * 100)}%)</title></circle>`;
        })
        .join("");

      container.innerHTML = `
        <div class="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div class="relative flex items-center justify-center shrink-0">
            <svg width="180" height="180" viewBox="0 0 180 180" class="-rotate-90 transform">
              <circle cx="90" cy="90" r="${radius}" fill="transparent" stroke="#1E293B" stroke-width="24"></circle>
              ${segmentsSvg}
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span class="text-2xl font-extrabold text-slate-100">${total}</span>
              <span class="text-xs text-slate-400">Coletas Ativas</span>
            </div>
          </div>
          <div class="flex-1 w-full space-y-2.5">
            ${items
              .map((item) => {
                const pct = Math.round((item.count / total) * 100);
                const isSelected = state.filters.category === item.key;
                return `
                  <button data-action="category-filter" data-category="${item.key}" class="w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                  isSelected
                    ? "bg-slate-800 border-teal-500 ring-1 ring-teal-500/50"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }">
                    <div class="flex items-center gap-2.5">
                      <span class="w-3 h-3 rounded-full shrink-0" style="background-color:${item.color}"></span>
                      <span class="text-xs font-medium text-slate-200">${item.label}</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-slate-100">${item.count}</span>
                      <span class="text-xs text-slate-400 w-9 text-right">(${pct}%)</span>
                    </div>
                  </button>
                `;
              })
              .join("")}
            <p class="text-xs text-slate-400 pt-1">💡 Dica de Manipulação Direta: Clique em uma categoria para filtrar a tabela de sites abaixo.</p>
          </div>
        </div>
      `;
    } else {
      // Gráfico de Barras Horizontais Comparativas
      container.innerHTML = `
        <div class="space-y-4 py-2">
          ${items
            .map((item) => {
              const pct = Math.round((item.count / total) * 100);
              return `
                <div class="space-y-1.5 cursor-pointer group" data-action="category-filter" data-category="${item.key}">
                  <div class="flex justify-between text-xs">
                    <span class="font-semibold text-slate-200 group-hover:text-teal-300 flex items-center gap-2">
                      <span class="w-2.5 h-2.5 rounded-full" style="background:${item.color}"></span>
                      ${item.label}
                    </span>
                    <span class="text-slate-300 font-bold">${item.count} pontos de coleta (${pct}%)</span>
                  </div>
                  <div class="w-full h-3.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${Math.max(pct, 4)}%; background-color: ${item.color}"></div>
                  </div>
                </div>
              `;
            })
            .join("")}
          <p class="text-xs text-slate-400 pt-2">💡 Clique em qualquer barra para filtrar os sites correspondentes.</p>
        </div>
      `;
    }
  }

  function renderTimelineChart() {
    const container = document.getElementById("timeline-chart-container");
    if (!container) return;

    const history = state.timelineHistory;
    const width = 520;
    const height = 175;
    const padX = 36;
    const padY = 24;
    const plotW = width - padX * 2;
    const plotH = height - padY * 2;

    // Pontos para a curva de Índice de Exposição (%)
    const expPoints = history.map((d, idx) => {
      const x = padX + (idx / (history.length - 1)) * plotW;
      const y = padY + plotH - (d.exposureScore / 100) * plotH;
      return { x, y, ...d };
    });

    // Pontos para Rastreadores Bloqueados
    const maxBlocked = Math.max(100, ...history.map((d) => d.trackersBlocked));
    const blkPoints = history.map((d, idx) => {
      const x = padX + (idx / (history.length - 1)) * plotW;
      const y = padY + plotH - (d.trackersBlocked / maxBlocked) * plotH;
      return { x, y, ...d };
    });

    const expPolyline = expPoints.map((p) => `${p.x},${p.y}`).join(" ");
    const expArea = `${padX},${padY + plotH} ${expPolyline} ${padX + plotW},${padY + plotH}`;
    const blkPolyline = blkPoints.map((p) => `${p.x},${p.y}`).join(" ");

    container.innerHTML = `
      <div class="w-full overflow-x-auto">
        <svg viewBox="0 0 ${width} ${height}" class="w-full h-44 overflow-visible">
          <defs>
            <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#EF4444" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#EF4444" stop-opacity="0.0"/>
            </linearGradient>
          </defs>
          <!-- Linhas guia horizontais -->
          <line x1="${padX}" y1="${padY}" x2="${width - padX}" y2="${padY}" stroke="#1E293B" stroke-dasharray="4"/>
          <line x1="${padX}" y1="${padY + plotH / 2}" x2="${width - padX}" y2="${padY + plotH / 2}" stroke="#1E293B" stroke-dasharray="4"/>
          <line x1="${padX}" y1="${padY + plotH}" x2="${width - padX}" y2="${padY + plotH}" stroke="#334155"/>

          <!-- Área e Linha de Exposição Digital -->
          <polygon points="${expArea}" fill="url(#expGrad)" />
          <polyline fill="none" stroke="#EF4444" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${expPolyline}" />

          <!-- Linha de Rastreadores Bloqueados -->
          <polyline fill="none" stroke="#14B8A6" stroke-width="2.5" stroke-dasharray="5,3" stroke-linecap="round" stroke-linejoin="round" points="${blkPolyline}" />

          <!-- Pontos interativos -->
          ${expPoints
            .map(
              (p) => `
            <g class="group cursor-pointer">
              <circle cx="${p.x}" cy="${p.y}" r="5" fill="#EF4444" stroke="#0F172A" stroke-width="2" />
              <text x="${p.x}" y="${p.y - 10}" text-anchor="middle" fill="#FDA4AF" font-size="11" font-weight="bold">${p.exposureScore}%</text>
              <text x="${p.x}" y="${height - 4}" text-anchor="middle" fill="#94A3B8" font-size="11">${p.dateLabel}</text>
            </g>
          `
            )
            .join("")}

          ${blkPoints
            .map(
              (p) => `
            <g class="cursor-pointer">
              <circle cx="${p.x}" cy="${p.y}" r="4" fill="#14B8A6" stroke="#0F172A" stroke-width="1.5">
                <title>${p.dateLabel}: ${p.trackersBlocked} rastreadores bloqueados</title>
              </circle>
            </g>
          `
            )
            .join("")}
        </svg>
        <div class="flex flex-wrap items-center justify-between gap-4 mt-2 pt-2 border-t border-slate-800/80 text-xs">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1.5 text-rose-300 font-medium">
              <span class="w-3 h-1 bg-rose-500 rounded"></span> Índice de Exposição (%)
            </span>
            <span class="flex items-center gap-1.5 text-teal-300 font-medium">
              <span class="w-3 h-1 bg-teal-400 rounded"></span> Rastreadores Bloqueados (Acumulado)
            </span>
          </div>
          <span class="text-slate-400">Atualizado em tempo real conforme suas revogações</span>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // RENDERIZAÇÃO DA LISTA DE SITES E FILTROS (MÓDULO 1.3)
  // ============================================================================
  function getFilteredSites() {
    return state.sites.filter((site) => {
      // Busca textual
      const q = state.filters.search.trim().toLowerCase();
      if (
        q &&
        !site.name.toLowerCase().includes(q) &&
        !site.domain.toLowerCase().includes(q) &&
        !site.category.toLowerCase().includes(q)
      ) {
        return false;
      }

      // Filtro de Nível de Risco
      if (state.filters.risk !== "all" && site.riskLevel !== state.filters.risk) {
        return false;
      }

      // Filtro de Data
      if (state.filters.date === "today" && site.lastAccess !== "2026-11-08") {
        return false;
      }
      if (
        state.filters.date === "recent" &&
        !["2026-11-08", "2026-11-07", "2026-11-06"].includes(site.lastAccess)
      ) {
        return false;
      }

      // Filtro de Categoria de Dado Coletado
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
      countBadge.textContent = `${filtered.length} de ${state.sites.length} sites exibidos`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="bg-slate-900/70 border border-slate-800 rounded-2xl p-10 text-center space-y-3">
          <div class="w-12 h-12 rounded-full bg-slate-800 text-teal-400 flex items-center justify-center mx-auto">
            ${ICONS.search}
          </div>
          <h4 class="text-base font-bold text-slate-200">Nenhum site encontrado com os filtros atuais</h4>
          <p class="text-xs text-slate-400 max-w-md mx-auto">Experimente limpar os filtros de nível de risco, data ou categoria para visualizar todo o histórico monitorado.</p>
          <button data-action="reset-filters" class="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold">
            Limpar Todos os Filtros
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered
      .map((site) => {
        const riskInfo = RISK_META[site.riskLevel];
        const statusBadge =
          site.status === "full"
            ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">Coleta Total Ativa (${site.trackersActive} rastreadores)</span>`
            : site.status === "essential_only"
            ? `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">Apenas Essenciais (${site.trackersBlocked} bloqueados)</span>`
            : `<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/40">Permissão Revogada (${site.trackersBlocked} bloqueados)</span>`;

        const formatDate = (dateStr) => {
          const [y, m, d] = dateStr.split("-");
          return dateStr === "2026-11-08" ? `Hoje (${d}/${m})` : `${d}/${m}/${y}`;
        };

        return `
          <div class="bg-slate-900/90 border ${
            site.riskLevel === "high"
              ? "border-rose-500/30 hover:border-rose-500/50"
              : site.riskLevel === "medium"
              ? "border-amber-500/30 hover:border-amber-500/50"
              : "border-slate-800 hover:border-teal-500/40"
          } rounded-2xl p-5 shadow-lg transition flex flex-col justify-between gap-4">
            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800/80 pb-3.5">
              <div class="flex items-start sm:items-center gap-3.5">
                <div class="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400 font-bold text-base shrink-0">
                  ${site.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div class="flex flex-wrap items-center gap-2">
                    <h4 class="text-base font-bold text-slate-100">${site.name}</h4>
                    <span class="text-xs text-slate-400 font-mono">${site.domain}</span>
                    ${
                      site.isRealSite
                        ? `<span class="px-2 py-0.5 rounded-md text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40">⚡ Coleta Real da Extensão (${site.cookieCount || 0} cookies)</span>`
                        : `<span class="px-2 py-0.5 rounded text-xs bg-slate-800 text-slate-300">${site.category}</span>`
                    }
                  </div>
                  <div class="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>Último acesso: <strong class="text-slate-300">${formatDate(site.lastAccess)} às ${site.accessTime}</strong></span>
                    <span>•</span>
                    <span>Terceiros vinculados: <strong class="${site.thirdPartyCompanies > 5 && site.status === "full" ? "text-rose-400" : "text-slate-300"}">${site.status === "full" ? site.thirdPartyCompanies : 0} empresas</strong></span>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${riskInfo.badge}">
                  <span class="w-2 h-2 rounded-full ${riskInfo.dot}"></span>
                  ${riskInfo.label}
                </span>
                ${statusBadge}
              </div>
            </div>

            <!-- Dados Coletados e Explicação Sem Jargão -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              <div class="lg:col-span-7 space-y-2">
                <p class="text-xs font-semibold uppercase tracking-wider text-slate-400">Dados Coletados & Significadores de Risco:</p>
                <div class="flex flex-wrap gap-2">
                  ${site.dataCollected
                    .map((item) => {
                      const catMeta = CATEGORY_META[item.category];
                      const isBlocked =
                        site.status === "revoked" ||
                        (site.status === "essential_only" && item.category !== "essential");
                      return `
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium ${
                          isBlocked
                            ? "bg-slate-800/40 text-slate-500 border-slate-800 line-through"
                            : catMeta.bgClass
                        }" title="Categoria: ${catMeta.label}">
                          <span class="w-2 h-2 rounded-full ${isBlocked ? "bg-slate-600" : catMeta.dotClass}"></span>
                          ${item.label}
                          ${isBlocked ? `<span class="text-[11px] not-italic no-underline text-teal-400 ml-1">(Bloqueado)</span>` : ""}
                        </span>
                      `;
                    })
                    .join("")}
                </div>
                <p class="text-xs text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-lg p-2.5 leading-relaxed">
                  <strong class="text-teal-400">Síntese em Linguagem Clara:</strong> ${site.purposeSummary}
                </p>
              </div>

              <!-- Botões de Ação Rápida (Manipulação Direta sem Dark Patterns) -->
              <div class="lg:col-span-5 flex flex-wrap lg:justify-end items-center gap-2 pt-2 lg:pt-0">
                <button
                  data-action="site-action"
                  data-site-id="${site.id}"
                  data-type="essential_only"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                    site.status === "essential_only"
                      ? "bg-emerald-600/30 border-emerald-500 text-emerald-200 cursor-default"
                      : "bg-slate-800 hover:bg-emerald-600/20 text-emerald-300 border-emerald-500/40"
                  }"
                >
                  ${ICONS.shieldCheck}
                  Apenas Essenciais
                </button>

                <button
                  data-action="site-action"
                  data-site-id="${site.id}"
                  data-type="revoke"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                    site.status === "revoked"
                      ? "bg-rose-600/30 border-rose-500 text-rose-200 cursor-default"
                      : "bg-slate-800 hover:bg-rose-600/20 text-rose-300 border-rose-500/40"
                  }"
                >
                  ${ICONS.xCircle}
                  Revogar Permissão
                </button>

                <button
                  data-action="site-action"
                  data-site-id="${site.id}"
                  data-type="clear_cookies"
                  class="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-teal-600/20 text-teal-300 border border-teal-500/40 transition flex items-center gap-1.5"
                >
                  ${ICONS.trash}
                  Limpar Cookies
                </button>

                ${
                  site.status !== "full"
                    ? `<button data-action="site-action" data-site-id="${site.id}" data-type="restore" class="px-2.5 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition" title="Restaurar estado inicial de teste">${ICONS.refresh}</button>`
                    : ""
                }
              </div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ============================================================================
  // RENDERIZAÇÃO DO MÓDULO 2: SIMULADOR DA EXTENSÃO WEB (MEDIAÇÃO EFÊMERA)
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

    // Define cor semiótica do ícone da extensão na barra do navegador
    const extBadgeStyle =
      scenario.riskLevel === "high" && !state.simulator.decisionMade && !isAutoProtected
        ? "bg-rose-500/20 border-rose-500 text-rose-300 pulse-danger"
        : scenario.riskLevel === "medium" && !state.simulator.decisionMade
        ? "bg-amber-500/20 border-amber-500 text-amber-300"
        : "bg-emerald-500/20 border-emerald-500 text-emerald-300 pulse-safe";

    const currentBadgeLabel =
      state.simulator.decisionMade === "rejected" || isAutoProtected
        ? "Protegido • Terceiros Bloqueados"
        : state.simulator.decisionMade === "selected"
        ? "Personalizado • Limites Ativos"
        : state.simulator.decisionMade === "accepted"
        ? "Exposto • Coleta Total Permitida"
        : scenario.badgeText;

    container.innerHTML = `
      <!-- Barra de Controles de Cenário do Simulador -->
      <div class="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <span class="text-xs font-bold uppercase tracking-wider text-teal-400">Laboratório de Contexto de Navegação (Módulo 2)</span>
          <h3 class="text-base font-bold text-slate-100 mt-0.5">Escolha um site fictício para testar a mediação ativa da extensão DataLens:</h3>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          ${state.simulatorScenarios
            .map(
              (sc) => `
            <button
              data-action="select-sim-scenario"
              data-scenario-id="${sc.id}"
              class="px-3.5 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-2 ${
                sc.id === scenario.id
                  ? "bg-teal-600 text-white border-teal-400 shadow-lg shadow-teal-950/50"
                  : "bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600"
              }"
            >
              <span class="w-2 h-2 rounded-full ${
                sc.riskLevel === "high"
                  ? "bg-rose-400"
                  : sc.riskLevel === "medium"
                  ? "bg-amber-400"
                  : "bg-emerald-400"
              }"></span>
              ${sc.name}
            </button>
          `
            )
            .join("")}
        </div>
      </div>

      <!-- Moldura do Navegador Web Simulado -->
      <div class="rounded-2xl border-2 border-slate-700/80 bg-slate-950 shadow-2xl overflow-hidden">
        <!-- Barra Superior do Navegador com Ícone Discreto de Risco (Requisito B.1) -->
        <div class="bg-slate-900 border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 rounded-full bg-rose-500/80"></span>
            <span class="w-3 h-3 rounded-full bg-amber-500/80"></span>
            <span class="w-3 h-3 rounded-full bg-emerald-500/80"></span>
          </div>

          <!-- Barra de Endereço URL -->
          <div class="flex-1 max-w-xl bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 flex items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 truncate">
              <span class="text-teal-400">${ICONS.lock}</span>
              <span class="text-slate-300 font-mono truncate">${scenario.url}</span>
            </div>
            <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">HTTPS</span>
          </div>

          <!-- Ícone Discreto da Extensão DataLens na Barra do Navegador -->
          <div class="flex items-center gap-2">
            <button
              data-action="toggle-sim-overlay"
              class="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${extBadgeStyle}"
              title="Clique para abrir/fechar o Cartão de Síntese Veloz DataLens"
            >
              ${ICONS.shield}
              <span>DataLens: ${currentBadgeLabel}</span>
            </button>

            <button
              data-action="toggle-sim-viewmode"
              class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
              title="Alternar entre Banner Tradicional (Dark Pattern) e Síntese Veloz DataLens"
            >
              ${
                state.simulator.viewMode === "datalens"
                  ? "Ver Banner Tradicional (Dark Pattern)"
                  : "✨ Voltar para DataLens"
              }
            </button>
          </div>
        </div>

        <!-- Corpo da Página Web Simulada + Overlay de Mediação -->
        <div class="relative min-h-[540px] bg-slate-900/40 p-6 flex flex-col justify-between">
          <!-- Conteúdo de Fundo da Página Fictícia -->
          <div class="space-y-6 opacity-85">
            <div class="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span class="text-xs uppercase tracking-widest text-teal-400 font-semibold">Página Simulada em Execução</span>
                <h2 class="text-xl font-extrabold text-slate-100 mt-1">${scenario.pageTitle}</h2>
                <p class="text-xs text-slate-400 mt-0.5">${scenario.pageSubtitle}</p>
              </div>
              <div class="flex gap-2">
                <span class="px-3 py-1.5 rounded-lg bg-slate-800/90 text-xs text-slate-300">Início</span>
                <span class="px-3 py-1.5 rounded-lg bg-slate-800/90 text-xs text-slate-300">Catálogo</span>
                <span class="px-3 py-1.5 rounded-lg bg-slate-800/90 text-xs text-slate-300">Minha Conta</span>
              </div>
            </div>

            <!-- Cards Fictícios do Site para Contexto Visual -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 space-y-2">
                <div class="h-24 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-500 text-xs">
                  [Conteúdo Principal #1]
                </div>
                <div class="h-3 w-3/4 bg-slate-800 rounded"></div>
                <div class="h-2.5 w-1/2 bg-slate-800/70 rounded"></div>
              </div>
              <div class="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 space-y-2">
                <div class="h-24 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-500 text-xs">
                  [Conteúdo Principal #2]
                </div>
                <div class="h-3 w-2/3 bg-slate-800 rounded"></div>
                <div class="h-2.5 w-1/2 bg-slate-800/70 rounded"></div>
              </div>
              <div class="bg-slate-900/70 border border-slate-800/90 rounded-xl p-4 space-y-2">
                <div class="h-24 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-500 text-xs">
                  [Espaço de Mídia / Anúncio]
                </div>
                <div class="h-3 w-4/5 bg-slate-800 rounded"></div>
                <div class="h-2.5 w-1/3 bg-slate-800/70 rounded"></div>
              </div>
            </div>
          </div>

          <!-- Feedback quando Modo de Supressão ou Decisão Já Foi Tomada -->
          ${
            isSilentMode && isAutoProtected && !state.simulator.overlayOpen
              ? `
            <div class="my-auto mx-auto max-w-xl bg-slate-900/95 border border-teal-500/50 rounded-2xl p-6 text-center shadow-2xl space-y-3">
              <div class="w-12 h-12 rounded-full bg-teal-500/20 text-teal-300 flex items-center justify-center mx-auto">
                ${ICONS.shieldCheck}
              </div>
              <h3 class="text-base font-bold text-slate-100">Modo Silencioso + Bloqueio Profilático Ativos</h3>
              <p class="text-xs text-slate-300 leading-relaxed">
                O DataLens interceptou o banner deste site silenciosamente e bloqueou <strong>${scenario.synthesis.sharedWith.count} empresas terceiras</strong> sem interromper sua leitura.
              </p>
              <button data-action="toggle-sim-overlay" data-force="true" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-semibold border border-teal-500/30">
                Inspecionar Cartão de Síntese Veloz Mesmo Assim
              </button>
            </div>
          `
              : ""
          }

          <!-- OVERLAY: CARTÃO DE SÍNTESE VELOZ (5 SEGUNDOS) OU COMPARATIVO DARK PATTERN -->
          ${
            state.simulator.overlayOpen
              ? state.simulator.viewMode === "datalens"
                ? renderQuickSynthesisCard(scenario, isAutoProtected)
                : renderDarkPatternComparison(scenario)
              : `
            <div class="mt-6 bg-slate-900/95 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span class="text-teal-400">${ICONS.shieldCheck}</span>
                <p class="text-xs text-slate-200">
                  <strong>Decisão aplicada para ${scenario.name}:</strong> Você está navegando com controles de privacidade definidos pelo DataLens.
                </p>
              </div>
              <button data-action="toggle-sim-overlay" data-force="true" class="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold">
                Reabrir Cartão de Síntese (5s)
              </button>
            </div>
          `
          }
        </div>
      </div>
    `;
  }

  // Cartão de Síntese Veloz (Resumo em 5 Segundos - Requisito B.2)
  function renderQuickSynthesisCard(scenario, isAutoProtected) {
    const syn = scenario.synthesis;
    const riskMeta = RISK_META[scenario.riskLevel];

    return `
      <div class="relative z-10 my-4 mx-auto w-full max-w-4xl bg-slate-900/95 backdrop-blur-xl border-2 ${
        scenario.riskLevel === "high"
          ? "border-rose-500/50"
          : scenario.riskLevel === "medium"
          ? "border-amber-500/50"
          : "border-emerald-500/50"
      } rounded-2xl shadow-2xl p-6 space-y-5">
        
        <!-- Cabeçalho do Cartão de Síntese -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center shrink-0">
              ${ICONS.shield}
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-teal-400">DataLens • Cartão de Síntese Veloz (Leitura em 5s)</span>
                <span class="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300">Sem Jargão Jurídico</span>
              </div>
              <h3 class="text-base font-bold text-slate-100 mt-0.5">Tradução Transparente de Privacidade — ${scenario.name}</h3>
            </div>
          </div>

          <div class="flex items-center gap-2 self-start sm:self-center">
            <span class="px-3 py-1 rounded-full text-xs font-bold ${riskMeta.badge}">
              Score de Exposição: ${scenario.riskScore}/100
            </span>
            <button data-action="toggle-sim-overlay" data-force="false" class="text-slate-400 hover:text-slate-200 p-1 text-sm font-bold" title="Minimizar para a barra do navegador">✕</button>
          </div>
        </div>

        ${
          isAutoProtected
            ? `
          <div class="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between gap-3 text-xs text-emerald-200">
            <div class="flex items-center gap-2">
              ${ICONS.shieldCheck}
              <span><strong>Bloqueio Automático Profilático Ativo:</strong> Os rastreadores de alto risco deste site já foram pré-bloqueados conforme seu perfil padrão.</span>
            </div>
            <button data-action="switch-tab" data-tab="preferences" class="underline font-semibold shrink-0">Ajustar Regras</button>
          </div>
        `
            : ""
        }

        <!-- Os 3 Pontos Visuais Essenciais (Requisito B.2) -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <!-- 1. O que é coletado? -->
          <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-teal-400">1. O que é coletado?</span>
              <span class="text-xs text-slate-400">${syn.whatIsCollected.length} itens</span>
            </div>
            <ul class="space-y-2 text-xs">
              ${syn.whatIsCollected
                .map((item) => {
                  const dot =
                    item.risk === "high"
                      ? "bg-rose-500"
                      : item.risk === "medium"
                      ? "bg-amber-400"
                      : "bg-emerald-400";
                  return `
                    <li class="flex items-start gap-2 text-slate-200">
                      <span class="w-2 h-2 rounded-full ${dot} mt-1 shrink-0"></span>
                      <span>${item.label}</span>
                    </li>
                  `;
                })
                .join("")}
            </ul>
          </div>

          <!-- 2. Para qual finalidade? -->
          <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-400">2. Para qual finalidade?</span>
              <span class="text-xs text-slate-400">Uso real</span>
            </div>
            <ul class="space-y-2 text-xs">
              ${syn.purpose
                .map((item) => {
                  const dot =
                    item.risk === "high"
                      ? "bg-rose-500"
                      : item.risk === "medium"
                      ? "bg-amber-400"
                      : "bg-emerald-400";
                  return `
                    <li class="flex items-start gap-2 text-slate-200">
                      <span class="w-2 h-2 rounded-full ${dot} mt-1 shrink-0"></span>
                      <span>${item.label}</span>
                    </li>
                  `;
                })
                .join("")}
            </ul>
          </div>

          <!-- 3. Com quem é compartilhado? -->
          <div class="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold uppercase tracking-wider text-rose-400">3. Com quem é compartilhado?</span>
              <span class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-bold">${syn.sharedWith.count} terceiros</span>
            </div>
            <p class="text-xs text-slate-200 font-medium leading-relaxed">${syn.sharedWith.summary}</p>
            <div class="flex flex-wrap gap-1.5 pt-1">
              ${syn.sharedWith.entities
                .map(
                  (ent) => `
                <span class="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-300">${ent}</span>
              `
                )
                .join("")}
            </div>
          </div>
        </div>

        <!-- Painel Expansível para "Permitir Selecionados" (Granularidade Clara) -->
        ${
          state.simulator.customSelectOpen
            ? `
          <div class="bg-slate-950 border border-teal-500/40 rounded-xl p-4 space-y-3">
            <p class="text-xs font-bold text-teal-300">Selecione exatamente quais categorias deseja permitir neste site:</p>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <label class="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 opacity-80 cursor-not-allowed">
                <input type="checkbox" checked disabled class="rounded accent-teal-500" />
                <span class="text-slate-200 font-medium">Essenciais (Obrigatório)</span>
              </label>
              <label class="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-amber-500/50">
                <input type="checkbox" ${state.simulator.selectedCustomCategories.analytics ? "checked" : ""} data-change="sim-custom-cat" data-cat="analytics" class="rounded accent-teal-500" />
                <span class="text-slate-200 font-medium">Desempenho / Analytics</span>
              </label>
              <label class="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-orange-500/50">
                <input type="checkbox" ${state.simulator.selectedCustomCategories.marketing ? "checked" : ""} data-change="sim-custom-cat" data-cat="marketing" class="rounded accent-teal-500" />
                <span class="text-slate-200 font-medium">Marketing / Anúncios</span>
              </label>
              <label class="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer hover:border-rose-500/50">
                <input type="checkbox" ${state.simulator.selectedCustomCategories.thirdParty ? "checked" : ""} data-change="sim-custom-cat" data-cat="thirdParty" class="rounded accent-teal-500" />
                <span class="text-slate-200 font-medium">Terceiros (${syn.sharedWith.count})</span>
              </label>
            </div>
          </div>
        `
            : ""
        }

        <!-- Ações com Affordances Claras e Mesmo Peso Visual (Sem Dark Patterns - Requisito B.2) -->
        <div class="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-xs text-slate-400 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-teal-400"></span>
            <span><strong>Design Equânime (Norman):</strong> Todos os 3 botões possuem exatamente o mesmo peso visual, tamanho e contraste.</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto shrink-0">
            <button
              data-action="sim-decision"
              data-decision="rejected"
              class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-100 border border-slate-600 hover:border-teal-400 text-xs font-bold transition text-center shadow-sm"
            >
              Rejeitar Não-Essenciais
            </button>

            <button
              data-action="sim-decision"
              data-decision="selected"
              class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-100 border border-slate-600 hover:border-teal-400 text-xs font-bold transition text-center shadow-sm"
            >
              ${state.simulator.customSelectOpen ? "Confirmar Selecionados" : "Permitir Selecionados"}
            </button>

            <button
              data-action="sim-decision"
              data-decision="accepted"
              class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-teal-600 text-slate-100 border border-slate-600 hover:border-teal-400 text-xs font-bold transition text-center shadow-sm"
            >
              Aceitar Tudo
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // Comparativo educativo mostrando o Banner Tradicional com Dark Patterns que o DataLens substituiu
  function renderDarkPatternComparison(scenario) {
    return `
      <div class="relative z-10 my-4 mx-auto w-full max-w-3xl bg-slate-900 border-2 border-amber-500/60 rounded-2xl shadow-2xl p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <span class="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-bold">
            ⚠️ Exemplo de Banner Tradicional (Com Dark Patterns) Substituído pelo DataLens
          </span>
          <button data-action="toggle-sim-viewmode" class="text-xs text-teal-400 hover:underline font-bold">
            Restaurar Síntese DataLens →
          </button>
        </div>
        <p class="text-xs text-slate-400 leading-relaxed">
          ${scenario.darkPatternBannerText}
        </p>
        <div class="flex items-center justify-end gap-3 pt-2">
          <button data-action="toggle-sim-viewmode" class="text-xs text-slate-500 underline">
            gerenciar preferências avançadas (14 cliques)
          </button>
          <button data-action="toggle-sim-viewmode" class="px-6 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-extrabold text-xs shadow-lg">
            ACEITAR E CONTINUAR NAVEGANDO
          </button>
        </div>
        <p class="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5">
          <strong>Análise de IHC:</strong> Note a assimetria visual (botão "Aceitar" gigante em verde vs. link escondido de baixo contraste) e o texto prolixo. O DataLens elimina essa sobrecarga cognitiva.
        </p>
      </div>
    `;
  }

  // ============================================================================
  // RENDERIZAÇÃO DO FORMULÁRIO DE PREFERÊNCIAS E LIMITES (MÓDULO 2.3)
  // ============================================================================
  function renderPreferences() {
    const container = document.getElementById("preferences-mount");
    if (!container) return;

    const p = state.preferences;

    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Coluna Principal: Controles de Automação e Limites -->
        <div class="lg:col-span-8 space-y-6">
          <!-- Card 1: Automação e Mediação Efêmera -->
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div class="border-b border-slate-800 pb-4">
              <span class="text-xs font-bold uppercase tracking-wider text-teal-400">Preenchimento de Formulários & Regras Globais</span>
              <h3 class="text-lg font-bold text-slate-100 mt-0.5">Automação Contra Fadiga de Consentimento</h3>
              <p class="text-xs text-slate-400 mt-1">Configure como a extensão DataLens deve agir preventivamente ao acessar novos domínios.</p>
            </div>

            <!-- Toggle 1: Bloqueio Automático Profilático -->
            <div class="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-slate-100">Bloqueio Automático Profilático</span>
                  <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-300">Recomendado</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Rejeita automaticamente rastreadores de terceiros e cookies de publicidade assim que uma página é carregada, aplicando seu perfil padrão sem exigir cliques repetitivos.
                </p>
              </div>
              <button
                data-action="toggle-pref"
                data-pref-key="prophylacticBlock"
                class="w-14 h-7 rounded-full p-1 transition shrink-0 ${
                  p.prophylacticBlock ? "bg-teal-600" : "bg-slate-700"
                }"
                aria-label="Alternar Bloqueio Automático Profilático"
              >
                <div class="w-5 h-5 rounded-full bg-white transition transform ${
                  p.prophylacticBlock ? "translate-x-7" : "translate-x-0"
                }"></div>
              </button>
            </div>

            <!-- Toggle 2: Modo de Supressão de Notificações -->
            <div class="flex items-start justify-between gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-bold text-slate-100">Modo de Supressão de Notificações (Navegação Silenciosa)</span>
                </div>
                <p class="text-xs text-slate-400 leading-relaxed">
                  Oculta banners de cookies e aplica suas regras silenciosamente em segundo plano. O Cartão de Síntese Veloz só será exibido se você clicar no ícone da barra do navegador.
                </p>
              </div>
              <button
                data-action="toggle-pref"
                data-pref-key="notificationSuppression"
                class="w-14 h-7 rounded-full p-1 transition shrink-0 ${
                  p.notificationSuppression ? "bg-teal-600" : "bg-slate-700"
                }"
                aria-label="Alternar Modo de Supressão de Notificações"
              >
                <div class="w-5 h-5 rounded-full bg-white transition transform ${
                  p.notificationSuppression ? "translate-x-7" : "translate-x-0"
                }"></div>
              </button>
            </div>
          </div>

          <!-- Card 2: Sliders e Checkboxes de Limites de Privacidade Aceitáveis -->
          <div class="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div class="border-b border-slate-800 pb-4">
              <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Calibragem Granular</span>
              <h3 class="text-lg font-bold text-slate-100 mt-0.5">Limites de Privacidade Aceitáveis</h3>
              <p class="text-xs text-slate-400 mt-1">Defina os tetos de tolerância para compartilhamento e retenção temporal de cookies.</p>
            </div>

            <!-- Slider 1: Limite Máximo de Rastreadores de Terceiros -->
            <div class="space-y-2">
              <div class="flex justify-between items-center text-xs">
                <label class="font-bold text-slate-200">Tolerância Máxima de Empresas Terceiras por Site:</label>
                <span class="px-2.5 py-1 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold">
                  Até ${p.maxThirdPartyTrackers} parceiros
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="1"
                value="${p.maxThirdPartyTrackers}"
                data-input="slider-pref"
                data-pref-key="maxThirdPartyTrackers"
                class="w-full"
              />
              <div class="flex justify-between text-xs text-slate-500">
                <span>0 (Zero Terceiros / Estrito)</span>
                <span>10 (Moderado)</span>
                <span>20+ (Permissivo)</span>
              </div>
            </div>

            <!-- Slider 2: Tempo Máximo de Retenção de Cookies -->
            <div class="space-y-2 pt-2">
              <div class="flex justify-between items-center text-xs">
                <label class="font-bold text-slate-200">Prazo Máximo de Expiração de Cookies Locais:</label>
                <span class="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                  ${p.maxRetentionDays === 1 ? "Apenas Sessão (24h)" : `${p.maxRetentionDays} dias`}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="90"
                step="1"
                value="${p.maxRetentionDays}"
                data-input="slider-pref"
                data-pref-key="maxRetentionDays"
                class="w-full"
              />
              <div class="flex justify-between text-xs text-slate-500">
                <span>1 dia (Efêmero)</span>
                <span>30 dias (Padrão)</span>
                <span>90 dias</span>
              </div>
            </div>

            <!-- Checkboxes de Categorias Padrão -->
            <div class="space-y-3 pt-3 border-t border-slate-800">
              <p class="text-xs font-bold text-slate-200">Categorias Permitidas por Padrão no Seu Perfil:</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label class="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-emerald-500/30 opacity-90">
                  <input type="checkbox" checked disabled class="mt-0.5 rounded accent-teal-500" />
                  <div>
                    <span class="font-bold text-emerald-300 block">Cookies Essenciais (Sempre Ativo)</span>
                    <span class="text-slate-400">Autenticação, carrinho de compras e segurança técnica.</span>
                  </div>
                </label>

                <label class="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-amber-500/40">
                  <input type="checkbox" ${p.allowedCategories.analytics ? "checked" : ""} data-change="category-pref" data-cat="analytics" class="mt-0.5 rounded accent-teal-500" />
                  <div>
                    <span class="font-bold text-amber-300 block">Desempenho & Analytics Anônimo</span>
                    <span class="text-slate-400">Métricas agregadas de velocidade e erros de página.</span>
                  </div>
                </label>

                <label class="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-orange-500/40">
                  <input type="checkbox" ${p.allowedCategories.marketing ? "checked" : ""} data-change="category-pref" data-cat="marketing" class="mt-0.5 rounded accent-teal-500" />
                  <div>
                    <span class="font-bold text-orange-300 block">Marketing & Publicidade Contextual</span>
                    <span class="text-slate-400">Personalização de ofertas baseadas na página atual.</span>
                  </div>
                </label>

                <label class="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 cursor-pointer hover:border-rose-500/40">
                  <input type="checkbox" ${p.allowedCategories.thirdParty ? "checked" : ""} data-change="category-pref" data-cat="thirdParty" class="mt-0.5 rounded accent-teal-500" />
                  <div>
                    <span class="font-bold text-rose-300 block">Rastreamento Cruzado de Terceiros</span>
                    <span class="text-slate-400">Compartilhamento com data brokers e redes RTB externas.</span>
                  </div>
                </label>
              </div>
            </div>

            <div class="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <span class="text-xs text-slate-400">Suas preferências sincronizam imediatamente com o Dashboard e o Simulador.</span>
              <button
                data-action="apply-prefs-all"
                class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-lg shadow-teal-950/50 flex items-center gap-2"
              >
                ${ICONS.shieldCheck}
                Aplicar Este Perfil a Todos os 10 Sites Monitorados Agora
              </button>
            </div>
          </div>
        </div>

        <!-- Coluna Lateral: Resumo do Perfil Semiótico -->
        <div class="lg:col-span-4 space-y-6">
          <div class="bg-slate-900 border border-teal-500/40 rounded-2xl p-6 space-y-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center">
                ${ICONS.sliders}
              </div>
              <div>
                <span class="text-xs text-teal-400 font-bold uppercase">Diagnóstico do Perfil</span>
                <h4 class="text-base font-bold text-slate-100">
                  ${
                    p.prophylacticBlock && !p.allowedCategories.thirdParty
                      ? "Proteção Rigorosa (Blindado)"
                      : p.allowedCategories.thirdParty
                      ? "Perfil Permissivo (Exposto)"
                      : "Perfil Equilibrado (Consciente)"
                  }
                </h4>
              </div>
            </div>

            <p class="text-xs text-slate-300 leading-relaxed">
              Com base nas diretrizes de <strong>Privacidade Utilizável (UFABC - GC5)</strong>, este painel substitui dezenas de interruptores ambíguos por regras semânticas permanentes.
            </p>

            <div class="bg-slate-950 rounded-xl p-4 space-y-2.5 text-xs border border-slate-800">
              <div class="flex justify-between">
                <span class="text-slate-400">Bloqueio Profilático:</span>
                <strong class="${p.prophylacticBlock ? "text-emerald-400" : "text-amber-400"}">${p.prophylacticBlock ? "ATIVADO" : "MANUAL"}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Supressão de Pop-ups:</span>
                <strong class="${p.notificationSuppression ? "text-emerald-400" : "text-slate-300"}">${p.notificationSuppression ? "SILENCIOSO" : "VISÍVEL (5s)"}</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Teto de Terceiros:</span>
                <strong class="text-teal-300">${p.maxThirdPartyTrackers} empresas</strong>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-400">Expiração de Cookies:</span>
                <strong class="text-amber-300">${p.maxRetentionDays} dias</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ============================================================================
  // FUNÇÕES GLOBAIS DE INTERAÇÃO E EVENTOS
  // ============================================================================
  window.switchTab = function (tabName) {
    state.activeTab = tabName;
    document.querySelectorAll("[data-tab-section]").forEach((sec) => {
      sec.classList.toggle("hidden", sec.getAttribute("data-tab-section") !== tabName);
    });
    document.querySelectorAll("[data-nav-btn]").forEach((btn) => {
      const isAct = btn.getAttribute("data-nav-btn") === tabName;
      btn.className = isAct
        ? "px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 text-white shadow-lg shadow-teal-950/50 flex items-center gap-2 transition"
        : "px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2 transition";
    });
    renderAll();
  };

  window.setChartMode = function (mode) {
    state.chartMode = mode;
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

  // Eventos do Simulador da Extensão (Módulo 2)
  window.selectSimScenario = function (scenarioId) {
    state.simulator.currentScenarioId = scenarioId;
    state.simulator.decisionMade = null;
    state.simulator.customSelectOpen = false;
    state.simulator.viewMode = "datalens";
    // Se modo de supressão e bloqueio profilático estiverem ativos, inicia recolhido
    const sc = state.simulatorScenarios.find((s) => s.id === scenarioId);
    if (
      state.preferences.prophylacticBlock &&
      state.preferences.notificationSuppression &&
      sc &&
      sc.riskLevel !== "low"
    ) {
      state.simulator.overlayOpen = false;
    } else {
      state.simulator.overlayOpen = true;
    }
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

    // Sincroniza decisão do simulador com o site correspondente no Dashboard Central!
    const linkedSiteMap = {
      "sim-ecommerce": "site-2",
      "sim-news": "site-3",
      "sim-academic": "site-8"
    };
    const linkedSiteId = linkedSiteMap[scenario.id];
    const dashboardSite = state.sites.find((s) => s.id === linkedSiteId);

    if (decision === "rejected") {
      if (dashboardSite) {
        dashboardSite.status = "essential_only";
        dashboardSite.trackersBlocked = Math.max(0, dashboardSite.trackersTotal - 1);
        dashboardSite.trackersActive = 1;
        dashboardSite.riskLevel = "low";
      }
      showToast(
        "Rastreadores Não-Essenciais Rejeitados",
        `Em ${scenario.name}: ${scenario.synthesis.sharedWith.count} empresas terceiras foram bloqueadas. O Dashboard Central foi atualizado!`,
        "emerald"
      );
    } else if (decision === "selected") {
      if (dashboardSite) {
        dashboardSite.status = "essential_only";
        dashboardSite.trackersBlocked = Math.max(1, Math.floor(dashboardSite.trackersTotal * 0.7));
        dashboardSite.trackersActive = dashboardSite.trackersTotal - dashboardSite.trackersBlocked;
        dashboardSite.riskLevel = "medium";
      }
      showToast(
        "Preferências Granulares Aplicadas",
        `Apenas as categorias selecionadas foram permitidas para ${scenario.name}.`,
        "teal"
      );
    } else if (decision === "accepted") {
      if (dashboardSite) {
        dashboardSite.status = "full";
        dashboardSite.trackersActive = dashboardSite.trackersTotal;
        dashboardSite.trackersBlocked = 0;
        dashboardSite.riskLevel = scenario.riskLevel;
      }
      showToast(
        "Coleta Total Permitida (Atenção)",
        `Você permitiu o compartilhamento com ${scenario.synthesis.sharedWith.count} terceiros em ${scenario.name}. Índice de exposição atualizado.`,
        "amber"
      );
    }

    renderAll();
  };

  // Eventos de Preferências (Módulo 2.3)
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
    const labelMap = {
      prophylacticBlock: "Bloqueio Automático Profilático",
      notificationSuppression: "Modo de Supressão de Notificações"
    };
    showToast(
      `${labelMap[key]} ${state.preferences[key] ? "Ativado" : "Desativado"}`,
      state.preferences[key]
        ? "A extensão DataLens agora aplicará esta regra automaticamente durante sua navegação."
        : "Regra desativada. Você voltará a decidir manualmente no Cartão de Síntese.",
      state.preferences[key] ? "emerald" : "amber"
    );
    renderAll();
  };

  window.updateSliderPreference = function (key, val) {
    state.preferences[key] = parseInt(val, 10);
    syncPreferencesToExtension();
    renderPreferences();
  };

  window.toggleCategoryPref = function (catKey, checked) {
    state.preferences.allowedCategories[catKey] = checked;
    syncPreferencesToExtension();
    showToast(
      "Limite de Categoria Atualizado",
      `Categoria "${CATEGORY_META[catKey].label}" definida como ${checked ? "Permitida" : "Bloqueada"} por padrão.`,
      checked ? "amber" : "emerald"
    );
    renderPreferences();
  };

  window.applyPreferencesToAllSites = function () {
    const allowThird = state.preferences.allowedCategories.thirdParty;
    const allowMkt = state.preferences.allowedCategories.marketing;
    let updatedCount = 0;

    state.sites.forEach((site) => {
      if (!allowThird && !allowMkt) {
        site.status = "essential_only";
        site.trackersBlocked = Math.max(0, site.trackersTotal - 1);
        site.trackersActive = 1;
        site.riskLevel = "low";
        updatedCount++;
      } else if (!allowThird && site.thirdPartyCompanies > state.preferences.maxThirdPartyTrackers) {
        site.status = "essential_only";
        site.trackersBlocked = Math.max(0, site.trackersTotal - 2);
        site.trackersActive = 2;
        site.riskLevel = "medium";
        updatedCount++;
      }
    });

    showToast(
      "Perfil de Privacidade Aplicado Globalmente",
      `Suas regras e limites foram sincronizados em ${updatedCount} sites monitorados. Verifique a queda no Índice de Exposição no Dashboard!`,
      "emerald"
    );
    renderAll();
  };

  window.toggleAcademicModal = function (show) {
    const modal = document.getElementById("academic-modal");
    if (!modal) return;
    modal.classList.toggle("hidden", !show);
  };

  // ============================================================================
  // RENDERIZAÇÃO PRINCIPAL DO SISTEMA
  // ============================================================================
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
    if (elActive) elActive.textContent = `${metrics.activeTrackers} ativos de ${metrics.totalTrackers} detectados`;

    if (elExposureBar) {
      elExposureBar.style.width = `${metrics.exposureIndex}%`;
      elExposureBar.className = `h-full rounded-full transition-all duration-500 ${
        metrics.exposureIndex > 60
          ? "bg-rose-500"
          : metrics.exposureIndex > 30
          ? "bg-amber-400"
          : "bg-emerald-400"
      }`;
    }

    if (elExposureBadge) {
      if (metrics.exposureIndex > 60) {
        elExposureBadge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40";
        elExposureBadge.textContent = "Risco Elevado";
      } else if (metrics.exposureIndex > 30) {
        elExposureBadge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40";
        elExposureBadge.textContent = "Exposição Moderada";
      } else {
        elExposureBadge.className = "px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
        elExposureBadge.textContent = "Privacidade Protegida";
      }
    }
  }

  function renderAll() {
    const metrics = computeMetrics();
    renderKPIs(metrics);
    renderCategoryChart(metrics);
    renderTimelineChart();
    renderSitesList();
    renderSimulator();
    renderPreferences();
  }

  // Inicialização ao carregar DOM
  document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("search-input");
    const riskSel = document.getElementById("filter-risk");
    const dateSel = document.getElementById("filter-date");
    const catSel = document.getElementById("filter-category");

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

    // Delegação Global de Eventos (100% compatível com CSP de Extensões Chrome Manifest V3)
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const action = btn.getAttribute("data-action");

      if (action === "switch-tab") {
        window.switchTab(btn.getAttribute("data-tab"));
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
      } else if (action === "close-toast") {
        if (btn.parentElement) btn.parentElement.remove();
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
      const inputType = el.getAttribute("data-input");

      if (inputType === "slider-pref") {
        window.updateSliderPreference(el.getAttribute("data-pref-key"), el.value);
      }
    });

    // Recebe dados reais da Extensão DataLens (via Content Script ou diretamente via chrome.storage quando aberto como página da extensão)
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
