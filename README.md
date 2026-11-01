# por aí ✳

Um atlas pessoal para registrar países visitados e organizar os próximos destinos. Interface responsiva, com mapa-múndi interativo, exploração por região, busca, listas por prioridade, notas, ano da viagem e resumo da jornada.

## Rodar localmente

```sh
python3 -m http.server 8000
```

Acesse `http://localhost:8000`. É um site estático, sem conta ou servidor de dados. As marcações são salvas no `localStorage` deste navegador; use **Exportar** para levar um backup JSON a outro dispositivo e **Importar** para restaurá-lo. Limpar os dados do navegador apaga as marcações que não foram exportadas.

O catálogo contém 195 países: membros das Nações Unidas e Estados independentes/observadores incluídos no pacote [`world-countries`](https://www.npmjs.com/package/world-countries) v5.1.0. Os dados foram reduzidos a nome em português, código, região, sub-região, bandeira e capital. Não inclui territórios dependentes.

O mapa foi gerado a partir do [`world-atlas`](https://github.com/topojson/world-atlas) (escala 1:50m) com projeção Natural Earth. Para regenerar `world-map.json`, rode `npm ci && npm run generate:map`. Países minúsculos ausentes na geometria são marcados por um ponto.

Imagem de capa hospedada no Unsplash; o visual tem fallback em cor sólida caso não carregue. Fontes hospedadas no Google Fonts, com fallback local.
