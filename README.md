# Brinquedos da Mãe — Frontend

Interface em React + Tailwind para o sistema de gestão de vendas.

## Requisitos

- Node.js 18+
- Backend rodando em `http://localhost:8000`

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Acesse [http://localhost:5173](http://localhost:5173).

O Vite faz proxy de `/api` para o backend automaticamente em desenvolvimento.

## Seções

| Rota | Função |
|------|--------|
| `/` | Dashboard com resumo |
| `/cadastro` | Cadastro de clientes, produtos e pedidos |
| `/busca` | Busca com filtros e ordenação |
| `/graficos` | Gráficos de vendas e receita |
| `/status` | Alteração de status dos pedidos |
| `/estoque` | Controle de estoque |
| `/edicao` | Edição e exclusão de registros |

## Build

```bash
npm run build
```

Os arquivos estáticos ficam em `dist/`.
