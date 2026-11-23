# Compras Liiv no Google Apps Script

## O que é cada arquivo
- `index.html` – o sistema (o mesmo de hoje, com a camada de dados trocada)
- `Codigo.gs` – servidor: banco em planilha, fotos no Drive, login por e-mail
- `Dados.gs` – os 379 registros atuais (catálogo, fornecedores, pedidos, estoque, financeiro)

## Instalar (uma vez, ~10 min)
1. Acesse script.google.com, "Novo projeto". Nome: **Compras Liiv**.
2. Apague o conteúdo de Código.gs e cole o `Codigo.gs`.
3. No "+" ao lado de Arquivos: Script → nome `Dados` → cole o `Dados.gs`.
4. "+" → HTML → nome `index` → cole o `index.html`.
5. Escolha a função **instalar** na barra superior e clique em Executar. Autorize quando o Google pedir
   ("Avançado" → "Acessar Compras Liiv"). Isso cria a planilha "Compras Liiv - Banco",
   a pasta "Compras Liiv - Anexos" no seu Drive e importa os dados. Você vira administrador.
6. Implantar → Nova implantação → Tipo: App da Web.
   - Executar como: **Eu**
   - Quem tem acesso: **Qualquer pessoa com Conta do Google** (ou só a organização, se todos tiverem e-mail da empresa)
7. Copie o link e envie para a equipe. Quem abrir pela primeira vez pede acesso; você aprova em
   Administração → Equipe e perfis, escolhendo perfil (líder, diretor, solicitante…).

## Importante
- Identificação por e-mail funciona sem ressalvas quando todos usam o **mesmo domínio Google Workspace**.
  Com Gmail pessoal misturado, o Google pode não informar o e-mail em "Executar como: Eu".
  Nesse caso, publique com "Executar como: usuário que acessa o app", compartilhe a planilha e a pasta
  com todos como Editor, e mande o link.
- Mais um administrador: no editor, rode `adminAdd('email@empresa.com')` (edite o e-mail antes).
- Atualizar o sistema depois: cole o novo `index.html` e use Implantar → Gerenciar implantações → Editar → Nova versão.
- Dados ficam na planilha (aba `db`). Não edite à mão; use o sistema.
- Fotos: o Drive guarda com "qualquer pessoa com o link pode ver" (necessário para aparecer no sistema). Imagens grandes são reduzidas para 1600 px.
- Atualização entre pessoas a cada ~7 s. Limite do Google: algumas centenas de acessos por minuto, suficiente para essa equipe.

## GitHub (backup)
Crie um repositório privado `compras` e suba esta pasta (index.html, Codigo.gs, Dados.gs, LEIA-ME.md).
