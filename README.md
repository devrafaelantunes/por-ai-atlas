# por aí ✳

Um atlas pessoal para registrar países visitados e organizar os próximos destinos. Interface responsiva, com mapa-múndi interativo, exploração por região, busca, listas por prioridade, notas, ano da viagem e resumo da jornada.

## Rodar localmente

```sh
npm ci
npm run check
python3 -m http.server 8000
```

Acesse `http://localhost:8000`. O site é estático no GitHub Pages e não exige conta ou login. As marcações existentes continuam na mesma chave do armazenamento local deste navegador. Para passar a outro celular, use **Exportar meus dados** no aparelho antigo e **Importar arquivo** no novo. A importação substitui as marcações do aparelho de destino após confirmação; guarde o arquivo como backup. Não há sincronização automática entre aparelhos: o armazenamento é separado por navegador/dispositivo, e limpar os dados do navegador pode apagar marcações sem backup.

O catálogo contém 195 países: membros das Nações Unidas e Estados independentes/observadores incluídos no pacote [`world-countries`](https://www.npmjs.com/package/world-countries) v5.1.0. Os dados foram reduzidos a nome em português, código, região, sub-região, bandeira e capital. Não inclui territórios dependentes.

O mapa foi gerado a partir do [`world-atlas`](https://github.com/topojson/world-atlas) (escala 1:50m) com projeção Natural Earth. Para regenerar `world-map.json`, rode `npm ci && npm run generate:map`. Países minúsculos ausentes na geometria são marcados por um ponto.

Imagem de capa hospedada no Unsplash; o visual tem fallback em cor sólida caso não carregue. Fontes hospedadas no Google Fonts, com fallback local.
