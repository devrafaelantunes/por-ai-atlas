import fs from 'node:fs';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import c from 'world-countries';
const atlas = JSON.parse(fs.readFileSync('node_modules/world-atlas/countries-50m.json'));
const target = JSON.parse(fs.readFileSync('countries.json'));
const ids = new Map(c.map(x => [x.ccn3, x.cca2]));
const projection = geoNaturalEarth1().fitSize([960, 500], {type:'Sphere'});
const path = geoPath(projection);
const shapes = feature(atlas, atlas.objects.countries).features;
const paths = shapes.map(g => ({code:ids.get(g.id)||null, d:path(g)})).filter(x => x.code && target.some(t => t.code === x.code));
for (const country of target.filter(x => !paths.some(p => p.code === x.code))) {
  const source = c.find(x => x.cca2 === country.code);
  const xy = projection([source.latlng[1], source.latlng[0]]);
  paths.push({code:country.code, d:`M${xy[0]-3},${xy[1]}a3,3 0 1,0 6,0a3,3 0 1,0 -6,0`});
}
fs.writeFileSync('world-map.json', JSON.stringify(paths));
console.log('shapes',paths.length,'countries',new Set(paths.map(x=>x.code)).size,'missing',target.filter(x=>!paths.some(p=>p.code===x.code)).map(x=>x.code).join(','));
