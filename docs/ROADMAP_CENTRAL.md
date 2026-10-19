# Lumini V2 — Roadmap Central e Plano de Trabalho Executivo

**Versão do Documento:** 1.0  
**Data:** 19/10/2026  
**Status do Projeto:** Em Planejamento / Inicialização da Sprint 0  
**Referência Arquitetural:** `Lumini_Arquitetura_Completa/` (00 a 10) e `docs/PRODUCT_VISION.md`  
**Governança:** `AGENTS.md`  

---

## 1. Diagnóstico do Problema e Visão Arquitetural

### 1.1 O Problema Real da Marmoraria
O setor de beneficiamento de rochas ornamentais (mármore, granito, quartzito, sintéticos) sofre de perdas financeiras e operacionais agudas causadas por:
1. **Desperdício de Matéria-Prima:** Chapas de pedra custam de centenas a milhares de reais por metro quadrado. A falta de nesting otimizado considerando o sentido dos veios da pedra, o diâmetro/espessura do disco de serra (*kerf*) e as margens de refilo gera retalhos inutilizados e elevado custo de descarte.
2. **Retrabalho e Falta de Rastreabilidade:** Medições de obra alteradas na bancada exigem redimensionar manualmente saias, frontões, cuba e orçamento. Erros manuais causam peças cortadas com medidas erradas na serra.
3. **Desconexão Comercial-Técnica:** O orçamento é comumente gerado em planilhas sem vínculo direto com a geometria, esquecendo acabamentos lineares caros (meia-esquadria 45°, boleado, rebaixo italiano, polimentos).
4. **Comunicação Falha com o Chão de Fábrica:** Desenhos confusos sem identificação unívoca de peças, furos de torneira/válvula e indicação de bordas acabadas levam a retrabalho e descarte de peças prontas.

### 1.2 A Solução Lumini V2: Single Source of Truth
O Lumini V2 estabelece o **Modelo Técnico Central do Projeto** como fonte única de verdade:
- Uma alteração em uma peça no Editor 2D/3D atualiza de forma rastreada o **Orçamento**, o **Plano de Corte** e os **PDFs Técnicos**.
- Revisões aprovadas são **imutáveis**. Qualquer nova alteração gera uma nova revisão, mantendo o histórico de auditoria intacto e impedindo mudanças silenciosas em ordens já enviadas para corte.

### 1.3 Pilares Técnicos Adotados
- **Backend:** Monólito modular em C# / ASP.NET Core Web API com Clean Architecture (Domain, Application, Infrastructure, Presentation, Workers).
- **Banco de Dados:** PostgreSQL relacional com transações estritas, multi-tenancy nativo por `tenant_id`, controle de concorrência por token de versão (`ETag`/`version`) e snapshots imutáveis de desenho.
- **Armazenamento:** Object Storage compatível com S3 para pranchas PDF, arquivos DXF importados e capturas 3D.
- **Frontend:** React + TypeScript + Vite, interface moderna em tema escuro industrial com Tailwind CSS + Radix/shadcn primitives, TanStack Query para estado remoto e React Hook Form + Zod.
- **Motor Gráfico:** Núcleo geométrico canônico em milímetros (`mm`), desacoplado de renderers. Viewport 2D em SVG/Canvas interativo e Viewport 3D em Three.js / React Three Fiber.
- **Processamento Assíncrono:** Fila e background workers para algoritmos de otimização de corte (nesting), processamento de arquivos DXF pesados e compilação de relatórios PDF.

---

## 2. Mapa Geral de Módulos e Dependências

```
+-------------------------------------------------------------------------+
|                              FASE CORE                                  |
|  [Módulo 0: Fundação & Infra]  --->  [Módulo 1: Identidade & Multi-Tenant] |
|                                                    |                    |
|                                                    v                    |
|                                       [Módulo 2: Clientes & Projetos]   |
+----------------------------------------------------+--------------------+
                                                     |
+----------------------------------------------------+--------------------+
|                         ENGENHARIA GEOMÉTRICA                           |
|                                                    v                    |
|                                       [Módulo 3: Desenho Técnico 2D/3D] |
|                                                    |                    |
+----------------------------------------------------+--------------------+
                                                     |
         +-------------------------------------------+-------------------+
         |                                                               |
         v                                                               v
+------------------------------------+          +------------------------------------+
|  [Módulo 4: Orçamento & Preços]    |          |  [Módulo 5: Estoque & Corte]       |
|  - Tabelas de preço por tenant     |          |  - Chapas e sobras (retalhos)      |
|  - Linhas de custo vinculadas      |          |  - Algoritmo de nesting com kerf   |
|  - Acabamentos lineares & furos    |          |  - Validação e aprovação de corte  |
+-----------------+------------------+          +-----------------+------------------+
                  |                                               |
                  +----------------------+------------------------+
                                         |
                                         v
                         +--------------------------------+
                         |  [Módulo 6: Pranchas & PDFs]   |
                         |  - Seleção de pranchas         |
                         |  - Cotas, detalhes e anotações |
                         |  - Exportação para produção    |
                         +---------------+----------------+
                                         |
                                         v
                         +--------------------------------+
                         |  [Módulo 7: Auditoria & Robustez|
                         |  - Testes de carga & segurança |
                         |  - Backup e homologação final  |
                         +--------------------------------+
```

---

## 3. Estrutura de Diretórios Alvo do Repositório

```text
LuminiV2/
├── apps/
│   ├── web/                              # Frontend React + TypeScript + Vite
│   │   ├── src/
│   │   │   ├── app/                      # Bootstrap, Router, Providers
│   │   │   ├── components/               # Design System base (botões, modais, etc.)
│   │   │   ├── editor2d/                 # Motor geométrico e canvas 2D
│   │   │   ├── editor3d/                 # Viewport 3D Three.js
│   │   │   ├── features/                 # Módulos verticais de negócio
│   │   │   │   ├── auth/
│   │   │   │   ├── clients/
│   │   │   │   ├── projects/
│   │   │   │   ├── drawing/
│   │   │   │   ├── pricing/
│   │   │   │   ├── cutting/
│   │   │   │   ├── inventory/
│   │   │   │   └── documents/
│   │   │   ├── hooks/
│   │   │   ├── services/                 # Clientes de API tipados
│   │   │   └── styles/                   # Tema visual industrial escuro
│   └── api/                              # Backend ASP.NET Core
│       ├── Lumini.Api/                   # Presentation: Controllers, Middlewares
│       ├── Lumini.Application/           # Use Cases, CQRS/Handlers, DTOs
│       ├── Lumini.Domain/                # Entidades, Value Objects, Regras
│       ├── Lumini.Infrastructure/        # EF Core, PostgreSQL, S3, Repositórios
│       ├── Lumini.Workers/               # Jobs de Nesting, DXF e PDFs
│       └── tests/
│           ├── Lumini.UnitTests/
│           ├── Lumini.IntegrationTests/
│           └── Lumini.ArchitectureTests/
├── packages/
│   └── geometry-core/                    # Tipos e cálculos geométricos puros (mm)
├── docs/                                 # Documentação viva, ADRs e diagramas
│   ├── adr/
│   ├── PRODUCT_VISION.md
│   └── ROADMAP_CENTRAL.md
├── AGENTS.md
└── docker-compose.yml
```

---

## 4. Plano de Trabalho Sprint a Sprint (Checklist Detalhado)

> **Instrução de Governança:** À medida que cada tarefa for concluída e testada, o checkbox correspondente `[ ]` deve ser alterado para `[x]` com a data e referência do commit/teste no relatório.

---

### Sprint 0: Descoberta, Fundação do Repositório & CI/CD
**Meta:** Estruturar a fundação monorepo do projeto, pipelines de CI, contêineres Docker de desenvolvimento, banco de dados PostgreSQL inicial e design system base.

#### Backend & Infraestrutura
- [x] Configurar solução .NET 8/9 (`Lumini.Api`, `Lumini.Application`, `Lumini.Domain`, `Lumini.Infrastructure`, `Lumini.Workers`) — *Concluído em 19/10/2026*.
- [x] Configurar `docker-compose.yml` local com PostgreSQL 16 e MinIO (Object Storage local compatível com S3) — *Concluído em 19/10/2026*.
- [ ] Configurar EF Core com Npgsql e primeira estrutura de migração.
- [ ] Implementar middleware global de tratamento de erros com CorrelationId e formato padronizado de erro (`taxonomia RFC-7807/Lumini`).
- [ ] Configurar Swagger/OpenAPI com suporte a versionamento (`/api/v1`) e autenticação Bearer.

#### Frontend & Design System
- [x] Inicializar aplicação `apps/web` com Vite, React, TypeScript e Tailwind CSS — *Concluído em 19/10/2026*.
- [x] Configurar Design System com identidade visual premium (tema escuro, contraste industrial, tipografia moderna e paleta refinada para marmoraria) — *Concluído em 19/10/2026*.
- [x] Configurar núcleo geométrico canônico em milímetros (`packages/geometry-core`) com tipagem estrita de peças, bordas e furos — *Concluído em 19/10/2026*.
- [ ] Configurar cliente HTTP tipado (`Axios` ou `Fetch` customizado) com interceptors de CorrelationId, ETag e tratamento padronizado de erros.
- [ ] Configurar TanStack Query provider com estratégias de cache seguras para estados do editor e dados transacionais.
- [ ] Configurar React Router v6 com rotas aninhadas e layouts base (AuthLayout, DashboardLayout, ProjectLayout).

#### Qualidade & Gates
- [x] Criar projeto de testes `Lumini.ArchitectureTests` e `Lumini.UnitTests` vinculados à solução — *Concluído em 19/10/2026*.
- [ ] Configurar pipeline de CI (.github/workflows) para lint, typecheck e build de frontend e backend.
- [ ] Registrar ADR-001 (Monólito Modular) e ADR-002 (PostgreSQL) na pasta `docs/adr/`.

---

### Sprint 1: Identidade, Multi-Tenancy e RBAC
**Meta:** Implementar isolamento rígido multi-tenant (`tenant_id`), cadastro de empresas (marmorarias), autenticação de usuários, convites e controle de permissões server-side (`06-SEGURANCA-RBAC.md`).

#### Backend
- [ ] Criar entidades de domínio: `User`, `Organization` (Tenant), `Membership`, `Role`, `Permission`, `Invitation`.
- [ ] Implementar autenticação baseada em JWT com refresh token seguro e proteção contra brute-force / rate limit.
- [ ] Configurar `TenantContext` resolvido automaticamente no pipeline de requisição através do token do usuário (nunca confiar no body).
- [ ] Implementar Query Filters globais no EF Core para isolar automaticamente todas as entidades por `tenant_id`.
- [ ] Implementar políticas de autorização baseadas em permissões (`organization.manage`, `projects.read`, `drawing.edit`, `quotes.approve`, etc.).
- [ ] Criar endpoints de gerenciamento de membros da organização e envio de convites com hash temporário.

#### Frontend
- [ ] Construir tela de Login (`UI-001`) com tratamento de estados de erro, loading e validação Zod.
- [ ] Construir layout do painel administrativo (`UI-002`) com seletor de organização e perfil do usuário autenticado.
- [ ] Construir telas de Gestão de Usuários e Convites (`UI-012`) e Papéis (`UI-013`).
- [ ] Implementar guardas de rota no React Router com base nas permissões ativas do usuário.

#### Testes & Segurança
- [ ] Teste unitário e de integração para isolamento multi-tenant: garantir que usuário do Tenant A recebe `404` ou `403` ao tentar acessar dados do Tenant B (`RNF-001`).
- [ ] Teste de recuperação de senha e convite de membros com expiração de token.

---

### Sprint 2: Gestão de Clientes e Núcleo do Projeto
**Meta:** Implementar gerenciamento de clientes, criação de projetos com revisões monotônicas imutáveis (`RN-005`), versionamento otimista de concorrência e upload de arquivos técnicos anexos.

#### Backend
- [ ] Criar entidades: `Client`, `Project`, `ProjectRevision`, `ProjectAttachment`.
- [ ] Implementar máquina de estados do Projeto: `draft -> in_review -> approved -> in_production -> completed`.
- [ ] Implementar criação e controle de revisões (`revision_number`, `snapshot_jsonb`, `geometry_schema_version`).
- [ ] Implementar controle de concorrência otimista com coluna `version` e suporte a cabeçalho `If-Match` (`RN-013`).
- [ ] Implementar integração com Object Storage (S3/MinIO) para uploads seguros de anexos de obra com URLs pré-assinadas de curta duração.
- [ ] Criar tabela e pipeline de auditoria `audit_events` para gravar eventos de criação, mudança de status e novas revisões (`RN-015`).

#### Frontend
- [ ] Construir módulo de Clientes (`UI-003`, `UI-004`): listagem paginada, filtros rápidos, criação e edição com validação Zod.
- [ ] Construir módulo de Projetos (`UI-005`, `UI-006`): visão geral com cards de status, código único do projeto e cliente vinculado.
- [ ] Construir cabeçalho do projeto com identificador da revisão ativa, status de sincronização e alternador de revisões históricas.
- [ ] Construir feedback visual para detecção de conflitos de concorrência (`RESOURCE_CONFLICT`).

#### Testes & Validação
- [ ] Testes de integridade de concorrência: duas requisições simultâneas tentando alterar o mesmo projeto devem resultar em um sucesso e um erro `409 Conflict`.
- [ ] Testes de imutabilidade: garantir que uma revisão aprovada rejeita qualquer tentativa de modificação in-place.

---

### Sprint 3: Catálogo de Materiais, Acabamentos e Configurações Técnicas
**Meta:** Configurar a base técnica que sustenta o desenho e a fabricação: catálogo de rochas (mármores, granitos, quartzitos), espessuras nominais, acabamentos de borda e regras de fabricação.

#### Backend
- [ ] Criar entidades: `Material` (nome, tipo de rocha, densidade, espessuras disponíveis, textura/cor), `FinishType` (código, nome, parâmetros de corte), `PricingTable`, `PricingRule`.
- [ ] Seed inicial de acabamentos tradicionais de marmoraria:
  - Rebaixo italiano e rebaixo americano;
  - Meia-esquadria 45° (com e sem saia colada);
  - Borda boleada, meia-cana, bisotê reto e polimento simples;
  - Engrosso / saia colada.
- [ ] Implementar validação de regras de compatibilidade: espessura mínima de chapa por tipo de acabamento.
- [ ] Endpoints para CRUD do catálogo com escopo por marmoraria.

#### Frontend
- [ ] Construir tela de configurações de Materiais e Acabamentos (`Configurações Técnicas`).
- [ ] Criar seletor visual de materiais com amostras de cor/textura e espessuras suportadas (ex: 20mm, 30mm).
- [ ] Criar painel visual explicativo com ilustrações dos acabamentos de borda e suas terminologias de fábrica.

---

### Sprint 4: Motor de Geometria e Editor 2D (CAD Especializado)
**Meta:** Desenvolver o núcleo do editor de desenho técnico em milímetros (`mm`), permitindo modelar bancadas, ilhas, frontões, saias, recortes de cuba e furos com precisão cirúrgica e cotas automáticas (`RF-005`, `RF-006`, `RF-008`).

#### Motor Geométrico Canônico (`packages/geometry-core`)
- [ ] Implementar estruturas de dados geométricas canônicas em milímetros:
  - `Part`: contorno externo, espessura nominal, material associado;
  - `Edge`: aresta com identificador único, comprimento exato e acabamento aplicado;
  - `Hole`: centro (`x`, `y`) e diâmetro em mm (`RN-003`), raio derivado;
  - `InnerContour`: recortes internos para cubas de sobrepor ou embutir;
  - `DimensionAnnotation`: cota técnica independente da geometria canônica.
- [ ] Implementar algoritmos de validação geométrica:
  - Detecção de auto-interseção de polígonos;
  - Garantia de que furos e recortes estão contidos dentro da peça com margem mínima de segurança da borda;
  - Cálculo de área líquida e área bruta retangular.

#### Frontend — Editor Canvas 2D (`apps/web/src/editor2d`)
- [ ] Canvas interativo com suporte a pan, zoom fluido e grid milimétrico com snap magnético.
- [ ] Ferramentas de desenho:
  - Retângulo paramétrico (largura x comprimento);
  - Polígono livre em L ou U (bancadas com retorno);
  - Inserção de furos por diâmetro numérico (ex: furo de 35mm para torneira mono-comando);
  - Recorte de cubas retangulares e ovais com folga de colagem.
- [ ] Sistema de cotas dinâmicas: cotas automáticas exibidas nas arestas com opção de reposicionamento e ocultação.
- [ ] Painel lateral contextual:
  - Seleção de borda da peça com aplicação de acabamento específico (ex: Borda frontal com 45° + saia de 40mm);
  - Destaque bidirecional: ao clicar na aresta no canvas, o painel foca na borda correspondente.
- [ ] Sistema de Undo / Redo baseado no padrão Command sobre o estado geométrico.
- [ ] Mecanismo de Autosave local em IndexedDB com sincronização periódica de rascunho no backend (`RF-015`).

#### Testes & Validação
- [ ] Testes unitários do motor geométrico: precisão de cálculos de área, tolerâncias decimais e validação de furos fora do limite da pedra.
- [ ] Teste de performance do canvas 2D com projetos contendo mais de 50 peças simultâneas.

---

### Sprint 5: Visualizador 3D e Modelagem de Montagem
**Meta:** Proporcionar inspeção tridimensional realista das peças de pedra com Three.js / React Three Fiber, permitindo conferir encaixes de saias 45°, frontões e cubas esculpidas em rocha (`RF-023`).

#### Frontend — Viewport 3D (`apps/web/src/editor3d`)
- [ ] Cena Three.js sincronizada em tempo real com o modelo geométrico canônico da Sprint 4.
- [ ] Extrusão paramétrica das peças 2D respeitando a espessura da chapa cadastrada (ex: 20mm).
- [ ] Shaders/materiais PBR representando granitos, mármores e acabamentos polidos/escovados.
- [ ] Montagem tridimensional: posicionamento relativo de saias a 45° descendo da bancada e frontões subindo na parede.
- [ ] Ferramenta de inspeção e medição 3D (régua virtual para conferência de medidas de montagem).
- [ ] Sistema de captura de cena em alta resolução para inclusão automática nos relatórios e PDFs.

#### Testes
- [ ] Validação de fidelidade dimensional: conferir se a extrusão 3D e as posições espaciais correspondem exatamente aos milímetros do modelo canônico.

---

### Sprint 6: Módulo de Orçamento e Precificação Dinâmica
**Meta:** Calcular orçamentos precisos e auditáveis derivados diretamente das peças do projeto, tabelas de preços e acabamentos lineares, eliminando erros manuais de cálculo (`RF-011`, `RN-006`).

#### Backend
- [ ] Implementar motor de cálculo de custos e preços:
  - Custo de matéria-prima por área bruta e líquida ($m^2$);
  - Custo de acabamento linear por borda ($m$ linear de 45°, boleado, etc.);
  - Custo de recortes e furações por unidade;
  - Itens adicionais: cubas de inox/louça, colas epóxi, frete e mão de obra de instalação.
- [ ] Criação da entidade `Quote` vinculada estritamente à `ProjectRevision` e à `PricingTable` utilizada.
- [ ] Implementar regras comerciais: margens de lucro, descontos autorizados e impostos.
- [ ] Fluxo de aprovação de orçamento (`draft -> calculated -> sent -> accepted | rejected`).
- [ ] Ao aprovar um orçamento, registrar evento de auditoria e snapshot comercial imutável.

#### Frontend
- [ ] Construir tela de Orçamento (`UI-008`):
  - Tabela detalhada de itens com agrupamento por peça;
  - Resumo de custos: matéria-prima, acabamentos de borda, furos e insumos;
  - Destaque cruzado: clicar em uma linha de acabamento de borda na tabela destaca visualmente a aresta no desenho 2D (`RF-021`).
  - Formulário de condições de pagamento, validade da proposta e botões de envio/aprovação.

#### Testes
- [ ] Testes unitários com casos reais de bancadas com múltiplos acabamentos, garantindo que o cálculo monetário utiliza tipos decimais sem erros de arredondamento de float.

---

### Sprint 7: Módulo de Estoque de Chapas e Sobras (Retalhos)
**Meta:** Cadastrar e gerenciar chapas inteiras e retalhos reutilizáveis com dimensões reais, espessura, lote e localização física no pátio da marmoraria (`RF-013`, `RN-010`).

#### Backend
- [ ] Criar entidades: `Slab` (chapa/sobra, dimensões largura x altura, espessura, lote, localização, status), `InventoryMovement`.
- [ ] Máquina de estados da chapa: `available -> reserved -> consumed -> quarantined -> discarded`.
- [ ] Implementar controle transacional de reservas e baixas de estoque: impedir que a mesma chapa seja reservada ou consumida simultaneamente por dois projetos (`RN-010`).
- [ ] Implementar geração de novas sobras (`source_slab_id`) originadas do resultado do plano de corte.

#### Frontend
- [ ] Construir tela de Estoque (`UI-010`):
  - Visão geral de chapas disponíveis filtradas por material, espessura e lote;
  - Galeria de sobras com representação visual das dimensões e área aproveitável;
  - Histórico de movimentações de estoque (entradas, reservas e baixas).

#### Testes
- [ ] Testes de concorrência com aprovação simultânea de dois planos disputando a mesma chapa: o banco de dados deve bloquear saldo negativo ou reserva dupla.

---

### Sprint 8: Motor de Plano de Corte & Otimização (Nesting)
**Meta:** Desenvolver o algoritmo de nesting especializado para serra de marmoraria, organizando as peças desenhadas sobre as chapas disponíveis com respeito ao disco (*kerf*), sentido de veios e restrições de máquina (`RF-012`, `RN-007`, `RN-009`).

#### Backend & Workers (`Lumini.Workers`)
- [ ] Criar entidades: `CuttingJob`, `CuttingPlan`, `CuttingPlacement`, `CuttingConsumption`.
- [ ] Implementar endpoint assíncrono para solicitação de otimização (`POST /api/v1/projects/{id}/cutting-jobs`) retornando `202 Accepted` com `jobId`.
- [ ] Implementar worker de otimização de corte:
  - Algoritmo 2D Bin Packing especializado com restrição de corte guilhotina / passante de serra ponte;
  - Respeito obrigatório à espessura do disco de serra (`kerfMm`, ex: 3.5mm a 5mm);
  - Margem perimetral de refilo da chapa (`edgeMarginMm`, ex: 15mm);
  - Restrição de rotação: respeitar a direção dos veios em mármores desenhados quando a flag `respectVeinDirection` estiver ativa.
- [ ] Cálculo de aproveitamento da chapa: percentual de uso, área consumida e geometria dos retalhos gerados.
- [ ] Endpoint de aprovação formal do plano de corte por operador (`POST /api/v1/cutting-plans/{id}/approve`): atualiza estoque e gera as sobras rastreadas.

#### Frontend — Módulo de Corte (`apps/web/src/features/cutting`)
- [ ] Construir tela do Plano de Corte (`UI-009`):
  - Seleção das chapas do estoque elegíveis para o corte;
  - Configuração de parâmetros (kerf do disco, refilo, priorizar menor sobra vs menor número de chapas);
  - Barra de progresso do job assíncrono com polling inteligente via TanStack Query;
  - Visualização interativa do layout de corte sobre as chapas com cores por projeto/peça;
  - Indicador de aproveitamento e lista de peças não acomodadas (se houver);
  - Botão de aprovação formal com aviso de impacto no estoque.

#### Testes & Validação
- [ ] Testes determinísticos do algoritmo de nesting com conjuntos de bancadas clássicas (pia, balcão e frontões), comprovando que nenhuma peça se sobrepõe e que o espaçamento mínimo entre peças nunca é inferior ao kerf da serra.

---

### Sprint 9: Documentação Técnica, Pranchas e Geração de PDFs
**Meta:** Gerar a documentação executiva completa para produção na marmoraria e proposta comercial para o cliente, com seleção de pranchas, anotações de corte e cotas legíveis (`RF-014`, `RF-018`, `RN-011`).

#### Backend & Workers
- [ ] Criar entidades: `DocumentTemplate`, `DocumentExport`.
- [ ] Implementar worker de compilação de PDFs vetoriais de alta resolução:
  - Prancha 1: Capa e resumo executivo do projeto com relação de peças, materiais e áreas;
  - Prancha 2: Desenho técnico 2D detalhado com cotas legíveis, indicação de acabamentos nas arestas e furos cotados a partir das bordas de referência;
  - Prancha 3: Renders/vistas 3D isométricas do projeto montado;
  - Prancha 4: Mapa do Plano de Corte impresso para o operador da serra, com medidas de avanço do disco e identificadores de cada peça.
- [ ] Armazenamento do PDF imutável gerado no Object Storage (S3/MinIO) e disponibilização via download assinado.

#### Frontend
- [ ] Construir tela de Documentos e Exportação (`UI-011`):
  - Seletor de páginas para exportação (o usuário pode gerar apenas o documento do serrador ou a proposta do cliente sem afetar o projeto) (`RN-011`);
  - Opções de exibição de cotas (tamanho da fonte, cor, precisão decimal);
  - Ferramenta de anotações sobre imagens (setas, alertas de "Cuidado: corte delicado", notas de montagem) (`RF-022`);
  - Pré-visualização do PDF antes do download final.

#### Testes
- [ ] Validar fidelidade visual dos PDFs gerados em diferentes resoluções e impressão em formato A4/A3.

---

### Sprint 10: Importação DXF e Interoperabilidade
**Meta:** Permitir que o desenhista importe arquivos `.DXF` originados de programas de arquitetura (AutoCAD, SketchUp), convertendo polilinhas em peças editáveis com relatório de compatibilidade (`RF-010`).

#### Backend & Workers
- [ ] Implementar pipeline seguro de upload e parsing de arquivos DXF:
  - Validação estrita de extensão, MIME type e limite de tamanho de arquivo (`RNF-010`);
  - Parser executado em sandbox/worker com timeout rígido para evitar ataques de DoS por arquivos maliciosos;
  - Extração de camadas (Layers), polilinhas fechadas (`LWPOLYLINE`), linhas e círculos;
  - Relatório detalhado de importação: entidades aceitas, ignoradas e avisos de contorno aberto.

#### Frontend
- [ ] Modal de importação DXF com pré-visualização vetorial antes da confirmação.
- [ ] Mapeamento interativo de escala (confirmar se o desenho original estava em milímetros, centímetros ou metros).
- [ ] Confirmação assistida para atribuir material e espessura às peças importadas antes de incorporá-las à revisão do projeto.

---

### Sprint 11: Robustez, Segurança, Auditoria e Homologação Final
**Meta:** Realizar o endurecimento final de segurança, testes de carga, auditoria LGPD, planos de contingência/backup e testes operacionais ponta a ponta para liberação do MVP.

#### Segurança & Hardening
- [ ] Varredura completa de segurança contra IDOR (testar todos os endpoints de projeto, orçamento, corte e arquivos com tokens cruzados de outros tenants).
- [ ] Configuração de cabeçalhos de segurança HTTP (CSP, HSTS, X-Content-Type-Options, CORS restrito).
- [ ] Sanitização e auditoria de logs para garantir ausência de senhas, dados de cartão ou dados sensíveis de clientes.
- [ ] Teste de backup e restauração conjunta do PostgreSQL e dos arquivos no MinIO/S3 (`RNF-008`).

#### Performance & E2E
- [ ] Execução de testes de carga simulando múltiplos usuários editando projetos e disparando jobs de corte simultâneos.
- [ ] Teste End-to-End (Playwright) cobrindo o fluxo completo da marmoraria:
  1. Login do usuário;
  2. Criação do cliente e do projeto;
  3. Desenho de bancada com frontão, furo e acabamento 45°;
  4. Geração e aprovação do orçamento;
  5. Consulta do estoque e execução do plano de corte otimizado;
  6. Aprovação do corte com baixa de chapa;
  7. Exportação e download do PDF de fabricação.
- [ ] Documentação de Runbooks de operação, incidentes e manutenção em `docs/runbooks/`.

---

## 5. Matriz de Rastreabilidade de Requisitos (MVP)

| Requisito | Descrição | Sprint Responsável | Status |
|---|---|---|---|
| `RF-001` | Autenticação e recuperação de usuários | Sprint 1 | [ ] Pendente |
| `RF-002` | Isolamento estrito de empresas (Multi-tenant) | Sprint 1 | [ ] Pendente |
| `RF-003` | Gestão de clientes da marmoraria | Sprint 2 | [ ] Pendente |
| `RF-004` | Criação de projetos e controle de revisões | Sprint 2 | [ ] Pendente |
| `RF-005` | Desenho de peças em 2D com medidas em mm | Sprint 4 | [ ] Pendente |
| `RF-006` | Edição de dimensões e cotas automáticas | Sprint 4 | [ ] Pendente |
| `RF-007` | Agrupamento de elementos no desenho | Sprint 4 | [ ] Pendente |
| `RF-008` | Configuração de furos por diâmetro | Sprint 4 | [ ] Pendente |
| `RF-009` | Acabamentos de borda (45°, boleado, rebaixo) | Sprint 3 & 4 | [ ] Pendente |
| `RF-010` | Importação e parsing seguro de DXF | Sprint 10 | [ ] Pendente |
| `RF-011` | Orçamento vinculado à revisão do projeto | Sprint 6 | [ ] Pendente |
| `RF-012` | Plano de corte com nesting e respeito ao disco | Sprint 8 | [ ] Pendente |
| `RF-013` | Controle de estoque de chapas e sobras | Sprint 7 | [ ] Pendente |
| `RF-014` | Geração de PDFs técnicos para fabricação | Sprint 9 | [ ] Pendente |
| `RF-015` | Autosave e recuperação de rascunhos | Sprint 4 | [ ] Pendente |
| `RF-016` | Histórico e auditoria de alterações | Sprint 2 & 11 | [ ] Pendente |
| `RF-017` | Administração de papéis e permissões (RBAC) | Sprint 1 | [ ] Pendente |
| `RF-018` | Seleção de páginas na exportação de documentos | Sprint 9 | [ ] Pendente |
| `RF-019` | Notificação e acompanhamento de jobs longos | Sprint 8 | [ ] Pendente |
| `RF-021` | Destaque cruzado de bordas (Orçamento <-> Desenho)| Sprint 6 | [ ] Pendente |
| `RF-022` | Anotações sobre imagens técnicas de fabricação | Sprint 9 | [ ] Pendente |
| `RF-023` | Inspeção e medição em ambiente 3D | Sprint 5 | [ ] Pendente |
| `RF-024` | Controle de concorrência por versão de projeto | Sprint 2 | [ ] Pendente |

---

## 6. Próximo Passo Imediato

Iniciar a execução da **Sprint 0: Descoberta, Fundação do Repositório & CI/CD**:
1. Criar a estrutura de diretórios monorepo (`apps/web`, `apps/api`, `packages/geometry-core`).
2. Configurar o bootstrap do frontend (Vite + React + TypeScript + Tailwind CSS).
3. Configurar a solução backend (.NET / C#) com as camadas Clean Architecture.
4. Adicionar o `docker-compose.yml` para desenvolvimento local com PostgreSQL e MinIO.
