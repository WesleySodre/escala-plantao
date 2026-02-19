# Brainstorming de Design - Escala de Plantão Hortolândia

## Proposta 1: Minimalismo Corporativo Moderno
**Probabilidade:** 0.08

**Design Movement:** Minimalismo corporativo com influências de design suíço

**Core Principles:**
- Clareza absoluta: hierarquia visual nítida e legibilidade em primeiro lugar
- Espaço generoso: uso estratégico de whitespace para respiração visual
- Funcionalidade pura: cada elemento serve um propósito específico
- Tipografia como protagonista: fontes bem escolhidas carregam toda a narrativa

**Color Philosophy:**
- Paleta neutra com acentos azul-profundo (confiança, profissionalismo)
- Fundo branco puro para máxima legibilidade
- Cinzas sofisticados para hierarquia (não preto absoluto)
- Azul-marinho (#1e40af) para CTAs e destaques
- Vermelho suave (#dc2626) apenas para alertas críticos

**Layout Paradigm:**
- Grid assimétrico 12-colunas com margens amplas
- Sidebar esquerdo fixo com navegação (semelhante a aplicações corporativas)
- Área principal com cards em grid responsivo
- Separação clara entre seções com linhas horizontais sutis

**Signature Elements:**
1. Cards com sombra mínima (apenas 1-2px) e borda fina cinza
2. Ícones monocromáticos em azul-marinho
3. Tipografia em duas famílias: Poppins (headings) e Inter (body)

**Interaction Philosophy:**
- Transições suaves de 200ms em hover
- Feedback visual imediato (mudança de cor, não movimento excessivo)
- Tooltips informativos em elementos complexos
- Estados desabilitados em cinza claro

**Animation:**
- Fade-in suave ao carregar dados (300ms)
- Hover: elevação sutil (1-2px) + mudança de cor
- Cliques: ripple effect minimalista
- Transições entre abas: slide horizontal suave

**Typography System:**
- Poppins 700: Títulos principais (h1)
- Poppins 600: Subtítulos (h2, h3)
- Inter 400: Corpo de texto
- Inter 500: Labels e metadados
- Tamanhos: 12px (small), 14px (body), 16px (lead), 20px (h3), 28px (h2), 36px (h1)

---

## Proposta 2: Design Robusto com Personalidade Brasileira
**Probabilidade:** 0.07

**Design Movement:** Modernismo brasileiro com influências de design gráfico dos anos 70-80

**Core Principles:**
- Ousadia cromática: cores vibrantes mas harmoniosas
- Geometria expressiva: formas angulares e diagonais
- Narrativa visual: cada seção conta uma história
- Acessibilidade com estilo: cores contrastantes naturalmente

**Color Philosophy:**
- Laranja-queimado (#d97706) como cor primária (energia, otimismo)
- Azul-petróleo (#064e3b) como cor secundária (estabilidade)
- Amarelo-ouro (#fbbf24) para acentos (destaque)
- Fundo creme-claro (#fefce8) ao invés de branco puro
- Preto profundo (#1f2937) para textos

**Layout Paradigm:**
- Seções com cortes diagonais (clip-path) para dinamismo
- Grid assimétrico com blocos de tamanhos variados
- Padrão de chevron ou onda como divisor entre seções
- Sidebar com fundo laranja-queimado e ícones em branco

**Signature Elements:**
1. Dividers diagonais entre seções (45 graus)
2. Badges circulares com números (para posição na escala)
3. Linhas decorativas em laranja-queimado

**Interaction Philosophy:**
- Animações mais expressivas (400-500ms)
- Hover com mudança de cor + rotação suave
- Feedback tátil visual (pulso de cor)
- Transições entre estados com movimento fluido

**Animation:**
- Entrada de cards com slide + fade (400ms)
- Hover: rotação 2-3 graus + mudança de cor
- Cliques: pulso de cor que se expande
- Transições: easing cubic-bezier(0.34, 1.56, 0.64, 1) para bounce suave

**Typography System:**
- Playfair Display 700: Títulos principais (h1)
- Poppins 600: Subtítulos (h2, h3)
- Lato 400: Corpo de texto
- Lato 500: Labels
- Tamanhos: 12px, 14px, 16px, 18px, 24px, 32px, 40px

---

## Proposta 3: Elegância Minimalista com Foco em Dados
**Probabilidade:** 0.06

**Design Movement:** Data-driven design com influências de dashboards modernos (estilo Stripe/Figma)

**Core Principles:**
- Informação como arte: dados apresentados de forma visualmente atraente
- Densidade controlada: máxima informação sem poluição visual
- Consistência tipográfica: hierarquia através de peso e tamanho
- Interatividade intuitiva: exploração de dados é prazerosa

**Color Philosophy:**
- Índigo-profundo (#4f46e5) como primária (inteligência, tecnologia)
- Cinza neutro (#6b7280) para contexto
- Verde-esmeralda (#059669) para status positivo/confirmação
- Âmbar (#d97706) para alertas
- Fundo: gradiente suave de branco para cinza-claro (não plano)

**Layout Paradigm:**
- Grid de 3-4 colunas com cards de tamanho uniforme
- Tabelas com alternância de cores de linha
- Gráficos e visualizações como elementos principais
- Barra de busca/filtros no topo (sticky)
- Sem sidebar: navegação horizontal ou dropdown

**Signature Elements:**
1. Cards com borda esquerda em cor de status
2. Badges com ícones para status (on-duty, off-duty, holiday)
3. Timeline visual para próximos plantões

**Interaction Philosophy:**
- Hover revela mais informações (tooltip ou expansão)
- Cliques abrem painéis laterais (não modais)
- Filtros atualizam visualização em tempo real
- Seleção múltipla com checkboxes

**Animation:**
- Fade-in rápido (200ms) para dados
- Hover: mudança de cor + elevação (2-3px)
- Cliques: feedback visual imediato
- Transições de dados: cross-fade (300ms)

**Typography System:**
- Inter 700: Títulos principais (h1)
- Inter 600: Subtítulos (h2, h3)
- Inter 400: Corpo de texto
- Inter 500: Labels e metadados
- Monospace (JetBrains Mono) para datas/números
- Tamanhos: 11px (small), 13px (body), 15px (lead), 18px (h3), 24px (h2), 32px (h1)

---

## Decisão: Proposta 1 - Minimalismo Corporativo Moderno

Escolhi a **Proposta 1** por ser a mais adequada para um sistema de escala de plantão. As razões:

1. **Clareza é crítica:** Um sistema de plantão precisa de máxima legibilidade—ninguém pode se confundir sobre quem está escalado
2. **Profissionalismo:** Reflete a natureza corporativa/institucional do contexto (Tribunal de Justiça)
3. **Escalabilidade:** Fácil de expandir com novas funcionalidades mantendo a coerência visual
4. **Acessibilidade:** Tipografia clara e contraste adequado garantem que todos consigam ler facilmente

Este design será implementado com:
- Sidebar esquerdo com navegação
- Cards em grid para apresentar escalas
- Tipografia Poppins + Inter
- Paleta azul-profundo + cinzas
- Animações suaves e funcionais
