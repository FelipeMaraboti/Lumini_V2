# Lumini — Contextualização do Projeto e Visão de Futuro

O **Lumini** é uma plataforma de software voltada ao setor de marmorarias, concebida para modernizar e integrar o processo de criação, planejamento, orçamento e execução de projetos que utilizam chapas de mármore, granito e outros materiais similares.

A ideia é transformar atividades que frequentemente dependem de ferramentas isoladas, operações manuais e conhecimento técnico disperso em um fluxo de trabalho digital integrado, no qual o projeto concebido pelo profissional possa acompanhar todo o processo até o planejamento do corte e a preparação para a fabricação.

---

## 1. O que é o Lumini?
O Lumini nasce da combinação entre desenho técnico, visualização tridimensional, geometria computacional e algoritmos de otimização aplicados à realidade das marmorarias.

A proposta não é ser apenas um editor de desenhos ou uma ferramenta para visualizar peças em 3D. O objetivo é construir um sistema especializado que conecte o projeto técnico à operação real da marmoraria, permitindo que as informações produzidas em uma etapa sejam aproveitadas nas etapas seguintes, sem retrabalho desnecessário ou inconsistências.

Ao desenvolver um projeto de bancada, por exemplo, o profissional define geometrias, dimensões, recortes, furos, acabamentos e outras características das peças. No Lumini, essas mesmas informações alimentam:
- O cálculo de preços e orçamentos;
- A determinação do material e área bruta/líquida;
- O plano de corte e nesting em chapas;
- Os documentos técnicos de fabricação (pranchas executivas/PDFs).

---

## 2. Qual problema queremos resolver?
- **Fragmentação do trabalho:** Informações de desenho, orçamento, estoque e corte distribuídas em ferramentas desarticuladas.
- **Retrabalho técnico:** Alterações dimensionais exigindo atualização manual em múltiplos documentos.
- **Dificuldade de precisão:** Falta de controle fino em movimentação, cotas, ângulos e tolerâncias de fabricação.
- **Complexidade do aproveitamento de chapas:** Alto índice de desperdício de rocha por falta de nesting eficiente considerando sentido de veio e restrições de serra.
- **Documentação operacional:** Falhas de comunicação entre projetista e o operador de corte/acabamento.
- **Controle e continuidade:** Perda de histórico, ausência de controle de revisões e risco de perda de dados.

---

## 3. Pilares e Módulos do Sistema

```
                      +-----------------------------+
                      |    Modelo Técnico Central   |
                      |  (Geometria, Propriedades,  |
                      |    Materiais, Revisões)     |
                      +--------------+--------------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
         v                           v                           v
+------------------+       +-------------------+       +--------------------+
|  1. Desenho e    |       |   2. Plano de     |       |   3. Orçamento e   |
|     Modelagem    |       |      Corte        |       |    Documentação    |
| (2D/3D, furos,   |       | (Nesting, chapas, |       | (Preços, insumos,  |
|  acabamentos)    |       |  veios, serras)   |       |  PDFs executivos)  |
+------------------+       +-------------------+       +--------------------+
                                     |
         +---------------------------+---------------------------+
         |                                                       |
         v                                                       v
+------------------+                                   +--------------------+
|   4. Estoque &   |                                   |  5. Plataforma     |
| Reaproveitamento |                                   |     Integrada      |
| (Chapas/retalhos)|                                   |  (SaaS, auditoria) |
+------------------+                                   +--------------------+
```

1. **Desenho técnico e modelagem:** Criar e editar peças com precisão, visualização 2D (planta/elevação/detalhes) e 3D, espessuras, rebaixos italianos, meias-esquadrias, saias, frontões, cubas e furos.
2. **Planejamento e otimização de corte:** Nesting de peças em chapas considerando restrições de serra circular (cortes guilhotina ou passantes), jato d'água/CNC, margem de refilo e direção de veios/texturas.
3. **Orçamento e documentação:** Formação de preços dinâmica por área ($m^2$), acabamentos lineares ($m$), colagens, cubas e insumos. Exportação de PDFs executivos detalhados para a fábrica.
4. **Estoque e reaproveitamento:** Gestão de chapas inteiras e retalhos cadastrados com dimensões reais e localização.
5. **Plataforma integrada de operação:** SaaS multi-organização, controle de acesso, log de revisões e integridade relacional.

---

## 4. Arquitetura: Single Source of Truth
O projeto é a **fonte única de informações técnicas**. Nenhum módulo cria sua própria cópia desacoplada dos dados geométricos. O orçamento, o nesting e os relatórios consomem diretamente as especificações do modelo técnico central, com controle de versão para impedir modificações silenciosas em planos já aprovados para corte.

---

## 5. Princípios Orientadores de Desenvolvimento
1. **Precisão antes de sofisticação:** As geometrias devem obedecer tolerâncias reais de marmoraria (milímetros exatos, kerf de disco, folgas de cola).
2. **Integração antes de duplicação:** Mudou a medida de uma saia ou cuba no desenho? O corte e o orçamento refletem isso de forma rastreada.
3. **Confiabilidade antes de expansão:** Estado de projeto imutável/auditável, auto-save local e persistência robusta.
4. **Usabilidade baseada na rotina real:** Vocabulário do marmorista (frontão, saia, rodabanca, bisote, boleado, 45°, engrosso, refilo).
5. **Modularidade com consistência:** Componentes desacoplados consumindo uma camada unificada de domínio.
6. **Evolução validada:** Foco nas dores de maior impacto primeiro.
