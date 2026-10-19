# 3. Frontend, navegação, editor e UX

## 3.1 Navegação principal

```text
Aplicação
├── Visão geral
├── Clientes
├── Projetos
│   └── Projeto
│       ├── Resumo
│       ├── Desenho 2D/3D
│       ├── Peças e acabamentos
│       ├── Orçamento
│       ├── Corte
│       ├── Estoque relacionado
│       ├── Documentos/PDF
│       ├── Revisões
│       └── Histórico
├── Estoque
│   ├── Chapas
│   ├── Sobras
│   ├── Movimentações
│   └── Reservas
├── Tabelas de preço
├── Relatórios
└── Configurações
    ├── Empresa
    ├── Usuários e convites
    ├── Papéis e permissões
    ├── Materiais e acabamentos
    ├── Preferências de desenho
    └── Plano e faturamento (se aplicável)
```

## 3.2 Layout do editor

- **Barra superior:** projeto, revisão, status de salvamento, undo/redo, validar, comparar revisão e exportar.
- **Barra esquerda:** selecionar, desenhar, cota, texto, furo, recorte, imagem, grupo e ferramentas de transformação.
- **Área central:** canvas 2D ou viewport 3D, grade, zoom, pan, snapping e guias.
- **Painel direito contextual:** dimensões, material, espessura, bordas, furos, acabamento e metadados do item selecionado.
- **Painel inferior/recolhível:** árvore de peças, camadas, avisos, histórico de operações e mensagens de validação.
- **Legenda acessível:** cores por projeto/material acompanhadas por código, nome ou padrão; cor não é o único indicador.

## 3.3 Telas e contratos

| ID / tela | Rota proposta | Dados / API | Permissão |
|---|---|---|---|
| UI-001 Login | `/login` | sessão/autenticação | pública |
| UI-002 Visão geral | `/app` | resumo de projetos e tarefas | `dashboard.read` |
| UI-003 Clientes | `/app/clients` | lista paginada, busca, filtros | `clients.read` |
| UI-004 Cliente | `/app/clients/:id` | detalhe, projetos vinculados | `clients.read` |
| UI-005 Projetos | `/app/projects` | status, cliente, responsável, datas | `projects.read` |
| UI-006 Projeto | `/app/projects/:id` | projeto e revisão atual | `projects.read` |
| UI-007 Editor | `/app/projects/:id/drawing` | geometria, peças, cotas, materiais | `drawing.read/edit` |
| UI-008 Orçamento | `/app/projects/:id/quote` | itens, regras, revisão e valores | `quotes.read/edit` |
| UI-009 Corte | `/app/projects/:id/cutting` | job, layout, chapa, desperdício | `cutting.read/create/approve` |
| UI-010 Estoque | `/app/inventory` | chapas, sobras e movimentos | `inventory.read` |
| UI-011 Documentos | `/app/projects/:id/documents` | PDFs, exportações e templates | `documents.read/export` |
| UI-012 Usuários | `/app/settings/users` | membros e convites | `members.manage` |
| UI-013 Papéis | `/app/settings/roles` | permissões por papel | `roles.manage` |
| UI-014 Auditoria | `/app/settings/audit` | eventos filtrados | `audit.read` |

## 3.4 Estados obrigatórios em cada tela

1. **Loading:** skeleton ou indicador contextual; não bloquear toda a aplicação sem necessidade.
2. **Empty state:** explicar o que falta e oferecer ação compatível com a permissão.
3. **Success:** feedback conciso; não depender apenas de toast que desaparece rapidamente.
4. **Validation error:** mostrar junto ao campo e preservar entradas.
5. **Permission denied:** explicar que a ação não está autorizada sem revelar detalhes internos.
6. **Network error:** permitir tentar novamente quando seguro e preservar rascunho local.
7. **Conflict:** exibir que existe revisão mais nova, oferecer comparar/recarregar/copiar alterações quando viável.
8. **Background job:** estado e progresso, horário, botão de atualizar/cancelar quando suportado.
9. **Save failure:** mostrar que alterações não foram confirmadas no servidor; nunca exibir “Salvo” antes da confirmação.

## 3.5 Estado e comunicação

- TanStack Query para estado remoto e invalidação após mutações.
- Estado local para seleção, zoom, ferramenta ativa, painel aberto e operações temporárias.
- Estado de geometria do editor separado do cache de requisições.
- Zod valida formato no cliente; servidor sempre repete validações confiáveis.
- Cancelar requests obsoletas quando trocar de projeto.
- Evitar retry automático em operações não idempotentes, como baixa de estoque ou aprovação.
- Usar `Idempotency-Key` nas operações de criação/execução que possam ser repetidas por timeout.
- Contratos TypeScript devem ser gerados ou verificados contra OpenAPI, evitando DTOs divergentes.

## 3.6 Modelo de geometria

O modelo de domínio deve ser independente de pixels e renderer. Recomenda-se armazenar coordenadas e dimensões em milímetros, com precisão decimal adequada e conversão para coordenadas de tela somente na camada de renderização.

Entidades geométricas conceituais:
- `Part`: peça fabricável.
- `Contour`: contorno externo e contornos internos.
- `Hole`: centro e diâmetro.
- `Edge`: segmento/aresta identificável e acabamento aplicado.
- `DimensionAnnotation`: anotação de cota, separada da geometria.
- `TextAnnotation`: texto editável.
- `Group`: conjunto de elementos movidos como unidade.
- `Transform`: posição, rotação e, se suportado, espelhamento controlado.
- `MaterialAssignment`: material e espessura.
- `GeometryRevision`: versão persistida do modelo.

Regras:
- zoom e escala de tela não alteram valores geométricos;
- a rotação precisa ter precisão previsível e permitir entrada numérica;
- setas de transformação não podem variar de modo que impeça controle fino;
- espelhamento deve preservar identificadores e recalcular orientações quando necessário;
- cotas podem ser movidas sem modificar a geometria;
- desfazer/refazer atua sobre comandos do modelo, não sobre pixels capturados.

## 3.7 Performance do editor

- Renderização por demanda para objetos não alterados, quando aplicável.
- Virtualizar listas e árvores extensas.
- Evitar recriar toda a cena em cada alteração pequena.
- Separar cálculo geométrico pesado do thread principal quando a prova técnica indicar necessidade.
- Medir projetos de referência com centenas e milhares de elementos antes de definir metas finais.
- Limitar arquivos de importação por tamanho, entidades e tempo de processamento.
- Exibir aviso se o documento está desatualizado em relação ao orçamento ou plano de corte.

## 3.8 Acessibilidade e responsividade

- Navegação por teclado para formulários e controles comuns.
- Atalhos do editor documentados e sem conflito com o navegador.
- Foco visível, contraste e nomes acessíveis para ícones.
- Mensagens de erro lidas por tecnologias assistivas.
- Cores com legenda e códigos de texto.
- Editor completo prioriza desktop; celular pode ter leitura, aprovação e consulta de documentos no MVP.
