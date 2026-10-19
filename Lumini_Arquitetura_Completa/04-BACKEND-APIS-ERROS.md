# 4. Backend, APIs, comunicação e erros

## 4.1 Fluxo de uma requisição

1. A API recebe HTTPS e cria/propaga `trace_id` e `correlation_id`.
2. Middleware valida tamanho, formato geral e autenticação.
3. Autorização verifica usuário, empresa ativa, permissão e escopo do recurso.
4. DTO de entrada é validado; não se confia em `tenant_id` enviado pelo cliente.
5. Caso de uso coordena domínio e persistência.
6. O domínio aplica invariantes e regras de negócio.
7. A infraestrutura executa transação, constraints e grava auditoria.
8. A API retorna DTO seguro e status HTTP adequado.
9. Erros inesperados são registrados com IDs correlacionáveis, sem expor stack trace ao cliente.

## 4.2 Módulos de backend

- **Identity/Organization:** usuários, organizações, memberships, convites e papéis.
- **Clients:** clientes da marmoraria.
- **Projects:** projeto, revisão, status, responsável e metadados.
- **Drawing:** peças, contornos, cotas, furos, grupos, materiais e acabamentos.
- **Imports:** upload e parsing de DXF/IFC; relatórios de compatibilidade.
- **Pricing:** tabelas de preço, regras, versões de orçamento e aprovações.
- **Cutting:** conjunto de peças, chapas elegíveis, restrições, algoritmo, resultados e aprovação.
- **Inventory:** chapas, sobras, reserva, consumo e movimentações.
- **Documents:** templates, exportações, páginas selecionadas, PDFs e anexos.
- **Audit:** eventos de negócio consultáveis e protegidos.
- **Jobs:** fila, progresso, retry, cancelamento quando possível e resultados.
- **Billing (futuro):** planos, limites e cobrança; não misturar cobrança com autorização de domínio.

## 4.3 Endpoints REST propostos

Prefixo: `/api/v1`. A tabela é uma proposta inicial, não um contrato já publicado.

| ID | Método e caminho | Objetivo | Permissão |
|---|---|---|---|
| API-001 | `GET /api/v1/me` | Perfil e empresa ativa | autenticado |
| API-002 | `GET /api/v1/clients` | Listar clientes com paginação | `clients.read` |
| API-003 | `POST /api/v1/clients` | Criar cliente | `clients.create` |
| API-004 | `GET /api/v1/projects` | Listar projetos | `projects.read` |
| API-005 | `POST /api/v1/projects` | Criar projeto | `projects.create` |
| API-006 | `GET /api/v1/projects/{id}` | Consultar projeto | `projects.read` |
| API-007 | `PATCH /api/v1/projects/{id}` | Atualizar metadados com controle de versão | `projects.edit` |
| API-008 | `POST /api/v1/projects/{id}/revisions` | Criar revisão do projeto | `drawing.edit` |
| API-009 | `GET /api/v1/projects/{id}/revisions/{revisionId}` | Ler revisão | `drawing.read` |
| API-010 | `POST /api/v1/projects/{id}/imports/dxf` | Iniciar importação DXF | `drawing.import` |
| API-011 | `GET /api/v1/jobs/{jobId}` | Consultar progresso de job | escopo do job + `jobs.read` |
| API-012 | `POST /api/v1/projects/{id}/quotes` | Calcular/criar orçamento | `quotes.create` |
| API-013 | `POST /api/v1/quotes/{id}/approve` | Aprovar orçamento | `quotes.approve` |
| API-014 | `POST /api/v1/projects/{id}/cutting-jobs` | Solicitar otimização | `cutting.create` |
| API-015 | `POST /api/v1/cutting-plans/{id}/approve` | Aprovar plano | `cutting.approve` |
| API-016 | `GET /api/v1/inventory/slabs` | Listar chapas e sobras | `inventory.read` |
| API-017 | `POST /api/v1/inventory/movements` | Registrar movimentação | `inventory.move` |
| API-018 | `POST /api/v1/projects/{id}/documents/exports` | Gerar PDF selecionado | `documents.export` |
| API-019 | `GET /api/v1/projects/{id}/audit` | Consultar histórico | `audit.read` |
| API-020 | `POST /api/v1/organizations/{id}/members/invitations` | Convidar membro | `members.manage` |

Para cada endpoint, OpenAPI deve documentar DTO, autenticação, autorização, query, códigos HTTP, erros, idempotência, efeitos colaterais e exemplos. Nenhum endpoint deve aceitar tenant como autoridade a partir do body.

## 4.4 Padrões de API

- Paginação por cursor ou página conforme volume; listas grandes não retornam sem limite.
- Filtros e ordenação usam campos permitidos em allowlist.
- Datas em ISO 8601 UTC no contrato; interface converte para fuso configurado.
- Valores monetários retornados como decimal em formato JSON consistente; nunca usar `float`/`double` para cálculo monetário.
- Dimensões têm unidade explícita no contrato ou convenção documentada; internamente milímetros.
- Versionamento por `/api/v1`; mudanças incompatíveis exigem nova versão ou migração coordenada.
- `ETag`/`If-Match` ou `version` para prevenir sobrescrita concorrente.
- `Idempotency-Key` para operações repetíveis por retry.
- Limites de tamanho e rate limit em endpoints de autenticação, importação e exportação.

## 4.5 Exemplo de requisição

```http
POST /api/v1/projects/8f.../cutting-jobs
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: 3f2a...
```

```json
{
  "projectRevisionId": "rev_123",
  "materialId": "mat_45",
  "stockSelection": ["slab_22", "remnant_31"],
  "constraints": {
    "kerfMm": 4,
    "edgeMarginMm": 10,
    "allowRotation": true,
    "respectVeinDirection": true
  }
}
```

A API valida que revisão, material, chapas e projeto pertencem ao tenant, que o usuário tem permissão e que as restrições estão dentro dos limites configurados. A resposta inicial é `202 Accepted` com `jobId` e URL de consulta.

## 4.6 Exemplo de sucesso assíncrono

```json
{
  "data": {
    "jobId": "job_01J...",
    "status": "queued",
    "statusUrl": "/api/v1/jobs/job_01J..."
  },
  "meta": {
    "correlationId": "corr_..."
  }
}
```

Estados de job: `queued`, `running`, `succeeded`, `failed`, `cancel_requested`, `cancelled` quando cancelamento for seguro. A resposta de status pode incluir percentual aproximado, etapa, timestamps e erro público recuperável.

## 4.7 Contrato padronizado de erro

```json
{
  "error": {
    "code": "BUSINESS_RULE_VIOLATION",
    "message": "O plano não pode ser aprovado enquanto houver peças sem material definido.",
    "details": [
      {
        "field": "parts[2].materialId",
        "code": "REQUIRED",
        "message": "Selecione um material."
      }
    ],
    "correlationId": "corr_01J..."
  }
}
```

Não devolver stack trace, SQL, caminho de arquivo, segredo, token ou dados pessoais desnecessários.

## 4.8 Taxonomia de erros

| Código | HTTP usual | Recuperável? | Ação de UI/operacional |
|---|---:|---|---|
| `VALIDATION_ERROR` | 400/422 | Sim, após corrigir | Mostrar campos e preservar entrada |
| `AUTHENTICATION_REQUIRED` | 401 | Sim, após login | Renovar sessão ou redirecionar |
| `PERMISSION_DENIED` | 403 | Não sem permissão | Explicar falta de acesso; não revelar recurso indevido |
| `RESOURCE_NOT_FOUND` | 404 | Talvez | Verificar link/escopo; evitar enumeração |
| `BUSINESS_RULE_VIOLATION` | 409/422 | Sim após corrigir estado | Mostrar regra e caminho de correção |
| `RESOURCE_CONFLICT` | 409 | Sim, com reconciliação | Comparar versão, recarregar ou mesclar |
| `RATE_LIMIT_EXCEEDED` | 429 | Sim após espera | Respeitar `Retry-After` |
| `DEPENDENCY_UNAVAILABLE` | 503 | Geralmente | Tentar novamente com backoff; mostrar status |
| `JOB_FAILED` | 200 na consulta do job ou endpoint apropriado | Depende | Mostrar etapa e erro público; permitir nova tentativa segura |
| `FILE_TYPE_UNSUPPORTED` | 422 | Não sem outro arquivo | Informar tipos/entidades aceitos |
| `FILE_TOO_LARGE` | 413 | Sim com arquivo menor | Mostrar limite permitido |
| `INTERNAL_ERROR` | 500 | Talvez | Mensagem neutra e correlation ID |

## 4.9 Retry e idempotência

- Retry com exponential backoff e jitter apenas em falhas transitórias.
- Não repetir automaticamente operações financeiras, aprovação ou baixa de estoque sem idempotência.
- Worker pode receber o mesmo job mais de uma vez; persistir estado e chave idempotente.
- Jobs com falha registram etapa, tentativas e causa interna; payload sensível não deve ser copiado para logs.
- Circuit breaker apenas quando houver dependência instável e evidência operacional.
- Timeout explícito para parser, storage, e-mail e dependências externas.

## 4.10 Eventos e comunicação

No MVP, chamadas REST síncronas para operações rápidas e jobs assíncronos para importação, otimização e geração de PDFs. Eventos internos podem comunicar `ProjectRevisionCreated`, `QuoteApproved`, `CuttingPlanApproved` e `InventoryMovementRecorded`, mas não introduzir broker distribuído apenas para trocar mensagens dentro do mesmo processo.

Se for necessário publicar eventos duráveis para workers, considerar padrão Outbox para evitar que a transação do banco confirme sem registrar o evento correspondente.
