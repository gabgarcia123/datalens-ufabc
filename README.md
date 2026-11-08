# DataLens — Painel de Transparência e Controle Ativo de Dados Pessoais
**UFABC • Interação Humano-Computador (2026) • Grupo DataLens (GC5: Interação Humano-Dados, Alfabetização em Dados e Privacidade Utilizável)**

## 1. Visão Geral e Filosofia de Design (IHC)
O **DataLens** foi projetado para mitigar a **fadiga de consentimento** e neutralizar *dark patterns* em banners de cookies tradicionais, aplicando os princípios de **Donald Norman** (*Significadores Claros*, *Affordances Simétricas*, *Feedback Imediato* e *Mapeamento Natural*) e semiótica de alto contraste:
- 🟢 **Verde (`#10B981`):** Seguro / Cookies Essenciais
- 🟡 **Amarelo (`#F59E0B`):** Atenção / Desempenho & Analytics
- 🔴 **Vermelho (`#EF4444`):** Alto Risco / Rastreamento Cruzado de Terceiros
- 🟦 **Azul-Petróleo (`#0D9488`):** Identidade Visual Sóbria e Confiável do Ecossistema DataLens

## 2. Estrutura de Arquivos do Projeto
- `index.html` — Estrutura semântica principal com navegação bimodal fluida entre **Dashboard Central**, **Simulador da Extensão Web**, **Preferências & Limites** e **Integração com a Pesquisa Oficial (Google Forms)**.
- `css/styles.css` — Estilização complementar, animações de pulso semiótico e barras de rolagem.
- `js/mockData.js` — Base de dados inicial rica com **10 sites simulados** (redes sociais, e-commerce, notícias, saúde, finanças, streaming, viagens e portal acadêmico UFABC), cenários da extensão e série temporal de exposição.
- `js/app.js` — Motor reativo em JavaScript puro que gerencia estado global, cálculos de KPIs em tempo real, gráficos SVG interativos (Rosca, Barras e Linha do Tempo), filtros combinados e notificações *Toast*.

## 3. Como Executar
Basta abrir o arquivo `index.html` em qualquer navegador moderno (não requer servidor ou instalação de pacotes externos).
