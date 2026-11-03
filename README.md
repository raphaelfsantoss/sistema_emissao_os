# Sistema de Emissão de O.S.

Sistema web para criar, editar e imprimir **ordens de serviço** de uma oficina mecânica. Cada usuário entra com e-mail e senha, cadastra a O.S. com os dados do cliente, do veículo, das peças e da mão de obra, e gera um PDF pronto para impressão e assinatura do cliente.

> Projeto de estudo desenvolvido para uma oficina real. Os dados da empresa foram substituídos por dados fictícios ("Oficina Exemplo").

## Funcionalidades

- Login com e-mail e senha (Supabase Auth)
- Cadastro, edição e exclusão de ordens de serviço
- Numeração sequencial automática das O.S. (feita pelo banco)
- Registro de quem emitiu cada O.S. e da data de emissão
- Lista de peças com quantidade, valor unitário e subtotal
- Cálculo automático do total das peças e do total da O.S.
- Campo de observações (ex.: número de aprovação)
- Geração de PDF com cabeçalho da empresa, tabela de peças, totais e espaço para assinatura; quando o conteúdo não cabe, o bloco final passa para uma nova página

## Tecnologias

- [React](https://react.dev/) + [Vite](https://vite.dev/)
- [Supabase](https://supabase.com/) (Auth + Postgres)
- [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [oxlint](https://oxc.rs/) para lint

## Banco de dados

O projeto usa duas tabelas no Supabase:

**`perfis`**: um registro para cada usuário que pode emitir O.S.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | uuid | Mesmo id do usuário em `auth.users` |
| `nome` | text | Nome exibido em "Emitida por" |

**`ordens`**: as ordens de serviço.

| Coluna | Tipo | Descrição |
| --- | --- | --- |
| `id` | uuid | Chave primária |
| `numero_seq` | identity | Número sequencial da O.S. |
| `data_emissao` | data | Data de emissão |
| `emitido_por` | uuid | Referência a `perfis.id` |
| `cliente` | text | Nome do cliente |
| `veiculo` | text | Veículo |
| `placa` | text | Placa |
| `km` | | Quilometragem |
| `reclamacao` | text | Reclamação do cliente |
| `servico_executado` | text | Serviço executado |
| `observacoes` | text | Observação de uma linha |
| `mao_de_obra` | numeric | Valor da mão de obra |
| `pecas` | jsonb | Lista de peças (`descricao`, `quantidade`, `valorUnitario`) |

Um **trigger** no banco preenche `numero_seq`, `data_emissao` e `emitido_por` (com o usuário logado) a cada inserção, e impede que `emitido_por` seja alterado depois. Por isso o front-end nunca envia esses três campos.

Recomenda-se ativar **Row Level Security (RLS)** nas duas tabelas, liberando acesso apenas a usuários autenticados.

## Como rodar

1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```
2. Crie um projeto no Supabase com as tabelas descritas acima.
3. Copie o arquivo `.env.example` para `.env` e preencha com a URL e a anon key do seu projeto Supabase:
   ```bash
   cp .env.example .env
   ```
4. Crie um usuário em **Authentication → Users** e uma linha correspondente em `perfis`, com o mesmo `id`.
5. Rode o projeto:
   ```bash
   npm run dev
   ```

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve a versão de produção localmente |
| `npm run lint` | Verifica o código com oxlint |
