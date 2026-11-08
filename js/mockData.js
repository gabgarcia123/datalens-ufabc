/**
 * DataLens — Dados Mockados e Estado Inicial de Privacidade
 * UFABC • Interação Humano-Computador (2026) • Grupo DataLens (GC5)
 */

window.DATALENS_INITIAL_DATA = {
  // Preferências Globais e Limites de Privacidade (Módulo 2.3)
  preferences: {
    prophylacticBlock: false,
    notificationSuppression: false,
    maxThirdPartyTrackers: 5,
    maxRetentionDays: 30,
    allowedCategories: {
      essential: true,      // Sempre ativo (bloqueado para desativação)
      analytics: true,      // Desempenho e Analytics
      marketing: false,     // Publicidade comportamental
      thirdParty: false     // Compartilhamento com data brokers/terceiros
    },
    autoClearOnExit: true,
    strictGeolocation: true
  },

  // Sites Monitorados no Dashboard (Módulo 1)
  sites: [
    {
      id: "site-1",
      name: "SocialPulse Rede",
      domain: "socialpulse.com.br",
      category: "Rede Social",
      lastAccess: "2026-11-08",
      accessTime: "14:05",
      riskLevel: "high", // high | medium | low
      status: "full",    // full | essential_only | revoked
      trackersTotal: 24,
      trackersActive: 24,
      trackersBlocked: 0,
      thirdPartyCompanies: 18,
      dataCollected: [
        { id: "loc", label: "Localização GPS", category: "thirdParty", risk: "high", icon: "map-pin" },
        { id: "bio", label: "Grafo Social & Contatos", category: "thirdParty", risk: "high", icon: "users" },
        { id: "ads", label: "Perfil Comportamental", category: "marketing", risk: "high", icon: "target" },
        { id: "clk", label: "Histórico de Cliques", category: "analytics", risk: "medium", icon: "mouse-pointer" },
        { id: "ses", label: "Token de Sessão", category: "essential", risk: "low", icon: "lock" }
      ],
      purposeSummary: "Rastreamento cruzado entre sites para leilão de anúncios em tempo real e treinamento de algoritmos de engajamento."
    },
    {
      id: "site-2",
      name: "MegaStore Brasil",
      domain: "megastore.com.br",
      category: "E-Commerce",
      lastAccess: "2026-11-08",
      accessTime: "12:30",
      riskLevel: "high",
      status: "full",
      trackersTotal: 19,
      trackersActive: 19,
      trackersBlocked: 0,
      thirdPartyCompanies: 12,
      dataCollected: [
        { id: "cart", label: "Histórico de Compras", category: "marketing", risk: "high", icon: "shopping-cart" },
        { id: "ret", label: "Pixel de Retargeting", category: "thirdParty", risk: "high", icon: "eye" },
        { id: "mail", label: "Hash de E-mail", category: "thirdParty", risk: "high", icon: "mail" },
        { id: "ab", label: "Métricas de Navegação", category: "analytics", risk: "medium", icon: "bar-chart-2" },
        { id: "chk", label: "Carrinho & Pagamento", category: "essential", risk: "low", icon: "credit-card" }
      ],
      purposeSummary: "Monitoramento de abandono de carrinho e compartilhamento de intenção de compra com 12 redes de publicidade."
    },
    {
      id: "site-3",
      name: "Diário Metropolitano",
      domain: "diariometropolitano.jor.br",
      category: "Portal de Notícias",
      lastAccess: "2026-11-07",
      accessTime: "21:15",
      riskLevel: "high",
      status: "full",
      trackersTotal: 31,
      trackersActive: 31,
      trackersBlocked: 0,
      thirdPartyCompanies: 26,
      dataCollected: [
        { id: "fp", label: "Fingerprinting de Dispositivo", category: "thirdParty", risk: "high", icon: "cpu" },
        { id: "rtb", label: "Leilão de Ads (RTB)", category: "thirdParty", risk: "high", icon: "dollar-sign" },
        { id: "read", label: "Tempo de Leitura & Scroll", category: "analytics", risk: "medium", icon: "book-open" },
        { id: "pay", label: "Controle de Paywall", category: "essential", risk: "low", icon: "key" }
      ],
      purposeSummary: "Identificação única do navegador (fingerprinting) e venda de espaço publicitário programático para 26 corretores de dados."
    },
    {
      id: "site-4",
      name: "StreamFlix Vídeo",
      domain: "streamflix.tv",
      category: "Streaming & Mídia",
      lastAccess: "2026-11-07",
      accessTime: "19:40",
      riskLevel: "medium",
      status: "full",
      trackersTotal: 9,
      trackersActive: 9,
      trackersBlocked: 0,
      thirdPartyCompanies: 4,
      dataCollected: [
        { id: "watch", label: "Hábitos de Visualização", category: "analytics", risk: "medium", icon: "tv" },
        { id: "rec", label: "Preferências de Gênero", category: "marketing", risk: "medium", icon: "sparkles" },
        { id: "qos", label: "Qualidade de Rede/CDN", category: "essential", risk: "low", icon: "wifi" },
        { id: "auth", label: "Autenticação Segura", category: "essential", risk: "low", icon: "shield" }
      ],
      purposeSummary: "Personalização de catálogo de vídeos, telemetria de buffer e campanhas promocionais de parceiros de estúdio."
    },
    {
      id: "site-5",
      name: "VooRápido Viagens",
      domain: "voorapido.tur.br",
      category: "Turismo & Passagens",
      lastAccess: "2026-11-06",
      accessTime: "16:20",
      riskLevel: "high",
      status: "full",
      trackersTotal: 16,
      trackersActive: 16,
      trackersBlocked: 0,
      thirdPartyCompanies: 11,
      dataCollected: [
        { id: "geo", label: "Origem Geográfica IP/GPS", category: "thirdParty", risk: "high", icon: "compass" },
        { id: "dyn", label: "Perfil de Preço Dinâmico", category: "marketing", risk: "high", icon: "trending-up" },
        { id: "srch", label: "Destinos Pesquisados", category: "analytics", risk: "medium", icon: "search" },
        { id: "res", label: "Sessão de Reserva", category: "essential", risk: "low", icon: "calendar" }
      ],
      purposeSummary: "Coleta de histórico de buscas de passagens para ajuste dinâmico de tarifas e remarketing em redes sociais."
    },
    {
      id: "site-6",
      name: "CloudDocs Produtividade",
      domain: "clouddocs.app",
      category: "Trabalho & Estudo",
      lastAccess: "2026-11-06",
      accessTime: "10:10",
      riskLevel: "medium",
      status: "essential_only",
      trackersTotal: 6,
      trackersActive: 1,
      trackersBlocked: 5,
      thirdPartyCompanies: 2,
      dataCollected: [
        { id: "err", label: "Logs de Diagnóstico", category: "analytics", risk: "medium", icon: "activity" },
        { id: "ux", label: "Mapa de Calor de Uso", category: "analytics", risk: "medium", icon: "layout" },
        { id: "sync", label: "Sincronização Local", category: "essential", risk: "low", icon: "refresh-cw" }
      ],
      purposeSummary: "Apenas cookies essenciais de sincronização ativos; telemetria de uso e analytics foram bloqueados pelo DataLens."
    },
    {
      id: "site-7",
      name: "FitTrack Saúde",
      domain: "fittrack.health",
      category: "Saúde & Bem-Estar",
      lastAccess: "2026-11-05",
      accessTime: "08:45",
      riskLevel: "high",
      status: "full",
      trackersTotal: 14,
      trackersActive: 14,
      trackersBlocked: 0,
      thirdPartyCompanies: 9,
      dataCollected: [
        { id: "hlth", label: "Indicadores Biométricos", category: "thirdParty", risk: "high", icon: "heart" },
        { id: "ins", label: "Segmentação Farmacêutica", category: "marketing", risk: "high", icon: "briefcase" },
        { id: "step", label: "Frequência de Treinos", category: "analytics", risk: "medium", icon: "watch" },
        { id: "usr", label: "Perfil de Usuário", category: "essential", risk: "low", icon: "user" }
      ],
      purposeSummary: "Compartilhamento de interesses de saúde e rotina física com anunciantes do setor de suplementos e bem-estar."
    },
    {
      id: "site-8",
      name: "Portal UFABC Acadêmico",
      domain: "ufabc.edu.br",
      category: "Educação & Ciência",
      lastAccess: "2026-11-08",
      accessTime: "09:00",
      riskLevel: "low",
      status: "essential_only",
      trackersTotal: 2,
      trackersActive: 0,
      trackersBlocked: 2,
      thirdPartyCompanies: 0,
      dataCollected: [
        { id: "stat", label: "Estatísticas Anônimas", category: "analytics", risk: "low", icon: "pie-chart" },
        { id: "sso", label: "Autenticação Institucional", category: "essential", risk: "low", icon: "check-circle" }
      ],
      purposeSummary: "Acesso institucional seguro sem rastreadores comerciais ou compartilhamento com terceiros."
    },
    {
      id: "site-9",
      name: "FinanBank Digital",
      domain: "finanbank.com.br",
      category: "Serviços Financeiros",
      lastAccess: "2026-11-04",
      accessTime: "15:12",
      riskLevel: "medium",
      status: "essential_only",
      trackersTotal: 8,
      trackersActive: 2,
      trackersBlocked: 6,
      thirdPartyCompanies: 3,
      dataCollected: [
        { id: "frd", label: "Prevenção à Fraude", category: "essential", risk: "low", icon: "shield-check" },
        { id: "crd", label: "Ofertas de Crédito", category: "marketing", risk: "medium", icon: "percent" },
        { id: "perf", label: "Latência do App", category: "analytics", risk: "low", icon: "zap" }
      ],
      purposeSummary: "Proteção antifraude ativa; cookies de ofertas de parceiros financeiros foram limitados ao modo essencial."
    },
    {
      id: "site-10",
      name: "WikiConhecimento Livre",
      domain: "wikiconhecimento.org",
      category: "Enciclopédia Aberta",
      lastAccess: "2026-11-03",
      accessTime: "22:05",
      riskLevel: "low",
      status: "essential_only",
      trackersTotal: 1,
      trackersActive: 0,
      trackersBlocked: 1,
      thirdPartyCompanies: 0,
      dataCollected: [
        { id: "lang", label: "Preferência de Idioma", category: "essential", risk: "low", icon: "globe" },
        { id: "theme", label: "Tema de Leitura Local", category: "essential", risk: "low", icon: "sun" }
      ],
      purposeSummary: "Armazenamento estritamente local para idioma e interface. Zero rastreamento comportamental."
    }
  ],

  // Cenários de Simulação para o Módulo 2 (Simulador da Extensão Web)
  simulatorScenarios: [
    {
      id: "sim-ecommerce",
      name: "MegaStore Brasil (E-Commerce)",
      url: "https://www.megastore.com.br/ofertas-notebooks-2026",
      riskLevel: "high",
      riskScore: 86,
      badgeText: "Alto Risco • 12 Terceiros",
      pageTitle: "MegaStore — Super Semana de Tecnologia (Até 40% OFF)",
      pageSubtitle: "Notebooks, Monitores e Periféricos com Entrega Expressa",
      darkPatternBannerText: "Nós e nossos 147 parceiros valorizamos sua privacidade! Utilizamos cookies e tecnologias semelhantes para melhorar sua experiência, personalizar conteúdo, oferecer funcionalidades de redes sociais e analisar nosso tráfego. Ao clicar em 'ACEITAR E CONTINUAR', você concorda com nossos Termos Legais de 48 páginas.",
      synthesis: {
        whatIsCollected: [
          { label: "Localização Precisa & IP", risk: "high", category: "thirdParty" },
          { label: "Histórico de Cliques e Produtos Vistos", risk: "medium", category: "analytics" },
          { label: "E-mail (Hash) e Identificador do Dispositivo", risk: "high", category: "marketing" },
          { label: "Itens no Carrinho de Compras", risk: "low", category: "essential" }
        ],
        purpose: [
          { label: "Anúncios personalizados em outros sites (Retargeting)", risk: "high", category: "marketing" },
          { label: "Perfil de poder aquisitivo para precificação", risk: "high", category: "thirdParty" },
          { label: "Análise de desempenho e cliques na página", risk: "medium", category: "analytics" },
          { label: "Funcionamento básico do carrinho e checkout", risk: "low", category: "essential" }
        ],
        sharedWith: {
          count: 12,
          summary: "12 empresas de publicidade e data brokers terceiros",
          entities: ["AdMetrics Global", "TrackFlow RTB", "SocialGraph Ads", "DataBroker Prime", "+8 redes de leilão"]
        }
      }
    },
    {
      id: "sim-news",
      name: "Diário Metropolitano (Notícias)",
      url: "https://www.diariometropolitano.jor.br/tecnologia/ia-privacidade-dados",
      riskLevel: "high",
      riskScore: 92,
      badgeText: "Risco Crítico • 26 Terceiros",
      pageTitle: "Diário Metropolitano — O Futuro da Privacidade Digital no Brasil",
      pageSubtitle: "Especialistas da UFABC debatem como interfaces transparentes reduzem a fadiga de consentimento",
      darkPatternBannerText: "Aviso de Privacidade: Para continuar lendo gratuitamente, precisamos que você aceite o compartilhamento de dados de navegação com nossos parceiros comerciais de mídia programática.",
      synthesis: {
        whatIsCollected: [
          { label: "Impressão Digital do Navegador (Fingerprinting)", risk: "high", category: "thirdParty" },
          { label: "Tempo de leitura, rolagem e interesses políticos/sociais", risk: "medium", category: "analytics" },
          { label: "Identificador de Publicidade Cruzada", risk: "high", category: "marketing" },
          { label: "Contador de artigos gratuitos lidos", risk: "low", category: "essential" }
        ],
        purpose: [
          { label: "Leilão de anúncios em tempo real (Real-Time Bidding)", risk: "high", category: "thirdParty" },
          { label: "Rastreamento entre múltiplos portais de notícias", risk: "high", category: "marketing" },
          { label: "Métricas editoriais de audiência", risk: "medium", category: "analytics" },
          { label: "Controle básico de assinatura/paywall", risk: "low", category: "essential" }
        ],
        sharedWith: {
          count: 26,
          summary: "26 redes de mídia programática e agregadores de perfil",
          entities: ["OpenBid Exchange", "AudienceSync Corp", "PulseTracker Media", "BehavioralNet", "+22 parceiros"]
        }
      }
    },
    {
      id: "sim-academic",
      name: "Portal Acadêmico UFABC (Educação)",
      url: "https://portal.ufabc.edu.br/pesquisa/ihc-datalens-gc5",
      riskLevel: "low",
      riskScore: 8,
      badgeText: "Seguro • 0 Terceiros",
      pageTitle: "UFABC — Repositório Científico de Interação Humano-Computador",
      pageSubtitle: "Grupo 5 (GC5): Interação Humano-Dados, Alfabetização em Dados e Privacidade Utilizável",
      darkPatternBannerText: "Este portal utiliza apenas cookies estritamente necessários para manter sua sessão autenticada e estatísticas agregadas anônimas.",
      synthesis: {
        whatIsCollected: [
          { label: "Token de Sessão Institucional", risk: "low", category: "essential" },
          { label: "Preferência de Acessibilidade e Alto Contraste", risk: "low", category: "essential" },
          { label: "Contagem Anônima de Visitas", risk: "low", category: "analytics" }
        ],
        purpose: [
          { label: "Manter login seguro entre páginas acadêmicas", risk: "low", category: "essential" },
          { label: "Estatísticas públicas agregadas sem identificação pessoal", risk: "low", category: "analytics" }
        ],
        sharedWith: {
          count: 0,
          summary: "Nenhuma empresa terceira (Dados restritos à instituição)",
          entities: ["Zero compartilhamento externo"]
        }
      }
    }
  ],

  // Histórico da Linha do Tempo (Últimos 7 dias)
  timelineHistory: [
    { day: "02/11", dateLabel: "02 Nov", exposureScore: 78, trackersBlocked: 12, consentsGiven: 6 },
    { day: "03/11", dateLabel: "03 Nov", exposureScore: 74, trackersBlocked: 19, consentsGiven: 5 },
    { day: "04/11", dateLabel: "04 Nov", exposureScore: 68, trackersBlocked: 28, consentsGiven: 4 },
    { day: "05/11", dateLabel: "05 Nov", exposureScore: 71, trackersBlocked: 34, consentsGiven: 5 },
    { day: "06/11", dateLabel: "06 Nov", exposureScore: 59, trackersBlocked: 49, consentsGiven: 3 },
    { day: "07/11", dateLabel: "07 Nov", exposureScore: 52, trackersBlocked: 64, consentsGiven: 2 },
    { day: "08/11", dateLabel: "Hoje",  exposureScore: 46, trackersBlocked: 82, consentsGiven: 2 }
  ]
};
