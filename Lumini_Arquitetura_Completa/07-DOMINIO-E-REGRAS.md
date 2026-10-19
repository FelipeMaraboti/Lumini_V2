# 7. Domínio: desenho, acabamentos, orçamento, corte, estoque e documentos

## 7.1 Modelo central do projeto

O `Project` organiza o trabalho. Cada `ProjectRevision` representa um snapshot rastreável do desenho e das configurações relevantes. Orçamentos, planos de corte e PDFs apontam para uma revisão específica, não para um estado mutável indefinido.

Cada `Part` deve ter ID estável e código legível. Ela pode referenciar material, espessura, contorno, furos, bordas, acabamentos, posição no projeto, origem e estado de fabricação.

Campos conceituais de peça:
- `id`, `partCode`, `name`, `revisionId`
- `materialId`, `thicknessMm`
- `outerContour`, `innerContours`
- `holes[]` com centro e diâmetro
- `edges[]` com ID, segmento, acabamento e comprimento
- `finishOperations[]`
- `sourceImportId` opcional
- `notes`, `colorGroup`, `manufacturingStatus`

## 7.2 Desenho 2D/3D

Requisitos:
- movimentação por mouse e entrada numérica precisa;
- incremento de rotação configurável e transformação exata;
- régua/medição 3D para inspeção;
- setas/handles que continuam utilizáveis em diferentes níveis de zoom;
- agrupamento de peças, texto, cubas e elementos relacionados;
- espelhamento de subprodutos com validação de orientação;
- cotas e textos são anotações independentes da geometria;
- histórico de operações undo/redo;
- validação de contornos, auto-interseção, furos fora da peça e dimensões impossíveis.

A precisão real e a tolerância de fabricação precisam ser definidas por material, ferramenta e máquina; não assumir que precisão visual é precisão de fabricação.

## 7.3 Importação DXF e IFC

### DXF
1. Upload para área privada temporária.
2. Validar extensão, MIME, tamanho e hash.
3. Processar em worker com timeout e limites de entidades.
4. Interpretar apenas entidades suportadas na versão documentada.
5. Gerar relatório: aceitas, ignoradas, convertidas e inválidas.
6. Pré-visualizar antes de gravar no projeto.
7. Usuário confirma unidade, escala, orientação e origem.
8. Criar revisão de importação e registrar origem.

Testar arquivos de ferramentas e arquitetos reais. Blocos, unidades ausentes, splines, hachuras e referências externas podem exigir conversão ou avisos.

### IFC/BIM — fase futura
- Definir versões IFC e classes de objeto suportadas.
- Importar geometria/metadados para consulta, não assumir que todo objeto vira peça fabricável.
- Exigir mapeamento de unidades, materiais e orientação.
- Criar pré-visualização e relatório de conversão.
- Nunca substituir projeto existente automaticamente.

## 7.4 Acabamentos e bordas

O catálogo deve suportar códigos configuráveis, incluindo pelo menos conceitos como:
- rebaixo italiano;
- rebaixo americano;
- meia-esquadria;
- borda boleada;
- polimento e acabamentos customizados.

A terminologia e a regra de cálculo devem ser configuráveis por empresa e validadas com profissionais do setor. Cada acabamento pode ter parâmetros: profundidade, ângulo, espessura, extensão, lado, método e observações.

Uma borda é uma entidade selecionável e identificável. Ao selecioná-la na precificação, destacar a mesma borda no desenho. Não inferir custo somente da cor.

## 7.5 Furos e recortes

- Usuário informa diâmetro em mm; raio é derivado.
- Validar diâmetro positivo e posição.
- Verificar se o furo está dentro do contorno e distância mínima de bordas conforme regra configurada.
- Tipos podem incluir torneira, cuba, passagem técnica ou personalizado, mas a taxonomia final deve ser validada.
- Não tratar todos os recortes como círculos; suportar contornos internos quando necessário.
- Exportação PDF deve mostrar diâmetro, posição e notas conforme template.

## 7.6 Orçamento

O orçamento deve preservar:
- revisão de projeto de origem;
- tabela e versão de preços;
- itens/quantidades/unidades;
- material e espessura;
- comprimento de bordas por acabamento;
- furos/recortes e serviços;
- transporte/instalação se configurados;
- descontos, impostos e margem conforme política comercial;
- moeda e regra de arredondamento;
- usuário e data de aprovação.

Cálculos monetários usam decimal. Alterar uma tabela de preços não muda orçamento histórico aprovado; cria-se nova versão ou recalcula-se explicitamente um orçamento em rascunho.

## 7.7 Otimização de corte

Entradas:
- conjunto de peças e revisão;
- material, espessura e orientação de veio;
- chapas e sobras disponíveis;
- kerf/largura de corte;
- margem de segurança;
- rotação/espelhamento permitidos;
- defeitos/áreas proibidas, quando cadastrados;
- restrições da máquina.

Saídas:
- placements por peça com coordenadas e rotação;
- chapa de origem;
- taxa de aproveitamento;
- área usada e sobra estimada;
- peças não acomodadas e motivo;
- versão do algoritmo e parâmetros usados;
- avisos e status de validação.

Regras:
- otimização é proposta, não ordem final, até aprovação;
- algoritmo precisa ser determinístico para os mesmos dados/parâmetros quando tecnicamente viável, ou registrar seed e versão;
- geometria deve respeitar kerf, margens, contornos e restrições;
- resultados devem ser visualizados e inspecionados;
- não consumir estoque antes da confirmação/aprovação;
- ao aprovar, revalidar disponibilidade das chapas dentro da transação;
- gerar sobras com dimensões e origem rastreáveis.

## 7.8 Estoque de chapas e sobras

Estados propostos: `available`, `reserved`, `consumed`, `quarantined`, `discarded`. A reserva não é consumo; a baixa efetiva registra movimento imutável.

Cada sobra deve registrar chapa de origem, plano de corte, dimensões, material, espessura, localização, condição e status. A geometria da sobra pode exigir polígono real, não somente retângulo, conforme evolução.

## 7.9 PDF técnico e comercial

Opções:
- escolher páginas para exportar sem remover páginas do projeto;
- ocultar cotas não necessárias;
- configurar formato, precisão, unidade e cor das cotas;
- incluir imagens externas e capturas geradas do ambiente 3D;
- sobrepor setas, linhas e notas para corte, acabamento, rebaixo, furos, junções e montagem;
- cabeçalho gerado por template editável;
- identificar projeto, cliente, revisão, material, espessura, escala e data;
- exportar vistas 2D/3D com qualidade definida;
- registrar template e revisão de origem.

O PDF gerado é um artefato imutável ligado à revisão e às opções de exportação. Regerar cria novo artefato, não altera o arquivo já enviado.

## 7.10 Autosave e recuperação

- Guardar alterações no cliente como rascunho local temporário quando permitido, com proteção e prazo de retenção.
- Persistir revisões no servidor em intervalo configurável e após operações importantes.
- Estado visível: `Saving`, `Saved`, `Pending changes`, `Save failed`, `Conflict`.
- Snapshot periódico e/ou operações incrementais; escolher após medir tamanho e complexidade.
- Na inicialização, comparar revisão local recuperável com versão remota e perguntar qual recuperar quando houver conflito.
- Nunca sobrescrever uma revisão aprovada sem criar nova versão.
- Autosave não substitui backup.
- Falha de rede deve manter alterações recuperáveis e informar que ainda não estão confirmadas no servidor.

## 7.11 Rastreabilidade ponta a ponta

Ao selecionar uma peça, permitir encontrar:
- no desenho;
- no orçamento e linha de custo;
- no plano de corte e chapa;
- no PDF técnico;
- no estoque/sobra originada;
- no histórico de alterações.

Cada ligação guarda IDs e revisões, evitando associação frágil por nome ou cor.
