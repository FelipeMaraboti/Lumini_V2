# 6. Segurança, autenticação, RBAC e privacidade

## 6.1 Modelo de identidade

Relação: `User → Membership → Organization/Tenant → Role → Permission → Resource`.

Um usuário pode participar de mais de uma empresa. A empresa ativa é contexto da sessão, mas o servidor valida membership e autorização em cada operação.

## 6.2 Papéis iniciais sugeridos

| Papel | Descrição |
|---|---|
| `Owner` | Proprietário; configura empresa, membros e permissões; não pode remover o último Owner |
| `Admin` | Administra operação e usuários conforme política; acesso financeiro configurável |
| `Designer` | Cria/edita desenho e revisões; pode importar arquivos |
| `Estimator` | Calcula e gerencia orçamentos; pode consultar desenho |
| `CutOperator` | Consulta e prepara planos de corte; aprova somente se concedido |
| `InventoryManager` | Movimenta chapas e sobras; acesso a estoque |
| `Viewer` | Consulta projetos/documentos liberados |
| `SupportLimited` | Papel interno de suporte temporário, just-in-time e auditado; não é papel normal de tenant |

Papéis são presets; permissões explícitas são a fonte efetiva. Evitar permissões especiais escondidas no código por nome de papel.

## 6.3 Catálogo de permissões

- `organization.read`, `organization.manage`
- `members.read`, `members.manage`
- `roles.read`, `roles.manage`
- `clients.read`, `clients.create`, `clients.edit`, `clients.archive`
- `projects.read`, `projects.create`, `projects.edit`, `projects.archive`
- `drawing.read`, `drawing.edit`, `drawing.import`, `drawing.export`
- `quotes.read`, `quotes.create`, `quotes.edit`, `quotes.approve`, `quotes.export`
- `pricing.read`, `pricing.manage`
- `cutting.read`, `cutting.create`, `cutting.approve`, `cutting.export`
- `inventory.read`, `inventory.create`, `inventory.move`, `inventory.adjust`
- `documents.read`, `documents.create`, `documents.export`, `documents.template.manage`
- `reports.read`, `audit.read`
- `billing.read`, `billing.manage`

## 6.4 Matriz RBAC inicial

`L` = listar/visualizar, `C` = criar, `E` = editar, `A` = aprovar, `X` = exportar, `M` = administrar. Matriz ilustrativa: revisar com o negócio.

| Módulo/ação | Owner | Admin | Designer | Estimator | CutOperator | InventoryManager | Viewer |
|---|---:|---:|---:|---:|---:|---:|---:|
| Empresa/configuração | M | M limitado | — | — | — | — | — |
| Membros/papéis | M | M conforme política | — | — | — | — | — |
| Clientes | L/C/E | L/C/E | L/C | L/C/E | L | L | L limitado |
| Projetos | L/C/E | L/C/E | L/C/E | L | L | L | L |
| Desenho | L/E | L/E | L/E/importar | L | L | L | L |
| Orçamento | L/C/E/A | L/C/E/A | L limitado | L/C/E/A se concedido | L | L limitado | L liberado |
| Preços | L/M | L/M limitado | — | L; edição opcional | — | — | — |
| Plano de corte | L/C/A | L/C/A | L/C | L | L/C/A se concedido | L | L liberado |
| Estoque | L/C/E | L/C/E | L | L | L | L/C/E | L limitado |
| PDF/documentos | L/X | L/X | L/X | L/X | L/X | L/X limitado | L/X liberado |
| Auditoria | L | L conforme política | — | — | — | — | — |

## 6.5 Autenticação e sessão

- Preferir OIDC gerenciado ou ASP.NET Core Identity conforme custo, experiência operacional e exigência de MFA/SSO.
- Cookies `HttpOnly`, `Secure`, `SameSite` são adequados para sessão web quando arquitetura permitir; se usar bearer tokens, definir armazenamento e renovação sem expor tokens a XSS.
- Nunca armazenar credenciais em `localStorage` sem análise de risco.
- Recuperação de senha com token de uso único, validade curta e resposta que não revele se a conta existe.
- Revogar sessões ao desativar usuário, alterar credenciais ou detectar risco.
- Rate limit para login, recuperação e convite.
- MFA recomendado para Owner/Admin e acesso interno de suporte.
- Convites têm expiração, token armazenado como hash e uso único.

## 6.6 Autorização e isolamento

- Negar por padrão.
- Validar no servidor cada endpoint, recurso e ação.
- Obter tenant a partir da identidade/membership autenticada.
- Verificar que IDs relacionados pertencem ao mesmo tenant.
- Não confiar em esconder botão no frontend.
- Jobs, PDFs, arquivos e links assinados precisam de autorização e escopo tenant.
- URLs assinadas curtas, não públicas por padrão.
- Papéis e permissões não podem permitir que um administrador de tenant conceda privilégios que não possui, salvo política explícita.
- Proteção contra remoção do último Owner e autoelevação de privilégios.
- Testes automatizados de acesso horizontal e vertical.

## 6.7 Modelo de ameaças

| Ameaça | Impacto | Mitigações principais |
|---|---|---|
| IDOR / acesso cruzado entre tenants | Vazamento ou alteração de projeto | filtro tenant, autorização por recurso, RLS adicional e testes negativos |
| XSS em texto/importação | Roubo de sessão ou alteração de ações | escaping, sanitização, CSP, não renderizar HTML importado diretamente |
| CSRF | Ações executadas com sessão da vítima | proteção CSRF se cookies, SameSite, validação de origem |
| SQL injection | Leitura/alteração de dados | ORM/queries parametrizadas, revisão de SQL raw |
| Upload DXF/IFC malicioso | DoS, parser crash, arquivos perigosos | limites, sandbox/worker, timeout, allowlist, inspeção e armazenamento privado |
| Abuso de recursos | Custo elevado ou indisponibilidade | rate limit, quotas, limites de entidades, jobs com timeout |
| Exposição de arquivos | Dados comerciais e de clientes expostos | autorização, URLs assinadas curtas, storage privado |
| Escalada de privilégio | Aprovação ou administração indevida | policy-based authorization e testes |
| Corrupção por concorrência | Estoque negativo ou revisões perdidas | transações, versionamento otimista, idempotência |
| Segredos em logs | Comprometimento | redaction, revisão e controles de acesso |
| Ransomware/perda de dados | Paralisação | backups isolados, menor privilégio e ensaio de restauração |

## 6.8 Privacidade e LGPD

- Coletar apenas dados necessários ao relacionamento comercial e execução do projeto.
- Documentar finalidade, base legal, retenção e responsável por cada categoria de dado.
- Permitir correção/exportação/exclusão conforme obrigações legais e política de retenção.
- Minimizar dados pessoais em logs e analytics.
- Controlar acesso a telefone, e-mail, endereço e documentos.
- Definir resposta a incidente, canal de contato e processo de avaliação/notificação.
- Contratos e responsabilidades entre Lumini e marmoraria precisam ser avaliados juridicamente; este documento não substitui assessoria jurídica.

## 6.9 Checklist de segurança mínimo

- [ ] Todas as rotas privadas exigem autenticação.
- [ ] Todos os endpoints possuem policy explícita.
- [ ] Tenant derivado do contexto autenticado.
- [ ] Testes de acesso cruzado entre empresas.
- [ ] Upload validado por tamanho, formato, tempo e conteúdo.
- [ ] Secrets fora do repositório e rotacionáveis.
- [ ] HTTPS, headers de segurança, CORS restritivo e CSP.
- [ ] Rate limit e proteção contra abuso.
- [ ] Logs redigem tokens e dados sensíveis.
- [ ] Backup e restauração testados.
- [ ] Dependências verificadas e atualizadas por processo.
- [ ] Processo de incidentes documentado.
