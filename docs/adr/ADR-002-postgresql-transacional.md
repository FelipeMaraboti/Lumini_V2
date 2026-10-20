# ADR-002: PostgreSQL como Banco de Dados Transacional e Snapshots JSONB

- **Status:** Aprovado
- **Data:** 19/10/2026
- **Contexto:** Especificação técnica e modelo de dados Lumini V2 (`05-BANCO-DE-DADOS.md`).

## Contexto e Problema
O modelo operacional de uma marmoraria exige integridade referencial rígida: projetos pertencem a clientes, revisões pertencem a projetos, orçamentos apontam para tabelas de preço versionadas e planos de corte consomem chapas reais cadastradas em estoque. O risco de inconsistência em estoques de pedras nobres ou valores monetários exige garantias ACID robustas. Ao mesmo tempo, geometrias CAD vetoriais complexas necessitam de persistência eficiente de snapshots históricos imutáveis por revisão.

## Decisão
Adotamos o **PostgreSQL** como o banco de dados relacional principal:
1. **Estrutura Relacional Estrita:** Entidades principais (`organizations`, `users`, `clients`, `projects`, `parts`, `edges`, `holes`, `slabs`, `quotes`) são mapeadas relacionalmente com Foreign Keys, índices compostos com `tenant_id` e constraints de validação (ex: dimensões e diâmetros estritamente positivos).
2. **Multi-Tenancy por Coluna com Query Filters:** Todas as tabelas contêm `tenant_id` obrigatório e os filtros globais do EF Core garantem isolamento automático no servidor.
3. **Snapshots Imutáveis em JSONB:** O desenho completo da revisão aprovada é persistido em coluna `jsonb` (`snapshot_jsonb`), garantindo imutabilidade histórica (`RN-005`, `ADR-005`).
4. **Precisão Numérica:** Valores monetários utilizam `numeric` e dimensões canônicas utilizam milímetros (`mm`).

## Consequências
- **Positivas:**
  - Garantia de isolamento transacional para reservas e baixas de estoque.
  - Alta performance em consultas relacionais indexadas por tenant.
  - Flexibilidade para serialização de geometrias CAD via JSONB sem sacrificar a integridade do restante do domínio.
- **Negativas/Mitigações:**
  - Necessidade de gerenciar migrações com disciplina: mitigado pelo uso de EF Core Migrations com rollback testado.
