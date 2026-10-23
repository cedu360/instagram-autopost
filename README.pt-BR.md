# instagram-autopost

Um robô que publica **fotos, Stories e Reels** no seu Instagram **sozinho, todo dia, nos horários que você escolher**. Usa a **API oficial do Instagram**: sem senha, sem robô clicando no navegador, nada que faça a conta ser bloqueada. Roda de graça no GitHub, então continua postando mesmo com o seu computador desligado.

*[Read in English](README.md)*

## O caminho, do zero ao post

```
1. CRIAR o conteúdo      →   2. COLOCAR na fila        →   3. O ROBÔ POSTA
   Canva / Gemini (fotos)       pasta media/ + queue.json      5 horários por dia
   Runway (Reels)               aqui no GitHub                 no seu Instagram
```

### 1. Criar o conteúdo (fora daqui)

| O quê | Onde fazer | Formato para exportar |
|---|---|---|
| **Foto do feed** | [Canva](https://www.canva.com) ou [Gemini](https://gemini.google.com) | JPG, quadrado (1080×1080) ou em pé (1080×1350) |
| **Story** | Canva ou Gemini | JPG ou MP4, em pé (1080×1920) |
| **Reel** | [Runway](https://runwayml.com) (vídeo por IA) ou CapCut | MP4, em pé (1080×1920), de 5 a 60 segundos |

Dica: peça para a IA revisar a arte antes ("deixe isso chamativo, com chamada para baixar o app / visitar o site").

### 2. Colocar na fila (aqui no GitHub, pelo navegador)

1. Abra a pasta **`media`** deste repositório → **Add file → Upload files** → arraste as fotos e vídeos → **Commit changes**.
2. Abra o arquivo **`queue.json`** → clique no lápis (✏️ editar) → acrescente um bloco por post, assim:

```json
[
  { "id": "promo-01", "type": "FEED",    "url": "https://SEU-USUARIO.github.io/SEU-REPO/media/promo-01.jpg", "caption": "Sua legenda aqui.\n\n#suamarca" },
  { "id": "story-01", "type": "STORIES", "url": "https://SEU-USUARIO.github.io/SEU-REPO/media/story-01.jpg" },
  { "id": "reel-01",  "type": "REELS",   "url": "https://SEU-USUARIO.github.io/SEU-REPO/media/reel-01.mp4",  "caption": "Legenda do reel" }
]
```

- **`id`**: um nome único para o post (não repita).
- **`type`**: `FEED` (foto), `STORIES` ou `REELS`.
- **`url`**: o endereço público do arquivo que você subiu (veja "GitHub Pages" abaixo).
- **`caption`**: a legenda (Stories não têm legenda). `\n` quebra a linha.
- Opcionais: **`"approved": false`** segura o item até você aprovar; **`"at": "2026-11-01T09:30"`** só deixa sair a partir dessa data/hora; **`"topic": "promo"`** evita dois posts do mesmo assunto em 24 h.

3. Clique em **Commit changes**. Pronto: está na fila.

### 3. O robô posta sozinho

Todo dia, no horário de Brasília:

| Horário | O que sai |
|---|---|
| 09:37 | 1 foto + 1 story |
| 11:47 | 1 reel |
| 14:07 | 1 foto + 1 story |
| 16:47 | 1 reel |
| 19:37 | 1 foto + 1 story |

Em cada horário ele pega **o próximo item da fila** daquele tipo. Antes de postar ele **olha o seu perfil** e pula o que repetiria (mesma imagem ou legenda parecida com um post recente) e nunca passa de 3 fotos, 2 reels e 3 stories por dia. O que já saiu fica anotado em `state.json`.

**Acompanhar:** aba **Actions** → **autopost**. Bolinha verde = publicou; vermelha = deu erro (o GitHub também te manda e-mail).
**Postar agora / testar:** Actions → autopost → **Run workflow**. Marque "Só mostrar o que sairia" para testar sem publicar.

## Configuração (uma vez, uns 15 minutos)

1. **Instagram profissional:** no app do Instagram, Configurações → Tipo de conta → mude para **Profissional** (Empresa ou Criador).
2. **Pegar a chave (token) na Meta:** em [developers.facebook.com](https://developers.facebook.com) → **Criar app** → caso de uso *Gerenciar mensagens e conteúdo no Instagram* → **Configuração da API com login do Instagram**:
   - em *Permissões*, adicione `instagram_business_content_publish`;
   - em *Funções*, adicione sua conta como **Testador do Instagram** e aceite o convite no Instagram (Configurações → Apps e sites → Convites de testador);
   - volte e clique em **Adicionar conta** → **Gerar token**. Copie o token (ele aparece uma vez só).
3. **Copiar este robô:** clique em **Fork** (canto de cima) para ter a sua cópia.
4. **Guardar o token na sua cópia:** Settings → **Secrets and variables → Actions** → **New repository secret** → nome `IG_TOKEN`, valor = o token. **Nunca cole o token em arquivo ou mensagem.**
5. **Ligar o GitHub Pages** (para as fotos terem endereço público): Settings → **Pages** → Source: *Deploy from a branch* → branch `main`, pasta `/ (root)` → Save. Os arquivos de `media/` ficam em `https://SEU-USUARIO.github.io/SEU-REPO/media/...`.
6. **Ligar o robô:** aba **Actions** → clique em "I understand my workflows, go ahead and enable them". Pronto.

O token vale 60 dias e o robô renova a cada execução. Se você ficar mais de 60 dias sem nenhuma execução, gere outro (passo 2) e troque o segredo.

**Mudar os horários:** edite `.github/workflows/autopost.yml` (os horários lá estão em UTC: Brasília + 3 h).

## Usar com uma IA (Claude, Gemini, ChatGPT)

A pasta [`skill/`](skill/SKILL.md) tem as instruções para uma IA operar o robô por você: colocar artes na fila, testar e acompanhar. Mostre o arquivo `skill/SKILL.md` para a IA (no Claude Code, copie a pasta para `.claude/skills/instagram-autopost/`).

## Uso responsável

Use para o seu conteúdo, nas suas contas. Não use para spam, seguir em massa ou mandar mensagem para quem não pediu: isso viola os termos da Meta e a LGPD.

## Licença

MIT
