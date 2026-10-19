# 10. Governança técnica e instruções para agentes de programação

## 10.1 Objetivo

Este arquivo orienta desenvolvedores e agentes de IA a manterem a arquitetura do Lumini consistente. Deve ser colocado em `AGENTS.md` na raiz do repositório e adaptado à estrutura real.

## 10.2 Regras obrigatórias

1. Antes de alterar código, ler o README, a arquitetura relevante, os ADRs e os testes do módulo.
2. Não presumir que funcionalidades descritas em documentos já existem no código.
3. Inspecionar o repositório e propor a menor mudança coerente; não reescrever grandes partes sem justificativa.
4. Não mudar stack, arquitetura, schema ou contratos públicos sem explicar o motivo e atualizar ADRs.
5. Não implementar regras de negócio exclusivamente no frontend.
6. Toda rota privada deve ter autenticação, policy e validação de tenant no servidor.
7. Não aceitar `tenant_id` fornecido pelo cliente como autoridade.
8. Não expor entidades de banco diretamente em endpoints.
9. Não misturar geometria em pixels com geometria canônica em milímetros.
10. Não alterar projetos aprovados em lugar; criar revisão nova.
11. Não calcular dinheiro com `float`/`double`.
12. Não repetir operações críticas sem idempotência.
13. Não tratar resultado de otimização como ordem de produção sem aprovação.
14. Não registrar tokens, senhas, conteúdo integral de desenhos ou dados pessoais desnecessários.
15. Não adicionar dependência sem justificar manutenção, licença, tamanho e compatibilidade.
16. Não introduzir microserviços, broker ou cache distribuído sem evidência de necessidade.
17. Testes devem cobrir casos positivos, negativos, autorização e falhas relevantes.
18. Atualizar documentação, OpenAPI e matriz de permissões quando mudar comportamento.
19. Ao concluir, relatar arquivos alterados, decisões, testes executados e limitações.
20. Se faltar uma regra de fabricação/comercial essencial, não inventar: registrar a pendência e propor opções.

## 10.3 Fluxo de trabalho do agente

1. Resumir o objetivo e identificar os módulos afetados.
2. Inspecionar arquivos existentes e padrões usados.
3. Identificar contratos e regras que não podem ser quebrados.
4. Apresentar plano curto de implementação para mudanças de risco médio/alto.
5. Implementar em passos pequenos.
6. Executar lint, build e testes relevantes.
7. Rever segurança, concorrência, multi-tenancy e estados de erro.
8. Atualizar documentação e ADRs.
9. Entregar resumo, arquivos e evidências de teste.

## 10.4 Checklist de pull request

- [ ] Escopo claro e pequeno.
- [ ] Sem dependências circulares.
- [ ] Validação de entrada e regras de domínio.
- [ ] Autorização server-side e tenant correto.
- [ ] Erros padronizados e mensagens seguras.
- [ ] Idempotência/concorrência tratadas quando necessário.
- [ ] Testes positivos e negativos.
- [ ] OpenAPI e tipos atualizados.
- [ ] Migração reversível ou plano de recuperação.
- [ ] Observabilidade sem dados sensíveis.
- [ ] Documentação e critérios de aceite atualizados.

## 10.5 Padrões de commits e versionamento

Usar commits descritivos, por exemplo:
- `feat(drawing): add diameter-based hole input`
- `fix(inventory): prevent concurrent negative stock`
- `test(rbac): cover cross-tenant project access`
- `docs(architecture): define revision immutability`

Usar versionamento semântico para releases quando adequado. Migrations e mudanças de contrato devem ser identificadas no changelog.

## 10.6 Pendências que exigem decisão humana

- Tolerâncias e restrições por material, ferramenta e máquina.
- Catálogo definitivo de acabamentos e suas regras de cálculo.
- Moeda, impostos, margem, descontos, comissão e arredondamento.
- Provedor de identidade, nuvem, object storage e fila.
- Níveis de suporte e acesso emergencial.
- Retenção de dados, backups, RPO/RTO e requisitos contratuais.
- Compatibilidade oficial de DXF/IFC e necessidade de CNC.
- Metas de performance após baseline real.
