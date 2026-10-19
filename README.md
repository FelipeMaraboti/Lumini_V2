# Lumini V2 — Plataforma Integrada para Marmorarias

> **Do projeto técnico ao planejamento de corte e execução sem retrabalho.**

O **Lumini V2** é uma solução de software especializada para o setor de marmorarias, conectando desenho técnico 2D/3D com cotas precisas, catálogo de acabamentos (45°, boleados, rebaixos italianos), formação de preços rastreável, algoritmo de otimização de corte (nesting sobre chapas com kerf de serra) e geração de pranchas PDF executivas para o chão de fábrica.

---

## 🏛️ Arquitetura do Sistema

- **Arquitetura Geral:** Monólito Modular com Clean Architecture e Single Source of Truth (SSOT).
- **Backend:** C# / .NET 8 Web API (`Lumini.Api`, `Lumini.Application`, `Lumini.Domain`, `Lumini.Infrastructure`, `Lumini.Workers`).
- **Banco de Dados:** PostgreSQL 16 (transações ACID, multi-tenancy nativo por `tenant_id`, concorrência otimista).
- **Armazenamento:** Object Storage compatível com S3 (MinIO em dev) para pranchas e arquivos DXF.
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Three.js / React Three Fiber.
- **Domínio Geométrico:** Núcleo canônico em milímetros (`packages/geometry-core`), desacoplado de pixels e renderers.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- [.NET 8 SDK](https://dotnet.microsoft.com/)
- [Node.js 20+](https://nodejs.org/)
- [Docker](https://www.docker.com/) (opcional para rodar PostgreSQL e MinIO locais)

### 1. Inicializar Infraestrutura Local (Opcional)
```bash
docker compose up -d
```

### 2. Executar o Backend (.NET 8)
```bash
cd apps/api
dotnet run --project Lumini.Api
```
A API iniciará com Swagger em `https://localhost:5001/swagger`.

### 3. Executar o Frontend (React + Vite)
```bash
cd apps/web
npm install
npm run dev
```
Acesse a aplicação no navegador em `http://localhost:5173`.

---

## 📋 Governança e Roadmap

- **Governança Técnica e Instruções para Agentes:** [AGENTS.md](AGENTS.md)
- **Manifesto de Visão do Produto:** [docs/PRODUCT_VISION.md](docs/PRODUCT_VISION.md)
- **Roadmap Central Sprint a Sprint:** [docs/ROADMAP_CENTRAL.md](docs/ROADMAP_CENTRAL.md)

---

## 📄 Licença
Proprietário — Lumini V2 2026.
