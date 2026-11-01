# por aí ✳

Um atlas pessoal para registrar países visitados e organizar os próximos destinos. Interface responsiva, com mapa-múndi interativo, exploração por região, busca, listas por prioridade, notas, ano da viagem e resumo da jornada.

## Rodar localmente

```sh
npm ci
npm run check
python3 -m http.server 8000
```

Acesse `http://localhost:8000`. O site é estático no GitHub Pages. O Firebase cria uma identidade anônima automaticamente (sem tela de login) e salva cada país no Firestore. Para sincronizar outro aparelho, abra o painel ↥ no primeiro, copie o código do atlas, cole-o no segundo e confira o código de confirmação exibido nos dois antes de autorizar no primeiro. Depois disso, as mudanças aparecem nos aparelhos vinculados. O código do atlas sozinho não dá acesso: um aparelho já vinculado precisa aprovar o pedido. Não autorize pedidos inesperados. Mantenha o navegador original ou outro aparelho vinculado para aprovar novos aparelhos; limpar os dados de todos os aparelhos vinculados sem backup pode deixar o atlas inacessível. **Exportar** e **Importar** continuam disponíveis para backup; a importação substitui as marcações de todos os aparelhos vinculados. Se o Firebase estiver indisponível, não presuma que uma edição local sincronizou.

O catálogo contém 195 países: membros das Nações Unidas e Estados independentes/observadores incluídos no pacote [`world-countries`](https://www.npmjs.com/package/world-countries) v5.1.0. Os dados foram reduzidos a nome em português, código, região, sub-região, bandeira e capital. Não inclui territórios dependentes.

O mapa foi gerado a partir do [`world-atlas`](https://github.com/topojson/world-atlas) (escala 1:50m) com projeção Natural Earth. Para regenerar `world-map.json`, rode `npm ci && npm run generate:map`. Países minúsculos ausentes na geometria são marcados por um ponto.

Imagem de capa hospedada no Unsplash; o visual tem fallback em cor sólida caso não carregue. Fontes hospedadas no Google Fonts, com fallback local.
