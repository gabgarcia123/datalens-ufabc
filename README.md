# DataLens — Painel de Transparência e Controle Ativo de Dados Pessoais (v2.0)

**UFABC • Interação Humano-Computador (2026) • Grupo DataLens (GC5: Interação Humano-Dados, Alfabetização em Dados e Privacidade Utilizável)**

---

## 1. Visão Geral e Filosofia de Design (IHC)
O **DataLens** é um ecossistema bimodal (Extensão de Navegador **Manifest V3** + **Dashboard Analítico de Manipulação Direta**) projetado para combater a **fadiga de consentimento** e neutralizar *dark patterns* em banners de cookies na web.

Fundamentado nos princípios de **Donald Norman** (*Significadores Claros*, *Affordances Simétricas*, *Feedback Imediato* e *Mapeamento Natural*) e no **Art. 18 da LGPD**, o sistema utiliza um design técnico inspirado em **shadcn/ui + Linear** com semiótica de alto contraste:
- 🟢 **Verde (`#10B981`):** Seguro / Cookies Essenciais
- 🟡 **Amarelo (`#F59E0B`):** Atenção / Desempenho & Analytics
- 🔴 **Vermelho (`#EF4444`):** Alto Risco / Rastreamento Cruzado de Terceiros e Dados Sensíveis
- 🟦 **Teal (`#0D9488`):** Identidade Visual DataLens

---

## 2. Arquitetura Bimodal e Funcionalidades

### Módulo 1 — Dashboard Web Interativo (Gestão Contínua / Manipulação Direta)
- **KPIs em Tempo Real:** Total de domínios auditados, Índice de Exposição Digital ponderado (%) e contador de rastreadores neutralizados.
- **Visualização Vetorial (SVG):** Gráfico de Rosca/Barras interativo por categoria semiótica (clique para filtrar a tabela) e Série Temporal de 7 dias (*Exposição vs. Mitigação*).
- **Data Table de Auditoria:** Busca rápida (atalhos `/` ou `Ctrl+K`), filtros combinados por risco, vetor e período, expansão técnica (`▸`) exibindo os nomes reais dos cookies (`_ga`, `_fbp`, `MUID`) e domínios terceiros conectados, além de ações diretas (*Apenas Essenciais*, *Revogar*, *Limpar Cookies*).
- **Portabilidade LGPD (Art. 18):** Exportação instantânea do inventário auditado em formato **`.CSV`** (Excel) e **`.JSON`**.
- **Tema Claro / Escuro (Zinc):** Alternância fluida com persistência em `localStorage` e `chrome.storage`.

### Módulo 2 — Extensão Web Manifest V3 & Simulador de Contexto (Mediação Ativa)
- **Auditoria Real de Cookies (`extension/background.js`):** Lê e classifica heuristicamente cookies reais do navegador via `chrome.cookies` (com suporte completo a TLDs compostos como `.com.br`, `.edu.br`, `.gov.br`).
- **Detector de Dados Sensíveis e Rastreadores (`extension/content.js`):** Inspeciona o DOM em busca de campos críticos (CPF/RG, cartão de crédito, senha, e-mail, telefone, geolocalização, scripts de *session replay* e pixels de retargeting).
- **Cartão de Síntese Veloz (Leitura em 5 Segundos):** Alerta isolado via *Shadow DOM* que traduz políticas extensas em 3 respostas diretas (*O que é coletado?*, *Para qual finalidade?* e *Com quem é compartilhado?*) com botões de mesmo peso visual.
- **Auto-Rejeição de Banners & Expurgo de Web Storage:** Clica automaticamente em botões de rejeição nos principais CMPs (*OneTrust*, *Cookiebot*, etc.) com `MutationObserver` para SPAs e limpa chaves de rastreamento em `localStorage` e `sessionStorage`.

---

## 3. Como Instalar e Executar

### A) Como Extensão no Google Chrome / Microsoft Edge / Brave
1. Baixe ou clone este repositório.
2. Abra `chrome://extensions/` no navegador e ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** (*Load unpacked*) e selecione a pasta raiz deste projeto (onde está o `manifest.json`).

### B) Como Aplicação Web / Protótipo Standalone
Basta abrir o arquivo `index.html` diretamente em qualquer navegador moderno (100% livre de dependências externas de build).
