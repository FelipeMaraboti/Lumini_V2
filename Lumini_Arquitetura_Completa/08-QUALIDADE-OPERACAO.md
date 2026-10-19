# 8. Testes, observabilidade, performance e operação

## 8.1 Estratégia de testes

| Nível | Ferramentas sugeridas | Alvo |
|---|---|---|
| Unitário backend | xUnit | regras de domínio, cálculos, transições e validações |
| Integração backend | xUnit + PostgreSQL de teste | transações, constraints, RLS, queries e migrations |
| Arquitetura | testes de dependência | impedir dependências proibidas entre camadas |
| Frontend unitário | Vitest + Testing Library | formulários, estados e componentes |
| Contrato API | OpenAPI + testes de contrato | DTOs, status e compatibilidade |
| E2E | Playwright | fluxos principais de projeto, orçamento, corte e PDF |
| Segurança | testes negativos e scanners | IDOR, RBAC, uploads e configuração |
| Geometria | fixtures determinísticas | tolerâncias, furos, contornos, rotação e espelhamento |
| Performance | carga e projetos sintéticos | tempos de abrir, selecionar, editar, salvar e otimizar |
| Acessibilidade | auditoria automática + revisão manual | teclado, foco, contraste e leitores de tela |

## 8.2 Cenários críticos obrigatórios

- Usuário de tenant A tenta abrir projeto/arquivo/job de tenant B.
- Usuário sem permissão tenta aprovar orçamento/plano.
- Dois usuários salvam a mesma revisão; o segundo recebe conflito seguro.
- Repetir chamada de criação por timeout não duplica orçamento, job ou movimento.
- Estoque não fica negativo em aprovações concorrentes.
- DXF malformado ou gigante não derruba API nem worker.
- PDF de uma revisão não muda quando o projeto evolui.
- Falha de conexão durante autosave não informa sucesso falso.
- Worker recebe mensagem duplicada e não duplica efeitos colaterais.
- Restaurar backup em ambiente isolado e verificar dados e objetos.
- Importação com entidade não suportada gera relatório e não corrompe o projeto.
- Algoritmo respeita kerf, margens e orientação de veio configurada.

## 8.3 Metas de performance

Não estabelecer SLOs definitivos sem baseline. Na fase inicial:
1. Definir projetos de referência pequenos, médios e grandes.
2. Medir abertura, edição, autosave, cálculo de orçamento, otimização e PDF.
3. Definir percentis e limites com usuários e orçamento de infraestrutura.
4. Guardar benchmark por versão para detectar regressão.

Métricas úteis:
- p50/p95 de latência de API;
- taxa de 4xx/5xx;
- tempo e falha por tipo de job;
- duração de importação por quantidade de entidades;
- tempo de renderização e memória do editor;
- tamanho médio de projetos e PDFs;
- conexões ativas e consultas lentas;
- falhas de autosave e conflitos;
- taxa de sucesso de backup e restauração.

## 8.4 Observabilidade

- Logs estruturados com `timestamp`, `level`, `service`, `environment`, `trace_id`, `correlation_id`, `tenant_id` minimizado/identificador interno, `user_id` quando necessário e `error_code`.
- Métricas técnicas separadas de eventos de auditoria.
- Tracing OpenTelemetry entre API e workers quando útil.
- Health checks separados: liveness e readiness.
- Alertas para aumento de 5xx, jobs presos, storage indisponível, falha de backup e uso de recursos.
- Não registrar tokens, senhas, conteúdo integral de desenhos ou dados pessoais desnecessários.
- Auditoria é append-only para a aplicação e tem acesso mais restrito que logs comuns.

## 8.5 Ambientes e deploy

- **Local:** Docker Compose para dependências, dados fictícios e configuração de desenvolvimento.
- **CI:** lint, format, build, unit tests, integração, testes de segurança básicos e validação OpenAPI.
- **Homologação:** dados sintéticos ou anonimizados, teste manual de fluxos e migrações.
- **Produção:** segredos gerenciados, TLS, banco privado, storage privado, monitoramento e backup.
- Migrations são executadas como etapa controlada; evitar duas instâncias migrando simultaneamente.
- Deploy deve ser reversível em nível de aplicação; migrations devem preferir padrão expand/contract para compatibilidade.
- Não fazer deploy se testes críticos falharem ou se migration destrutiva não tiver plano de recuperação.

## 8.6 Backup e recuperação

Definir RPO/RTO com base em impacto e custo. Manter backups criptografados, com acesso separado e proteção contra exclusão acidental. Testar restauração do banco e dos objetos em conjunto; registrar duração, divergências e responsável. Backup não testado não é evidência de recuperação.

## 8.7 CI/CD sugerido

1. Instalar dependências a partir de lockfiles.
2. Lint e format.
3. Build frontend/backend.
4. Testes unitários.
5. Testes de integração com banco isolado.
6. Verificação de contratos OpenAPI.
7. Scans de dependências e secrets.
8. Build de imagens versionadas.
9. Deploy em homologação.
10. Smoke tests.
11. Aprovação e deploy de produção.
12. Monitoramento pós-deploy e rollback se critérios forem violados.

## 8.8 Riscos operacionais

- Arquivos DXF/IFC com complexidade inesperada: executar parser em worker com limites.
- Otimização combinatória demorada: timeouts, limites de tamanho, progresso e possibilidade de cancelar.
- Custos de storage e geração de documentos: quotas e política de retenção.
- Dependência de provedor de identidade/storage: interfaces e plano de exportação.
- Alteração de regra comercial: versionar tabelas e preservar orçamentos antigos.
