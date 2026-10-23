# instagram-autopost

Agende **posts no feed, Reels e Stories** do Instagram a partir de uma fila em JSON, publicados pela **API oficial do Instagram**. Sem senha, sem raspagem, sem automação de navegador: nada que faça a conta ser bloqueada.

*[Read in English](README.md)*

- Um arquivo, zero dependências (Node 20+).
- Roda em qualquer lugar: GitHub Actions (workflow incluso), cron ou na mão.
- Limites anti-bloqueio: intervalo mínimo entre execuções, teto diário, alguns minutos entre itens e nunca o mesmo item duas vezes.
- Renova o token a cada execução, para ele não vencer.

## Como funciona

1. Hospede imagens e vídeos em URLs públicas HTTPS (o GitHub Pages serve bem).
2. Liste tudo em `queue.json` com data e hora (`at`, horário local; use `TZ_OFFSET_MIN=-180` para Brasília).
3. Rode `node publish.mjs` de hora em hora. O que já venceu é publicado; o resto espera. O que saiu fica em `state.json`.

**Ele confere o perfil antes.** Antes de cada post o robô lê seus posts, reels e stories no ar. Pula o item cuja imagem já foi publicada (hash do arquivo) ou cuja legenda é parecida com um post recente, respeita o limite diário de cada tipo (`MAX_FEED` 3, `MAX_REELS` 2, `MAX_STORIES` 3) e segura o item cujo `topic` (opcional) saiu nas últimas 24 h (`TOPIC_GAP_H`). Ritmo de exemplo: 3 stories (manhã, tarde e noite) e 2 reels entre eles.

## Configuração (10 minutos)

1. Mude a conta do Instagram para **Profissional** (Empresa ou Criador).
2. Em developers.facebook.com: crie um app, adicione o caso de uso *Gerenciar mensagens e conteúdo no Instagram* e, em *Configuração da API com login do Instagram*: adicione a permissão `instagram_business_content_publish`, adicione sua conta como Testador do Instagram (aceite o convite no Instagram), **Adicionar conta** e **Gerar token**.
3. Coloque o token no segredo `IG_TOKEN` (GitHub: Settings → Secrets → Actions). Nunca faça commit dele.
4. Faça fork, edite `queue.json` e ative o Actions. Pronto.

Veja a tabela de variáveis e os requisitos de mídia no [README em inglês](README.md).

## Uso responsável

Use para o seu conteúdo, nas suas contas. Não use para spam, seguir em massa ou mandar mensagem para quem não pediu: isso viola os termos da Meta e a LGPD.

## Licença

MIT
