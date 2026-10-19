# 1. Produto, requisitos e critérios de aceite

## 1.1 Visão

O Lumini ajuda uma marmoraria a transformar medidas, desenhos e necessidades de clientes em peças fabricáveis, orçamento rastreável, plano de corte e documentação de produção, reduzindo retrabalho e desperdício.

## 1.2 Personas

| Persona | Necessidade principal | Acesso típico |
|---|---|---|
| Proprietário/administrador | Controlar operação, pessoas, preços e indicadores | Administração da empresa |
| Projetista | Criar e revisar desenho, peças, cotas e acabamentos | Desenho e projetos |
| Orçamentista | Calcular custos, margens e propostas | Orçamento e preços autorizados |
| Operador de corte | Preparar e executar o plano de corte | Corte e documentos liberados |
| Estoquista | Controlar chapas, lotes e sobras | Estoque |
| Instalador/leitor | Consultar documentos aprovados | Somente leitura |
| Suporte Lumini | Diagnosticar problemas com acesso excepcional auditado | Acesso temporário e restrito |

## 1.3 Escopo do MVP

1. Cadastro de empresa, usuários e clientes.
2. Projetos com revisões e estados explícitos.
3. Editor 2D com medidas em milímetros, seleção, movimentação, rotação, cotas e agrupamento básico.
4. Peças com material, espessura, dimensões, furos e bordas/acabamentos iniciais.
5. Importação DXF com relatório de entidades aceitas/rejeitadas e revisão visual antes de confirmar.
6. Orçamento conectado à revisão do projeto.
7. Estoque básico de chapas e sobras.
8. Plano de corte com restrições configuráveis e validação humana antes da produção.
9. PDF técnico e comercial com seleção de páginas, cotas configuráveis, imagens e anotações.
10. Autosave, histórico de revisões e recuperação.
11. RBAC multiempresa, auditoria e testes de isolamento.
12. Observabilidade, backup, deploy e suporte operacional.

## 1.4 Fora do MVP, salvo necessidade comprovada

- Colaboração simultânea com cursores em tempo real.
- Importação IFC/BIM completa com fidelidade universal.
- Exportação CNC para qualquer máquina/controlador.
- Aplicativo móvel completo para edição geométrica.
- Otimização distribuída em vários serviços.
- IA que altera projetos ou define fabricação sem revisão humana.

## 1.5 Requisitos funcionais

| ID | Requisito | Prioridade | Critério de aceite resumido |
|---|---|---|---|
| RF-001 | Autenticar usuários | MVP | Login/logout e recuperação sem revelar se e-mail existe |
| RF-002 | Isolar empresas | MVP | Usuário de uma empresa não lê nem altera registros de outra |
| RF-003 | Gerenciar clientes | MVP | Criar, consultar, editar e arquivar conforme permissão |
| RF-004 | Criar projetos | MVP | Projeto tem empresa, cliente, responsável, status e revisão |
| RF-005 | Desenhar peças em 2D | MVP | Geometria usa unidade de domínio, não pixels |
| RF-006 | Editar dimensões e cotas | MVP | Validação de dimensão positiva e exibição de unidade |
| RF-007 | Agrupar elementos | MVP | Grupo move/edita elementos associados sem quebrar referências |
| RF-008 | Configurar furos | MVP | Entrada por diâmetro; raio derivado e consistência garantida |
| RF-009 | Definir acabamentos de borda | MVP | Cada borda pode ter acabamento, custo e observações |
| RF-010 | Importar DXF | MVP | Pré-visualização, resumo de entidades e confirmação explícita |
| RF-011 | Gerar orçamento | MVP | Valores calculados por regra versionada e revisão de projeto |
| RF-012 | Gerar plano de corte | MVP | Respeita limites configurados e exibe avisos/uso da chapa |
| RF-013 | Gerenciar chapas e sobras | MVP | Entrada, reserva, consumo e origem rastreáveis |
| RF-014 | Gerar PDF técnico | MVP | PDF mostra revisão, identificadores, cotas e acabamentos selecionados |
| RF-015 | Autosave e recuperação | MVP | Falha simulada permite recuperar última revisão persistida |
| RF-016 | Histórico de alterações | MVP | Autor, data, ação e versão são consultáveis conforme permissão |
| RF-017 | Administrar usuários e papéis | MVP | Alterações de acesso são autorizadas e auditadas |
| RF-018 | Exportar e selecionar páginas | MVP | Exportação não remove conteúdo do projeto original |
| RF-019 | Mostrar progresso de tarefas longas | MVP | Job informa queued/running/succeeded/failed e erro recuperável |
| RF-020 | Importar IFC | Futuro/validar | Formatos e entidades suportados definidos em matriz de compatibilidade |
| RF-021 | Destacar borda entre orçamento e desenho | Alta | Seleção em um módulo realça a borda correspondente no outro |
| RF-022 | Anotar imagens de fabricação | Alta | Setas/linhas/notas ficam posicionadas e editáveis no documento |
| RF-023 | Medir em 3D | Alta | Régua/medidas visualizam dimensões do modelo sem alterar a geometria |
| RF-024 | Controle de concorrência | MVP | Edição baseada em versão detecta conflito, sem sobrescrever silenciosamente |

## 1.6 Requisitos não funcionais

| ID | Requisito | Verificação proposta |
|---|---|---|
| RNF-001 | Segurança multi-tenant | Testes de acesso cruzado por ID, endpoint e arquivo |
| RNF-002 | Integridade dimensional | Testes determinísticos com tolerâncias explícitas |
| RNF-003 | Recuperação | Teste de crash, reconexão e restauração de revisão |
| RNF-004 | Desempenho | Benchmark com projeto sintético grande e metas definidas após baseline |
| RNF-005 | Observabilidade | Toda requisição tem trace/correlation ID |
| RNF-006 | Acessibilidade | Teclado, foco, contraste e mensagens não dependentes apenas de cor |
| RNF-007 | Manutenibilidade | Regras críticas no domínio, testes e decisões registradas |
| RNF-008 | Backup | Restauração ensaiada e documentada, não apenas backup agendado |
| RNF-009 | Privacidade | Minimização, retenção e acesso por finalidade |
| RNF-010 | Compatibilidade | Matriz explícita de versões e entidades DXF/IFC suportadas |

## 1.7 Regras de negócio

- **RN-001:** todo registro operacional pertence a exatamente uma empresa (`tenant_id`).
- **RN-002:** toda dimensão de domínio é armazenada em milímetros como unidade canônica; conversão ocorre na entrada/visualização.
- **RN-003:** diâmetro é a entrada preferencial para furos; raio é derivado como `diameter_mm / 2`.
- **RN-004:** arredondamento de exibição não altera a geometria armazenada.
- **RN-005:** cada projeto tem revisão monotônica e imutável para fins de rastreabilidade; alterações criam nova revisão ou rascunho controlado.
- **RN-006:** orçamento registra a revisão do projeto e a versão da tabela de preços utilizada.
- **RN-007:** plano de corte aprovado registra versão do algoritmo, restrições, chapa e conjunto de peças de entrada.
- **RN-008:** alterações após aprovação invalidam ou marcam como desatualizados os artefatos dependentes.
- **RN-009:** nenhuma otimização é considerada ordem de produção até aprovação por usuário autorizado.
- **RN-010:** uma chapa/sobra não pode ser consumida acima do saldo disponível; reserva e baixa são transacionais.
- **RN-011:** a seleção de páginas do PDF afeta somente a exportação, nunca exclui páginas do projeto.
- **RN-012:** exclusão de registros com dependências críticas deve ser arquivamento ou bloqueada; usar exclusão física apenas conforme política de retenção.
- **RN-013:** erros de concorrência não sobrescrevem mudanças silenciosamente.
- **RN-014:** cores distinguem projetos/peças, mas cada item também tem código, rótulo e legenda acessível.
- **RN-015:** toda alteração de papel, preço, aprovação, estoque ou revisão publicada gera evento de auditoria.

## 1.8 Estados principais

**Projeto:** `draft → in_review → approved → in_production → completed`; transições para `cancelled` somente conforme política.  
**Orçamento:** `draft → calculated → sent → accepted | rejected | expired`; nova revisão cria nova versão comercial.  
**Plano de corte:** `draft → calculating → ready_for_review → approved → in_production → completed`; `failed` é estado do job, não necessariamente do plano.  
**Job:** `queued → running → succeeded | failed`; cancelamento permitido somente se o worker ainda puder interromper com segurança.

## 1.9 Definição de pronto

Uma funcionalidade só está pronta quando:
- requisito e regra de negócio estão documentados;
- validação ocorre no cliente e no servidor quando apropriado;
- autorização é verificada no servidor;
- estados de carregamento, vazio, sucesso, erro e recuperação existem;
- testes positivos, negativos e de permissão foram executados;
- logs não contêm segredos nem dados desnecessários;
- documentação e contratos foram atualizados;
- o critério de aceite foi demonstrado em homologação.
