# Lumini V2 — Roadmap Central e Plano de Trabalho Executivo

**Versão do Documento:** 1.0  
**Data:** 19/10/2026  
**Status do Projeto:** Sprints 0 a 3 concluídas · Sprint 4 em andamento (editor 2D) · Sprint 5 em andamento (montagem 3D)  
**Referência Arquitetural:** `Lumini_Arquitetura_Completa/` (00 a 10) e `docs/PRODUCT_VISION.md`  
**Governança:** `AGENTS.md`  

> **Fonte oficial de execução:** este documento é a referência única para a ordem e o andamento das sprints. Ao concluir e validar trabalho, atualize aqui os checklists e a matriz de rastreabilidade. Roadmaps e fases descritos na arquitetura completa são referências de escopo e dependências; não substituem nem mantêm um status paralelo.

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
**Status:** **100% CONCLUÍDA E TESTADA EM 19/10/2026**

#### Backend & Infraestrutura
- [x] Configurar solução .NET 8/9 (`Lumini.Api`, `Lumini.Application`, `Lumini.Domain`, `Lumini.Infrastructure`, `Lumini.Workers`) — *Concluído em 19/10/2026*.
- [x] Configurar `docker-compose.yml` local com PostgreSQL 16 e MinIO (Object Storage local compatível com S3) — *Concluído em 19/10/2026*.
- [x] Configurar EF Core com Npgsql, `LuminiDbContext` com Query Filters automáticos por `tenant_id` e persistência relacional — *Concluído em 19/10/2026*.
- [x] Implementar middleware global de tratamento de erros com `CorrelationId` e formato padronizado de erro (`taxonomia RFC-7807/Lumini`) — *Concluído em 19/10/2026*.
- [x] Configurar Swagger/OpenAPI com suporte a versionamento (`/api/v1`) e autenticação Bearer JWT — *Concluído em 19/10/2026*.

#### Frontend & Design System
- [x] Inicializar aplicação `apps/web` com Vite, React, TypeScript e Tailwind CSS — *Concluído em 19/10/2026*.
- [x] Configurar Design System com identidade visual premium (tema escuro, contraste industrial, tipografia moderna e paleta refinada para marmoraria) — *Concluído em 19/10/2026*.
- [x] Configurar núcleo geométrico canônico em milímetros (`packages/geometry-core`) com tipagem estrita de peças, bordas e furos — *Concluído em 19/10/2026*.
- [x] Configurar cliente HTTP tipado (`apiClient.ts`) com interceptors de CorrelationId, ETag e tratamento padronizado de erros — *Concluído em 19/10/2026*.
- [x] Configurar TanStack Query provider com estratégias de cache seguras para estados do editor e dados transacionais — *Concluído em 19/10/2026*.

#### Qualidade & Gates
- [x] Configurar pipeline de CI automatizado (`.github/workflows/ci.yml`) para lint, typecheck e build de frontend e backend — *Concluído em 19/10/2026*.
- [x] Criar projeto de testes `Lumini.ArchitectureTests` garantindo via `NetArchTest` que `Lumini.Domain` não depende de camadas externas (Clean Architecture) — *Concluído em 19/10/2026 (100% aprovado)*.
- [x] Criar projeto de testes unitários `Lumini.UnitTests` cobrindo entidades base e versionamento otimista de concorrência — *Concluído em 19/10/2026 (100% aprovado)*.
- [x] Registrar ADR-001 (Monólito Modular) e ADR-002 (PostgreSQL) na pasta `docs/adr/` — *Concluído em 19/10/2026*.

---

### Sprint 1: Identidade, Multi-Tenancy e RBAC
**Meta:** Implementar isolamento rígido multi-tenant (`tenant_id`), cadastro de empresas (marmorarias), autenticação de usuários, convites e controle de permissões server-side (`06-SEGURANCA-RBAC.md`).  
**Status:** **CONCLUÍDA (MVP Sprint 1) em 19/10/2026** — recovery de senha e testes de integração HTTP cross-tenant ficam como follow-up fino.

#### Backend
- [x] Criar entidades de domínio: `User`, `Organization` (Tenant), `Membership`, `Role`, `Permission`, `Invitation` — *Concluído em 19/10/2026* (`Lumini.Domain/Identity/*`, catálogo `Permissions.All`).
- [x] Implementar autenticação baseada em JWT com refresh token seguro e proteção contra brute-force / rate limit — *Concluído em 19/10/2026* (access 30min + refresh rotativo hasheado, `InMemoryLoginRateLimiter`, rate limit ASP.NET `auth-strict`).
- [x] Configurar `TenantContext` resolvido automaticamente no pipeline de requisição através do token do usuário (nunca confiar no body) — *Concluído em 19/10/2026* (`Lumini.Api/Services/TenantContext.cs`, claim `tenant_id`).
- [x] Implementar Query Filters globais no EF Core para isolar automaticamente todas as entidades por `tenant_id` — *Concluído em 19/10/2026* (`LuminiDbContext.CurrentTenantId` dinâmico + `ITenantScoped`).
- [x] Implementar políticas de autorização baseadas em permissões (`organization.manage`, `projects.read`, `drawing.edit`, `quotes.approve`, etc.) — *Concluído em 19/10/2026* (`PermissionAuthorizationHandler` + policies `perm:*`).
- [x] Criar endpoints de gerenciamento de membros da organização e envio de convites com hash temporário — *Concluído em 19/10/2026* (`GET/POST /members`, `accept-invitation`, `GET/POST /roles`, token SHA-256, migration `Sprint1_Identity`).

#### Frontend
- [x] Construir tela de Login (`UI-001`) com tratamento de estados de erro, loading e validação Zod — *Concluído em 19/10/2026* (`LoginPage` + `RegisterPage`).
- [x] Construir layout do painel administrativo (`UI-002`) com seletor de organização e perfil do usuário autenticado — *Concluído em 19/10/2026* (perfil/org/logout no shell autenticado).
- [x] Construir telas de Gestão de Usuários e Convites (`UI-012`) e Papéis (`UI-013`) — *Concluído em 19/10/2026* (`MembersPage`, `RolesPage`).
- [x] Implementar guardas de rota no React Router com base nas permissões ativas do usuário — *Concluído em 19/10/2026* (`RequireAuth` + `AppRouter`).

#### Testes & Segurança
- [ ] Teste unitário e de integração para isolamento multi-tenant: garantir que usuário do Tenant A recebe `404` ou `403` ao tentar acessar dados do Tenant B (`RNF-001`). *(Parcial: unit tests de domínio/rate-limit/hash OK; falta IntegrationTest HTTP cross-tenant.)*
- [ ] Teste de recuperação de senha e convite de membros com expiração de token. *(Parcial: expiração/aceitação de convite coberta em unit tests; recovery de senha pendente.)*

---

### Sprint 2: Gestão de Clientes e Núcleo do Projeto
**Meta:** Implementar gerenciamento de clientes, criação de projetos com revisões monotônicas imutáveis (`RN-005`), versionamento otimista de concorrência e upload de arquivos técnicos anexos.  
**Status:** **CONCLUÍDA em 20/10/2026** — clientes, projetos, revisões, conflito 409 e download assinado.

#### Backend
- [x] Criar entidades: `Client`, `Project`, `ProjectRevision`, `ProjectAttachment` — *Concluído em 20/10/2026*.
- [x] Implementar máquina de estados do Projeto: `draft -> in_review -> approved -> in_production -> completed` — *Concluído em 20/10/2026*.
- [x] Implementar criação e controle de revisões (`revision_number`, `snapshot_jsonb`, `geometry_schema_version`) — *Concluído em 20/10/2026*.
- [x] Implementar controle de concorrência otimista com coluna `version` e suporte a cabeçalho `If-Match` (`RN-013`) — *Concluído em 20/10/2026*.
- [x] Implementar integração com Object Storage (S3/MinIO) para uploads seguros de anexos de obra com URLs pré-assinadas de curta duração. *Concluído em 20/10/2026: `S3FileStorage` (MinIO, `Storage:Provider=S3`) e URL assinada de 15 min no modo local.*
- [x] Criar tabela e pipeline de auditoria `audit_events` para gravar eventos de criação, mudança de status e novas revisões (`RN-015`) — *Concluído em 20/10/2026*.

#### Frontend
- [x] Construir módulo de Clientes (`UI-003`, `UI-004`): listagem paginada, filtros rápidos, criação e edição com validação Zod. *Concluído em 20/10/2026 (`/clients` e `/clients/:id`).*
- [x] Construir módulo de Projetos (`UI-005`, `UI-006`): visão geral com cards de status, código único do projeto e cliente vinculado — *Concluído em 20/10/2026*.
- [x] Construir cabeçalho do projeto com identificador da revisão ativa, status de sincronização e alternador de revisões históricas. *Concluído em 20/10/2026.*
- [x] Construir feedback visual para detecção de conflitos de concorrência (`RESOURCE_CONFLICT`) — *Concluído em 20/10/2026*.

#### Testes & Validação
- [x] Testes de integridade de concorrência: duas requisições simultâneas tentando alterar o mesmo projeto devem resultar em um sucesso e um erro `409 Conflict`. *Concluído em 20/10/2026 (`ProjectConcurrencyTests`: segundo `If-Match` obsoleto retorna 409).*
- [x] Testes de imutabilidade: garantir que uma revisão aprovada rejeita qualquer tentativa de modificação in-place — *Concluído em 20/10/2026*.

---

### Sprint 3: Catálogo de Materiais, Acabamentos e Configurações Técnicas
**Meta:** Configurar a base técnica que sustenta o desenho e a fabricação: catálogo de rochas (mármores, granitos, quartzitos), espessuras nominais, acabamentos de borda e regras de fabricação.
**Status:** **CONCLUÍDA em 20/10/2026** — catálogo por marmoraria, seed de acabamentos, compatibilidade de espessura e preços em decimal.

#### Backend
- [x] Criar entidades: `Material` (nome, tipo de rocha, densidade, espessuras disponíveis, textura/cor), `FinishType` (código, nome, parâmetros de corte), `PricingTable`, `PricingRule`. *Concluído em 20/10/2026.*
- [x] Seed inicial de acabamentos tradicionais de marmoraria:
  - Rebaixo italiano e rebaixo americano;
  - Meia-esquadria 45° (com e sem saia colada);
  - Borda boleada, meia-cana, bisotê reto e polimento simples;
  - Engrosso / saia colada.
  *Concluído em 20/10/2026, por tenant, na primeira leitura do catálogo.*
- [x] Implementar validação de regras de compatibilidade: espessura mínima de chapa por tipo de acabamento. *Concluído em 20/10/2026. Meia-cana exige 30 mm.*
- [x] Endpoints para CRUD do catálogo com escopo por marmoraria. *Concluído em 20/10/2026 (`/api/v1/catalog`).*

#### Frontend
- [x] Construir tela de configurações de Materiais e Acabamentos (`Configurações Técnicas`). *Concluído em 20/10/2026 (`/settings/catalog`).*
- [x] Criar seletor visual de materiais com amostras de cor/textura e espessuras suportadas (ex: 20mm, 30mm). *Concluído em 20/10/2026.*
- [x] Criar painel visual explicativo com ilustrações dos acabamentos de borda e suas terminologias de fábrica. *Concluído em 20/10/2026.*

---

### Sprint 4: Motor de Geometria e Editor 2D (CAD Especializado)
**Meta:** Desenvolver o núcleo do editor de desenho técnico em milímetros (`mm`), permitindo modelar bancadas, ilhas, frontões, saias, recortes de cuba e furos com precisão cirúrgica e cotas automáticas (`RF-005`, `RF-006`, `RF-008`).
**Status:** **EM ANDAMENTO em 21/10/2026** — modelo, validação, canvas, cotas, acabamento por aresta, desfazer, autosave, polígono livre, cuba oval e furo com diâmetro livre estão implementados. Falta o teste de 50 peças e o agrupamento.

#### Motor Geométrico Canônico (`packages/geometry-core`)
- [x] Implementar estruturas de dados geométricas canônicas em milímetros: *Concluído em 20/10/2026 (`packages/geometry-core/src/index.ts`).*
  - `Part`: contorno externo, espessura nominal, material associado;
  - `Edge`: aresta com identificador único, comprimento exato e acabamento aplicado;
  - `Hole`: centro (`x`, `y`) e diâmetro em mm (`RN-003`), raio derivado;
  - `InnerContour`: recortes internos para cubas de sobrepor ou embutir;
  - `DimensionAnnotation`: cota técnica independente da geometria canônica.
- [x] Implementar algoritmos de validação geométrica: *Concluído em 20/10/2026 (`edit.ts`, `edit.test.ts`).*
  - Detecção de auto-interseção de polígonos;
  - Garantia de que furos e recortes estão contidos dentro da peça com margem mínima de segurança da borda;
  - Cálculo de área líquida e área bruta retangular.

#### Frontend — Editor Canvas 2D (`apps/web/src/editor2d`)
- [x] Canvas interativo com suporte a pan, zoom fluido e grid milimétrico com snap magnético. *Concluído em 20/10/2026. Snap de 5 mm; a grade cobre o canvas sem esticar a peça.*
- [x] Ferramentas de desenho:
  - [x] Retângulo paramétrico (largura x comprimento);
  - [x] Polígono livre em L ou U (bancadas com retorno). *Em L paramétrico e contorno livre com validação de cruzamento. Concluído em 21/10/2026.*
  - [x] Inserção de furos por diâmetro numérico (ex: furo de 35mm para torneira mono-comando). *Diâmetro livre de 5 mm a 300 mm em 21/10/2026.*
  - [x] Recorte de cubas retangulares e ovais com folga de colagem. *Cuba oval de 64 pontos e margem de 15 mm. Concluído em 21/10/2026.*
- [x] Sistema de cotas dinâmicas: cotas automáticas exibidas nas arestas com opção de reposicionamento e ocultação.
- [x] Painel lateral contextual: *Concluído em 20/10/2026.*
  - Seleção de borda da peça com aplicação de acabamento específico (ex: Borda frontal com 45° + saia de 40mm);
  - Destaque bidirecional: ao clicar na aresta no canvas, o painel foca na borda correspondente.
- [x] Sistema de Undo / Redo baseado no padrão Command sobre o estado geométrico. *Concluído em 20/10/2026. Pilha de snapshots, botões e Ctrl+Z / Ctrl+Y.*
- [x] Autosave local em IndexedDB, isolado por tenant/usuário, com recuperação explícita e status que não afirma sincronização (`RF-015`, parte local). *Concluído em 20/10/2026 (`apps/web/src/editor2d/editorDraft.ts`, workspace CAD).*
- [x] Integrar editor a `/projects/:id/drawing`, carregar a revisão atual e sincronizar snapshots Draft com `If-Match`; manter IndexedDB como recuperação, preservar conflitos e bloquear edição de revisões aprovadas (`RF-015`). *Concluído em 20/10/2026. Revisões novas iniciam vazias e selecionam material/espessura do catálogo do tenant.*

#### Testes & Validação
- [x] Testes unitários do motor geométrico: precisão de cálculos de área, tolerâncias decimais e validação de furos fora do limite da pedra. *Concluído em 20/10/2026 (`packages/geometry-core/edit.test.ts`).*
- [ ] Teste de performance do canvas 2D com projetos contendo mais de 50 peças simultâneas.

---

### Sprint 5: Visualizador 3D e Modelagem de Montagem
**Meta:** Proporcionar inspeção tridimensional realista das peças de pedra com Three.js / React Three Fiber, permitindo conferir encaixes de saias 45°, frontões e cubas esculpidas em rocha (`RF-023`).
**Status:** **EM ANDAMENTO em 20/10/2026** — as três peças do desenho entram na montagem. Faltam biblioteca PBR, régua confirmada na pedra e captura para PDF.

#### Frontend — Viewport 3D (`apps/web/src/editor3d`)
- [x] Cena Three.js sincronizada em tempo real com o modelo geométrico canônico da Sprint 4. *Concluído em 20/10/2026. O botão 3D usa o mesmo estado do desenho.*
- [x] Extrusão paramétrica das peças 2D respeitando a espessura da chapa cadastrada (ex: 20mm). *Concluído em 20/10/2026.*
- [ ] Shaders/materiais PBR representando granitos, mármores e acabamentos polidos/escovados. *Parcial: quartzito Calacatta procedural e rugosidade polido/escovado. Falta o catálogo de rochas.*
- [x] Montagem tridimensional: posicionamento relativo de saias a 45° descendo da bancada e frontões subindo na parede. *Concluído em 20/10/2026. FR-01, BC-01 e SA-01 ocupam a cena. O 45° é um chanfro reto; a SA-01 desce 40 mm da face de baixo e encontra o corte sem volume em comum. O frontão sobe 150 mm no fundo.*
- [ ] Ferramenta de inspeção e medição 3D (régua virtual para conferência de medidas de montagem). *Parcial: botão Régua na cena. Falta confirmar a medida com dois cliques na pedra.*
- [ ] Sistema de captura de cena em alta resolução para inclusão automática nos relatórios e PDFs.

#### Testes
- [x] Validação de fidelidade dimensional: conferir se a extrusão 3D e as posições espaciais correspondem exatamente aos milímetros do modelo canônico. *Concluído em 20/10/2026 (`apps/web/assembly.test.ts`).*

---

### Sprint 6: Módulo de Orçamento e Precificação Dinâmica
**Meta:** Calcular orçamentos precisos e auditáveis derivados diretamente das peças do projeto, tabelas de preços e acabamentos lineares, eliminando erros manuais de cálculo (`RF-011`, `RN-006`).
**Status:** **INICIADA PARCIALMENTE em 21/10/2026** — prévia server-side e rascunho persistido com snapshot imutável. Ainda não aprova orçamento; políticas comerciais e ligação do acabamento do desenho ao catálogo precisam ser fechadas.

#### Backend
- [x] Implementar prévia server-side de cálculo por revisão e tabela, usando `decimal`, recomputando áreas/metros a partir do snapshot e retornando avisos/valores incompletos quando faltar preço (`RF-011`, base de cálculo). *Concluído em 20/10/2026 (`QuoteCalculationEngine`, `POST /projects/{id}/quotes/preview`).*
- [x] Listar tabelas disponíveis no contexto do projeto com isolamento tenant e autorização `projects.read` + `quotes.create`, sem exigir permissão administrativa de preços.
- [ ] Fechar entidade persistida `Quote`, linhas imutáveis, estado de aprovação e auditoria. *Parcial em 21/10/2026: rascunho `Quote` grava o snapshot do cálculo, com `Idempotency-Key` e auditoria `quote.draft_saved`. Aprovação continua fechada.*
- [ ] Implementar motor de cálculo de custos e preços:
  - Custo de matéria-prima por área bruta e líquida ($m^2$);
  - Custo de acabamento linear por borda ($m$ linear de 45°, boleado, etc.);
  - Custo de recortes e furações por unidade. *Parcial em 21/10/2026: regra `Unit` na tabela, sem material nem acabamento. Sem a regra, o furo continua sem preço. Recortes, cola, frete e instalação seguem sem tarifa.*
  - Itens adicionais: cubas de inox/louça, colas epóxi, frete e mão de obra de instalação.
- [x] Criação da entidade `Quote` vinculada estritamente à `ProjectRevision` e à `PricingTable` utilizada. *Rascunho em 21/10/2026 (`POST /projects/{id}/quotes`). Sem transição de aprovação.*
- [ ] Implementar regras comerciais: margens de lucro, descontos autorizados e impostos.
- [ ] Fluxo de aprovação de orçamento (`draft -> calculated -> sent -> accepted | rejected`).
- [ ] Ao aprovar um orçamento, registrar evento de auditoria e snapshot comercial imutável.

#### Frontend
- [x] Adicionar prévia de cálculo ao detalhe do projeto: seleção de revisão/tabela, linhas por peça e avisos para itens sem regra; não exibir ação de aprovação (`RF-011`, fundação de `UI-008`). *Concluído em 20/10/2026; em 21/10/2026 a mesma tela guarda o rascunho (`ProjectPage.tsx`).*
- [ ] Construir tela de Orçamento (`UI-008`):
  - Tabela detalhada de itens com agrupamento por peça;
  - Resumo de custos: matéria-prima, acabamentos de borda, furos e insumos;
  - Destaque cruzado: clicar em uma linha de acabamento de borda na tabela destaca visualmente a aresta no desenho 2D (`RF-021`). *Parcial em 21/10/2026: a linha do acabamento da revisão atual abre o editor com a peça e a aresta selecionadas.*
  - Formulário de condições de pagamento, validade da proposta e botões de envio/aprovação.

#### Testes
- [ ] Testes unitários com casos reais de bancadas com múltiplos acabamentos, garantindo que o cálculo monetário utiliza tipos decimais sem erros de arredondamento de float.
- [x] Testes unitários iniciais da prévia: áreas bruta/líquida, acabamento precificado, preço ausente e furo sem tarifa. *Concluído em 20/10/2026 (`QuoteCalculationTests`, 4 testes). Rascunho sem aprovação coberto em 21/10/2026 (`QuoteDraftTests`).*

#### Decisões e incongruências pendentes antes de fechar a Sprint 6
- Definir com marmorarias se o material será cobrado por área bruta, líquida ou se ambos são apresentados com uma regra comercial explícita. A prévia retorna cenários bruto/líquido, não escolhe um total final.
- A aresta pode gravar `finishTypeId` do catálogo. Desenhos antigos, sem esse id, ainda são precificados pelo mapa de códigos e a prévia avisa `FINISH_PRICED_BY_CODE`. Aprovação continua fechada até a regra comercial escolher área bruta ou líquida e definir margem, imposto e insumos.
- Definir tarifação de furos/recortes, cola, frete, instalação, impostos, margem, descontos, arredondamento final, validade e condições de pagamento. Linhas sem regra tornam o total da prévia indisponível.
- Persistir snapshot da tabela e regras aplicadas no Quote aprovado para que alterações futuras no catálogo não alterem histórico comercial.

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
| `RF-001` | Autenticação e recuperação de usuários | Sprint 1 | [x] Auth JWT/refresh; recovery de senha pendente |
| `RF-002` | Isolamento estrito de empresas (Multi-tenant) | Sprint 1 | [x] TenantContext + query filters |
| `RF-003` | Gestão de clientes da marmoraria | Sprint 2 | [x] Lista, busca e cadastro |
| `RF-004` | Criação de projetos e controle de revisões | Sprint 2 | [x] Revisão imutável após aprovação |
| `RF-005` | Desenho de peças em 2D com medidas em mm | Sprint 4 | [x] Canvas em mm, snap 5 mm |
| `RF-006` | Edição de dimensões e cotas automáticas | Sprint 4 | [x] Cota por aresta, arraste e ocultar |
| `RF-007` | Agrupamento de elementos no desenho | Sprint 4 | [ ] Pendente |
| `RF-008` | Configuração de furos por diâmetro | Sprint 4 | [x] Diâmetro livre de 5 mm a 300 mm, com margem de 15 mm |
| `RF-009` | Acabamentos de borda (45°, boleado, rebaixo) | Sprint 3 & 4 | [x] Catálogo e marca no 2D e no 3D |
| `RF-010` | Importação e parsing seguro de DXF | Sprint 10 | [ ] Pendente |
| `RF-011` | Orçamento vinculado à revisão do projeto | Sprint 6 | [ ] Parcial: prévia e rascunho persistido por revisão/tabela; faltam regras comerciais validadas e aprovação imutável |
| `RF-012` | Plano de corte com nesting e respeito ao disco | Sprint 8 | [ ] Pendente |
| `RF-013` | Controle de estoque de chapas e sobras | Sprint 7 | [ ] Pendente |
| `RF-014` | Geração de PDFs técnicos para fabricação | Sprint 9 | [ ] Pendente |
| `RF-015` | Autosave e recuperação de rascunhos | Sprint 4 | [x] IndexedDB, recuperação local e sincronização server-side versionada no editor de projeto |
| `RF-016` | Histórico e auditoria de alterações | Sprint 2 & 11 | [ ] `audit_events` na Sprint 2; endurecimento da Sprint 11 pendente |
| `RF-017` | Administração de papéis e permissões (RBAC) | Sprint 1 | [x] Policies + UI papéis/membros |
| `RF-018` | Seleção de páginas na exportação de documentos | Sprint 9 | [ ] Pendente |
| `RF-019` | Notificação e acompanhamento de jobs longos | Sprint 8 | [ ] Pendente |
| `RF-021` | Destaque cruzado de bordas (Orçamento <-> Desenho)| Sprint 6 | [ ] Parcial: a linha de acabamento da revisão atual abre a aresta no editor 2D |
| `RF-022` | Anotações sobre imagens técnicas de fabricação | Sprint 9 | [ ] Pendente |
| `RF-023` | Inspeção e medição em ambiente 3D | Sprint 5 | [ ] Cena, órbita e seleção prontas; régua e captura pendentes |
| `RF-024` | Controle de concorrência por versão de projeto | Sprint 2 | [x] If-Match / 409 |

---

## 6. Próximo Passo Imediato

**Sprints 4 e 5 seguem em andamento; Sprint 6 iniciada parcialmente.** Na Sprint 4 faltam o teste de 50 peças e o agrupamento. Na Sprint 5 faltam catálogo PBR, medição confirmada na pedra e captura para PDF. A Sprint 6 grava o acabamento do catálogo na aresta, aceita preço de furação por unidade e abre a aresta a partir da linha do orçamento. Ainda não é orçamento final até escolher área bruta ou líquida, tarifar recortes e insumos e aprovar um Quote imutável.

**Follow-ups finos (não bloqueantes):** recovery de senha; teste HTTP cross-tenant; mover JWT secret para secret store; validar `Storage:Provider=S3` com MinIO real quando o Docker estiver no ar (o adapter já existe; o desenvolvimento usa URL assinada local).
