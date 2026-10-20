# 9. Plano de implementação, riscos e checklists

> **Governança do andamento:** a execução e o status das sprints são acompanhados exclusivamente em [`docs/ROADMAP_CENTRAL.md`](../docs/ROADMAP_CENTRAL.md). As fases abaixo descrevem uma visão arquitetural de dependências e entregáveis; não são um cronograma paralelo e não devem ser usadas para marcar progresso.

## 9.1 Fases de implementação

| Fase | Entregáveis | Dependências / gate |
|---|---|---|
| 0 — Descoberta | auditoria do repositório, entrevistas, glossário, requisitos, riscos e ADRs iniciais | validar fluxos reais e restrições de fabricação |
| 1 — Fundação | estrutura, CI, configuração, logging, banco, migrations e ambientes | build e pipeline verdes |
| 2 — Identidade | organizações, memberships, login, RBAC e isolamento | testes de acesso cruzado aprovados |
| 3 — Núcleo do negócio | clientes, projetos, revisões, materiais e catálogo de acabamentos | integridade e estados validados |
| 4 — Editor 2D | geometria canônica, cotas, seleção, agrupamento, undo/redo, autosave | testes geométricos e recuperação |
| 5 — Orçamento | tabelas de preço versionadas, linhas e aprovação | cálculos verificados por exemplos reais |
| 6 — Estoque e corte | chapas/sobras, restrições, worker, visualização e aprovação | validação por especialista da marmoraria |
| 7 — Documentos | templates, PDF, imagens, anotações e seleção de páginas | documentos aprovados por usuários |
| 8 — Robustez | performance, segurança, auditoria, backup, testes E2E | critérios de produção cumpridos |
| 9 — Evolução | IFC, colaboração, CNC e recursos avançados | demanda e retorno demonstrados |

## 9.2 Paralelização

Podem evoluir em paralelo depois de estabilizados os contratos:
- design system e páginas administrativas;
- modelo de clientes/projetos e base de testes;
- prova técnica do editor 2D e pipeline DXF;
- prova de geração de PDF;
- benchmark inicial do algoritmo de corte.

Não devem ser implementados em paralelo sem contrato acordado:
- geometria e orçamento;
- plano de corte e consumo de estoque;
- revisões e autosave;
- RBAC e endpoints protegidos;
- schema de API e cliente gerado.

## 9.3 Riscos prioritários

| Risco | Probabilidade/impacto inicial | Mitigação |
|---|---|---|
| Regras de fabricação mal definidas | Alta/alto | validar com profissionais e criar exemplos de aceite |
| Geometria 2D/3D divergente | Média/alto | modelo geométrico canônico e testes de propriedades |
| Importação DXF heterogênea | Alta/médio-alto | matriz de suporte, fixtures reais e relatório de conversão |
| Algoritmo de corte inadequado | Média/alto | benchmarks com casos reais e aprovação humana |
| Vazamento entre tenants | Média/crítico | autorização por recurso, RLS adicional e testes adversariais |
| Perda de trabalho no editor | Média/alto | autosave versionado, snapshots e recuperação testada |
| Escopo excessivo | Alta/alto | MVP definido e gates por fase |
| Custo de infraestrutura maior que receita | Média/médio | monitoramento de custos, quotas e arquitetura simples |
| PDF não utilizável na produção | Média/alto | validar modelos com operadores e critérios objetivos |
| Sobras mal representadas | Média/alto | modelar geometria e origem; validar com fluxo real |

## 9.4 Checklist para iniciar desenvolvimento

- [ ] Repositório atual auditado; build e testes baseline conhecidos.
- [ ] Mapa dos fluxos reais da marmoraria documentado.
- [ ] Termos e regras de acabamentos validados.
- [ ] Unidades e tolerâncias de desenho definidas.
- [ ] Matriz de formatos DXF suportados e arquivos de teste reunidos.
- [ ] Estratégia de identidade, hospedagem e armazenamento escolhida.
- [ ] Modelo de tenant e papéis aprovado.
- [ ] Revisões e estados de projeto definidos.
- [ ] Regras de orçamento e arredondamento documentadas.
- [ ] Restrições do plano de corte validadas com máquinas/processo real.
- [ ] Critérios de aceite do PDF definidos.
- [ ] Projetos de benchmark pequeno/médio/grande disponíveis.

## 9.5 Checklist de prontidão para produção

- [ ] Testes de autorização e isolamento multi-tenant aprovados.
- [ ] Nenhum segredo no repositório ou nos logs.
- [ ] HTTPS, CORS, CSP e rate limit configurados.
- [ ] Backup e restauração do banco e arquivos testados.
- [ ] Alertas e dashboards operacionais.
- [ ] Runbook para falha de API, banco, storage e workers.
- [ ] Plano de rollback e migrations compatíveis.
- [ ] Jobs têm timeout, retry e idempotência.
- [ ] Falha de autosave e conflito foram testados.
- [ ] Importação e otimização têm limites de recursos.
- [ ] Documentos gerados são rastreáveis à revisão.
- [ ] Termos, privacidade e processo de incidentes revisados.
- [ ] Custo recorrente medido em ambiente semelhante à produção.
- [ ] Usuários-chave validaram fluxos e PDFs.

## 9.6 Métricas de sucesso do produto

Estabelecer baseline antes de fixar metas:
- tempo médio entre entrada de medidas e orçamento pronto;
- quantidade de retrabalho por projeto;
- aproveitamento de chapa e desperdício por material;
- proporção de sobras reaproveitadas;
- tempo de abertura de projetos grandes;
- taxa de falha de importação;
- PDFs devolvidos para correção;
- falhas de autosave;
- tempo para recuperar projeto;
- adoção por função e frequência de uso.

Não prometer redução percentual de desperdício ou tempo antes de medir casos reais.
