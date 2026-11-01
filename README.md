# por aí ✳

Um atlas pessoal para registrar países visitados e organizar os próximos destinos. Interface responsiva, com mapa-múndi interativo, exploração por região, busca, listas por prioridade, notas, ano da viagem e resumo da jornada.

## Rodar localmente

```sh
npm ci
npm run check
python3 -m http.server 8000
```

Acesse `http://localhost:8000`. O site é estático no GitHub Pages e usa Firebase Authentication (Google) e Cloud Firestore para sincronizar por conta. O botão **Entrar com Google** migra as marcações que já estavam neste navegador sem sobrescrever os países existentes na conta; um backup local da migração é mantido. Depois de entrar com a mesma conta em outro aparelho, os países aparecem lá também. Sem login, as marcações ficam somente neste navegador. **Exportar** e **Importar** continuam disponíveis; a importação substitui as marcações da conta quando você estiver conectado.

O build `npm run build` gera `cloud-bundle.js` para o GitHub Pages. As regras do Firestore permitem leitura e escrita apenas em `/users/{uid}/countries/{code}` para o usuário autenticado com o mesmo UID. O domínio `devrafaelantunes.github.io` precisa estar autorizado no Firebase Authentication.

O catálogo contém 195 países: membros das Nações Unidas e Estados independentes/observadores incluídos no pacote [`world-countries`](https://www.npmjs.com/package/world-countries) v5.1.0. Os dados foram reduzidos a nome em português, código, região, sub-região, bandeira e capital. Não inclui territórios dependentes.

O mapa foi gerado a partir do [`world-atlas`](https://github.com/topojson/world-atlas) (escala 1:50m) com projeção Natural Earth. Para regenerar `world-map.json`, rode `npm ci && npm run generate:map`. Países minúsculos ausentes na geometria são marcados por um ponto.

Imagem de capa hospedada no Unsplash; o visual tem fallback em cor sólida caso não carregue. Fontes hospedadas no Google Fonts, com fallback local.
