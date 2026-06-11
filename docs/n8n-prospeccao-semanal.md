# Workflow n8n - Prospeccao Semanal WhatsApp Bruno

Este guia cobre o workflow versionado em [`workflows/backe-prospeccao-semanal.json`](../workflows/backe-prospeccao-semanal.json).

O objetivo do fluxo e executar uma prospeccao semanal automatica, buscando 5 negocios locais em Brasilia/DF via SerpAPI (Google Maps) e enviando a lista formatada para o WhatsApp do Bruno.

## Ordem do workflow

```text
Schedule - Toda Segunda 9h (BRT)
-> Code - Config Prospeccao
-> HTTP - SerpAPI Google Maps
-> Code - Filtrar e Formar Prospects
-> Code - Montar Mensagem Bruno
-> HTTP - Enviar Lista para Bruno
-> Code - Relatorio Final
```

## Nodes

| # | Node | Tipo | Funcao |
|---|------|------|--------|
| 1 | Schedule - Toda Segunda 9h | Schedule Trigger | Dispara toda segunda-feira as 09:00 BRT |
| 2 | Code - Config Prospeccao | Code | Define parametros de busca, telefone do Bruno, data da semana |
| 3 | HTTP - SerpAPI Google Maps | HTTP Request | Busca negocios locais via SerpAPI (Google Maps) |
| 4 | Code - Filtrar e Formar Prospects | Code | Filtra resultados (telefone valido), formata em 5 prospects |
| 5 | Code - Montar Mensagem Bruno | Code | Monta mensagem formatada com lista de prospects |
| 6 | HTTP - Enviar Lista para Bruno | HTTP Request | Envia mensagem via Evolution API |
| 7 | Code - Relatorio Final | Code | Gera relatorio de execucao |

## Variaveis de ambiente

Configure estas variaveis no ambiente do n8n:

| Variavel | Descricao | Exemplo |
| --- | --- | --- |
| `SERPAPI_API_KEY` | Chave API do SerpAPI | (secreto) |
| `EVOLUTION_API_URL` | URL base da Evolution API | `https://groundedlungfish-evolution.cloudfy.live` |
| `EVOLUTION_INSTANCE` | Nome da instancia WhatsApp | `backe-bruno` |
| `EVOLUTION_API_KEY` | Chave API da Evolution | (secreto) |
| `PROSPECTING_DRY_RUN` | Modo teste sem enviar mensagens | `true` ou `false` |

## Parametros de busca

- **Localizacao**: Brasilia, DF, Brasil (lat: -15.7939, lng: -47.8828)
- **Raio**: 15km
- **Tipos alvo** (um por execucao, rotacionado aleatoriamente):
  - `beauty_salon` -> Salao de Beleza
  - `hair_care` -> Cabeleireiro
  - `barber` -> Barbearia
  - `spa` -> Spa
  - `tattoo_parlor` -> Estudio de Tatuagem
- **Resultados por semana**: 5

## Rotacao de tipos

A cada execucao, o workflow seleciona aleatoriamente um dos tipos de negocio para buscar. Isso garante variedade nos prospects ao longo das semanas. Para uma rotacao mais controlada, use `staticData` do n8n para armazenar o ultimo tipo usado.

## Filtros aplicados

- Apenas negocios com telefone valido (10+ digitos)
- Deduplicacao por nome + telefone na mesma execucao
- Normalizacao do telefone: adiciona prefixo `55` se ausente

## Formatacao da mensagem

```
*Prospeccao semanal backe.co*
Semana de {dd/mm/aaaa}

5 possiveis clientes p/ automacao WhatsApp:

1. *{Nome}*
   Endereco: {Endereco}
   Telefone: {Telefone}
   Tipo: {Tipo}
   Avaliacao: {Rating} ({Reviews} reviews)

...

_Gerado automaticamente pelo workflow n8n_
```

## Destinatario

- **Telefone Bruno**: 5561991963278
- **Instancia**: backe-bruno
- **Endpoint**: `POST {EVOLUTION_API_URL}/message/sendText/{EVOLUTION_INSTANCE}`

## Como importar o workflow

1. No n8n, abra `Workflows`.
2. Use a opcao de importar workflow por arquivo.
3. Selecione `workflows/backe-prospeccao-semanal.json`.
4. Configure as variaveis de ambiente listadas acima.
5. Execute manualmente para testar antes de ativar o agendamento.

## Como testar

### Modo dry run

Defina `PROSPECTING_DRY_RUN=true` no ambiente do n8n. O workflow vai:
- Buscar prospects normalmente via SerpAPI
- Montar a mensagem formatada
- **Nao enviar** mensagem real (o node HTTP pode ser desativado manualmente para teste)
- Gerar relatorio final

### Teste manual

1. Abra o workflow no n8n.
2. Clique em `Execute Workflow`.
3. Verifique:
   - SerpAPI retornou resultados
   - Pelo menos 1 prospect com telefone valido foi encontrado
   - Mensagem formatada corretamente
   - Bruno recebeu a mensagem (se nao estiver em dry run)

### Confirmar execucao

No n8n, abra a aba `Executions` e verifique:
- Status: `Success`
- Todos os nodes executaram sem erro
- O node `HTTP - Enviar Lista para Bruno` retornou status 200

## Checklist de aceite

- [ ] Workflow importa sem erros no n8n
- [ ] Variaveis de ambiente configuradas (SERPAPI_API_KEY, EVOLUTION_*)
- [ ] Teste manual passa com resultados reais do SerpAPI
- [ ] Mensagem formatada corretamente com nome, endereco, telefone e tipo
- [ ] Bruno recebe a mensagem no WhatsApp
- [ ] Agendamento ativo (toda segunda 9h BRT)
- [ ] Nenhum dado sensivel versionado no JSON
