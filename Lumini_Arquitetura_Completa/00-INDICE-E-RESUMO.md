# LUMINI — Arquitetura completa e especificação do produto

**Versão:** 1.0 — proposta inicial  
**Data:** 19/10/2026  
**Status:** arquitetura-alvo a validar contra o repositório existente e com usuários de marmoraria.

> Este conjunto de documentos descreve o que deve ser construído. Não significa que todos os recursos já existam no protótipo. Preserve o código que funciona e aplique a arquitetura por etapas.

## Índice

1. [Visão do produto, escopo e requisitos](01-PRODUTO-REQUISITOS.md)
2. [Arquitetura, stack, repositório e diagramas](02-ARQUITETURA-E-STACK.md)
3. [Frontend, telas, navegação e UX](03-FRONTEND-TELAS.md)
4. [Backend, APIs, comunicação e erros](04-BACKEND-APIS-ERROS.md)
5. [Banco de dados e modelo lógico](05-BANCO-DE-DADOS.md)
6. [Identidade, RBAC, segurança e privacidade](06-SEGURANCA-RBAC.md)
7. [Domínio de desenho, corte, orçamento, estoque e PDF](07-DOMINIO-E-REGRAS.md)
8. [Qualidade, testes, observabilidade e operação](08-QUALIDADE-OPERACAO.md)
9. [Plano de implementação, riscos e checklists](09-ROADMAP-E-CHECKLISTS.md)
10. [Instruções para agentes e governança](10-AGENTS-E-GOVERNANCA.md)

## Resumo executivo

O Lumini é uma plataforma SaaS para marmorarias, conectando desenho técnico 2D/3D, peças e acabamentos, orçamento, otimização de corte, chapas e sobras de estoque e documentos de fabricação. O diferencial proposto é a **rastreabilidade ponta a ponta**: uma peça possui identidade estável e os módulos relacionados apontam para a mesma revisão do projeto.

### Arquitetura recomendada

- **Frontend:** React + TypeScript + Vite; Tailwind CSS + shadcn/ui/Radix; TanStack Query; React Hook Form + Zod.
- **Editor 2D/3D:** núcleo geométrico independente do renderer; SVG/Canvas para desenho 2D (decidir após prova técnica); Three.js + React Three Fiber para visualização 3D.
- **Backend:** C# + ASP.NET Core Web API, organizado por módulos e camadas.
- **Persistência:** PostgreSQL + EF Core/Npgsql; armazenamento de objetos S3-compatible para DXF, IFC, imagens, PDFs e snapshots.
- **Processamento demorado:** fila e workers para importação, otimização de corte, PDFs e relatórios. Não é obrigatório começar com microserviços.
- **Arquitetura:** monólito modular com limites de domínio, Clean Architecture/Ports and Adapters onde trouxer valor.
- **Segurança:** multi-tenant, RBAC no servidor, isolamento por empresa, auditoria e testes negativos.
- **Operação:** Docker, CI/CD, logs estruturados, métricas, tracing e backups testados.

### Decisões que precisam ser confirmadas

1. Estado e estrutura reais do repositório atual.
2. Algoritmo de otimização já implementado e restrições reais das máquinas.
3. Formatos DXF/IFC que serão oficialmente suportados.
4. Provedor de autenticação, nuvem e armazenamento, considerando orçamento.
5. Regras comerciais: custos, impostos, margem, comissões, arredondamento e aprovação.
6. Número de usuários, empresas e tamanho típico de projetos.
7. Se haverá edição simultânea em tempo real ou somente controle de versões.
8. Necessidade de exportação para CNC e formatos específicos de fabricantes.

## Convenções deste documento

- **Obrigatório/MVP:** necessário para uma primeira versão operacional confiável.
- **Recomendado:** forte orientação técnica, sujeita a confirmação.
- **Futuro:** não deve bloquear o MVP.
- **Hipótese:** proposta ainda não validada com o negócio.
- IDs como `RF-001`, `RN-001`, `RNF-001`, `API-001` e `TC-001` devem ser mantidos estáveis e referenciados nos testes.
