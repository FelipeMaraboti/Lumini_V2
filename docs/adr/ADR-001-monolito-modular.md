# ADR-001: Monólito Modular para o Backend Lumini V2

- **Status:** Aprovado
- **Data:** 19/10/2026
- **Contexto:** Especificação arquitetural Lumini V2 (`02-ARQUITETURA-E-STACK.md`).

## Contexto e Problema
A plataforma Lumini conecta desenho CAD, orçamento, plano de corte, controle de chapas e relatórios de fabricação para marmorarias. No estágio inicial de desenvolvimento e validação de mercado, o domínio possui fortes ligações relacionais e transacionais (ex: aprovação de orçamento vinculada a revisões de projeto; plano de corte reservando chapas em estoque). A adoção prematura de microserviços distribuídos acarretaria alta complexidade de infraestrutura, consistência eventual frágil em operações financeiras e custos operacionais desnecessários.

## Decisão
Adotamos uma arquitetura de **Monólito Modular** em C# / ASP.NET Core (.NET 8), estruturado sob os princípios de **Clean Architecture / Ports & Adapters**:
- `Lumini.Domain`: Entidades, Value Objects, invariantes e regras de negócio puras (sem dependência de frameworks).
- `Lumini.Application`: Casos de uso, orquestração e interfaces de adaptadores.
- `Lumini.Infrastructure`: Implementações de persistência com EF Core / PostgreSQL, Object Storage e integrações.
- `Lumini.Api`: Camada de apresentação REST e autenticação.
- `Lumini.Workers`: Processamento assíncrono para algoritmos pesados (nesting, parsing DXF).

## Consequências
- **Positivas:**
  - Transações ACID simples e confiáveis entre módulos (ex: aprovação de corte e reserva de chapa).
  - Facilidade de deploy, observabilidade e depuração local unificada.
  - Limites de domínio bem definidos via projetos C# e testes de arquitetura automatizados (`Lumini.ArchitectureTests`).
  - Possibilidade de desacoplamento futuro de workers para instâncias dedicadas sem reescrever o domínio.
- **Negativas/Mitigações:**
  - Risco de acoplamento indevido entre módulos: mitigado com testes arquiteturais estritos que impedem dependências circulares.
