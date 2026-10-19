# Governança Técnica e Instruções para Agentes — Lumini V2

Este arquivo orienta desenvolvedores e agentes de IA a manterem a arquitetura do **Lumini** consistente, segura e escalável, conforme definido na especificação arquitetural.

---

## 1. Princípios e Regras Obrigatórias

1. **Leitura prévia:** Antes de alterar código, ler a documentação de arquitetura, o roadmap central em `docs/ROADMAP_CENTRAL.md`, os ADRs e os testes do módulo afetado.
2. **Não inventar código existente:** Não presumir que funcionalidades descritas em documentos já existem no código; sempre inspecione os arquivos reais primeiro.
3. **Mudanças coerentes e incrementais:** Inspecionar o repositório e propor a menor mudança coerente; não reescrever grandes partes sem justificativa fundamentada.
4. **Respeito aos contratos e arquitetura:** Não mudar stack, arquitetura, schema ou contratos públicos sem explicar o motivo e atualizar ADRs e o roadmap.
5. **Validação server-side mandatória:** Não implementar regras de negócio exclusivamente no frontend. O backend é a autoridade de validação e integridade.
6. **Multi-tenancy rígido:** Toda rota privada deve ter autenticação, policy e validação de tenant (`tenant_id`) no servidor. Nunca aceitar `tenant_id` fornecido pelo cliente como autoridade.
7. **DTOs seguros:** Não expor entidades de banco diretamente em endpoints. Usar sempre DTOs `Request`/`Response`.
8. **Geometria canônica em milímetros:** Não misturar geometria em pixels ou unidades de tela com geometria canônica em milímetros (`mm`). O modelo de domínio é estritamente em milímetros.
9. **Imutabilidade de revisões aprovadas:** Não alterar projetos aprovados in-place; criar nova revisão ou rascunho versionado (`RN-005`, `ADR-005`).
10. **Precisão monetária absoluta:** Não calcular valores monetários com `float` ou `double`. Usar sempre tipos decimais exatos (`decimal` em C#, `numeric` no PostgreSQL, strings/centavos no frontend).
11. **Idempotência em operações críticas:** Não repetir operações de criação financeira, aprovação de orçamento, aprovação de plano de corte ou movimentação de estoque sem controle de idempotência (`Idempotency-Key`).
12. **Aprovação humana para corte:** Não tratar resultado de otimização/nesting como ordem de produção sem aprovação formal por usuário autorizado (`RN-009`).
13. **Segurança e privacidade (LGPD):** Não registrar tokens, senhas, chaves de API, conteúdo integral de desenhos em logs estruturados ou dados pessoais desnecessários.
14. **Critério para dependências:** Não adicionar dependência sem justificar manutenção, licença, tamanho de bundle e compatibilidade.
15. **Simplicidade inicial:** Não introduzir microserviços, brokers complexos ou cache distribuído sem evidência comprovada de necessidade operacional.
16. **Qualidade e testes:** Testes devem cobrir casos positivos, negativos, autorização multi-tenant e cenários de falha concorrente.
17. **Atualização contínua de documentação:** Ao concluir qualquer funcionalidade de uma sprint, atualizar imediatamente o checklist em `docs/ROADMAP_CENTRAL.md` marcando os itens concluídos com `[x]`.

---

## 2. Fluxo de Trabalho do Agente

1. **Contexto:** Resumir o objetivo da tarefa e consultar a Sprint ativa no `docs/ROADMAP_CENTRAL.md`.
2. **Inspeção:** Inspecionar os arquivos existentes, dependências e padrões vigentes.
3. **Contratos:** Validar invariantes de domínio e contratos que não podem ser quebrados.
4. **Execução:** Implementar em passos pequenos, modulares e testáveis.
5. **Verificação:** Executar lint, build e testes relevantes.
6. **Checklist:** Marcar os itens concluídos no `docs/ROADMAP_CENTRAL.md` e relatar as decisões tomadas.
