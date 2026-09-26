/* Royal Sky Campaign - route coordinates are authoritative gameplay geometry. */
(function(){
  const host=typeof window!=="undefined"?window:globalThis;
  const parseRoutes=s=>s.split("|").map(route=>route.trim().split(/\s+/).map(point=>point.split(",").map(Number)));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  const chapters=["Foundations","Crosswinds","Forked Roads","Royal Trials","Skyfront","Crownfall"];
  const plates={
    "Castle Courtyard":"assets/generated/runpod-2026-07-28/raw/map-castle-courtyard-v2_00001_.webp",
    "Enchanted Forest":"assets/generated/runpod-2026-07-28/raw/map-enchanted-forest-v2_00001_.webp",
    "Storm Coast":"assets/generated/runpod-2026-07-28/raw/map-storm-coast-v2_00001_.webp",
    "Frozen Tundra":"assets/generated/runpod-2026-07-28/raw/map-frozen-tundra-v2_00001_.webp",
    "Sky Kingdom":"assets/generated/runpod-2026-07-28/raw/map-sky-kingdom-v2_00001_.webp",
    "Volcanic Wasteland":"assets/generated/runpod-2026-07-28/raw/map-volcanic-wasteland-v2_00001_.webp"
  };
  const padThemes={
    "Castle Courtyard":{rim:"#d7b36a",core:"#f5ebcd",glow:"rgba(255,232,173,.34)"},
    "Enchanted Forest":{rim:"#b6a16a",core:"#eef4d4",glow:"rgba(205,255,180,.30)"},
    "Storm Coast":{rim:"#c9b37d",core:"#eef0de",glow:"rgba(153,221,255,.28)"},
    "Frozen Tundra":{rim:"#b0c7d8",core:"#edf8ff",glow:"rgba(173,234,255,.30)"},
    "Sky Kingdom":{rim:"#d6c67f",core:"#faf4df",glow:"rgba(196,228,255,.32)"}
  };
  function seeded(seed){
    let state=(seed>>>0)||1;
    return ()=>((state=(state*1664525+1013904223)>>>0)/4294967296);
  }
  function pointSegmentDistance(px,py,ax,ay,bx,by){
    const vx=bx-ax,vy=by-ay;
    const len=vx*vx+vy*vy;
    const t=len?clamp(((px-ax)*vx+(py-ay)*vy)/len,0,1):0;
    const dx=px-(ax+vx*t),dy=py-(ay+vy*t);
    return Math.hypot(dx,dy);
  }
  function routeDistance(px,py,routes){
    let best=Infinity;
    for(const route of routes){
      for(let i=0;i<route.length-1;i++){
        best=Math.min(best,pointSegmentDistance(px,py,route[i][0],route[i][1],route[i+1][0],route[i+1][1]));
      }
    }
    return best;
  }
  function generatePads(parsed,index){
    const rand=seeded((index+1)*7919);
    const pads=[];
    const padTarget=clamp(6+Math.floor(index/4)+(parsed.length-1),6,12);
    for(let attempt=0;attempt<240&&pads.length<padTarget;attempt++){
      const column=(attempt%6)+1;
      const row=Math.floor(attempt/6)%4;
      const x=clamp(column/7+(rand()-.5)*0.11,0.11,0.89);
      const y=clamp(0.19+row*0.18+(rand()-.5)*0.12,0.12,0.88);
      if(routeDistance(x,y,parsed)<0.105)continue;
      if(pads.some(p=>Math.hypot(p[0]-x,p[1]-y)<0.13))continue;
      pads.push([+x.toFixed(3),+y.toFixed(3)]);
    }
    return pads;
  }
  const campaign=[
    ["Cloverfield Lane","Castle Courtyard",1,"A welcoming single curve. Learn the kingdom's basics.","0,.67 .16,.67 .31,.61 .46,.52 .62,.45 .81,.40 1.03,.40"],
    ["Royal Garden Walk","Castle Courtyard",1,"Gentle garden turns reward clean early placements.","0,.75 .16,.68 .28,.55 .42,.44 .58,.47 .72,.39 .88,.30 1.03,.30"],
    ["Apple Orchard Bend","Enchanted Forest",1,"A relaxed S-curve through sunlit orchards.","0,.24 .15,.29 .29,.40 .41,.51 .54,.57 .67,.50 .80,.38 1.03,.35"],
    ["Waterwheel Way","Storm Coast",1,"Riverside bends introduce overlapping tower coverage.","0,.82 .14,.74 .27,.63 .40,.50 .53,.43 .66,.47 .79,.38 .91,.27 1.03,.25"],
    ["Meadow Ribbon","Castle Courtyard",1,"A long open lane with generous build ground.","0,.49 .16,.46 .31,.43 .46,.38 .60,.43 .75,.50 .89,.45 1.03,.42"],
    ["Pine Pass","Enchanted Forest",2,"The first tight turns make crossfire matter.","0,.84 .13,.74 .23,.62 .17,.50 .31,.40 .45,.45 .54,.32 .68,.27 .80,.35 .91,.24 1.03,.23"],
    ["Sunstone Terrace","Castle Courtyard",2,"A bright hill circuit with a compact central bend.","0,.87 .12,.77 .26,.68 .39,.59 .49,.48 .40,.37 .51,.26 .66,.27 .78,.38 .71,.53 .84,.61 1.03,.51"],
    ["Windmill Valley","Enchanted Forest",2,"Wide fields give support towers room to breathe.","0,.18 .12,.24 .26,.33 .39,.45 .51,.54 .64,.63 .76,.56 .87,.43 1.03,.40"],
    ["Cloudstep Causeway","Sky Kingdom",2,"A high bridge route with a graceful doubleback.","0,.71 .13,.63 .26,.53 .38,.42 .50,.35 .62,.40 .72,.49 .64,.59 .73,.68 .87,.59 1.03,.56"],
    ["Coral Coast Run","Storm Coast",2,"Beachside curves create a first coverage loop.","0,.51 .12,.43 .25,.32 .39,.26 .52,.32 .61,.45 .69,.57 .80,.65 .90,.57 1.03,.52"],
    ["Riverbend Circuit","Castle Courtyard",2,"A smooth river circuit rewards layered defenses.","0,.83 .13,.77 .28,.69 .41,.60 .52,.51 .61,.40 .51,.30 .40,.36 .43,.48 .55,.57 .70,.61 .84,.54 1.03,.48"],
    ["Lilypond Loop","Enchanted Forest",2,"A looping garden lane tests your central platform.","0,.33 .14,.38 .28,.47 .40,.57 .52,.62 .65,.57 .73,.46 .66,.35 .54,.28 .43,.33 .49,.43 .62,.48 .77,.40 1.03,.37"],
    ["Golden Orchard","Castle Courtyard",2,"Golden paths snake between royal fruit groves.","0,.76 .13,.68 .27,.56 .40,.47 .51,.42 .63,.48 .74,.57 .83,.50 .76,.39 .88,.29 1.03,.28"],
    ["Harbour Hairpin","Storm Coast",2,"A sharp quay hairpin gives cannons a key moment.","0,.20 .14,.27 .27,.38 .39,.49 .52,.56 .64,.52 .73,.42 .65,.32 .53,.26 .46,.34 .58,.43 .74,.40 .88,.31 1.03,.29"],
    ["Canyon Bow","Castle Courtyard",2,"An exposed canyon bow rewards smart range overlap.","0,.88 .13,.79 .26,.69 .39,.59 .51,.49 .63,.40 .75,.34 .86,.41 .79,.52 .67,.59 .78,.67 .90,.60 1.03,.56"],
    ["Glacier Gate","Frozen Tundra",3,"The first split lanes converge before the frozen gate.","0,.18 .14,.27 .29,.35 .43,.47 .56,.57 .69,.65 .82,.68 1.03,.72|0,.83 .14,.76 .28,.68 .41,.58 .56,.57 .69,.65 .82,.68 1.03,.72"],
    ["Skybridge Split","Sky Kingdom",3,"Twin aerial lanes meet at one shining portal.","0,.88 .15,.79 .30,.72 .43,.61 .37,.49 .50,.39 .64,.45 .77,.34 .90,.24 1.03,.22|0,.18 .14,.26 .27,.34 .37,.49 .50,.39 .64,.45 .77,.34 .90,.24 1.03,.22"],
    ["Garden Gate Split","Castle Courtyard",3,"Two royal walks converge under the garden arch.","0,.24 .14,.31 .27,.40 .39,.51 .50,.58 .62,.53 .75,.42 .88,.35 1.03,.34|0,.78 .13,.70 .27,.62 .40,.61 .50,.58 .62,.53 .75,.42 .88,.35 1.03,.34"],
    ["Tidal Fork","Storm Coast",3,"Two tide paths share one final harbour defense.","0,.14 .15,.22 .29,.30 .43,.42 .56,.51 .67,.57 .79,.53 .91,.45 1.03,.43|0,.83 .14,.76 .29,.68 .43,.61 .56,.51 .67,.57 .79,.53 .91,.45 1.03,.43"],
    ["Highland Doubleback","Castle Courtyard",3,"A long mountain doubleback stretches every defense.","0,.86 .12,.78 .25,.68 .37,.58 .49,.49 .60,.39 .71,.31 .84,.37 .75,.49 .64,.58 .52,.65 .62,.57 .74,.54 .88,.46 1.03,.43"],
    ["Orchard Convergence","Enchanted Forest",3,"Three orchard roads merge into one royal lane.","0,.19 .14,.27 .27,.36 .40,.47 .53,.56 .67,.59 .80,.51 1.03,.48|0,.51 .14,.50 .28,.51 .40,.53 .53,.56 .67,.59 .80,.51 1.03,.48|0,.83 .14,.74 .29,.66 .42,.60 .53,.56 .67,.59 .80,.51 1.03,.48"],
    ["Frostfall Fork","Frozen Tundra",3,"Cold twin lanes curve around the waterfall island.","0,.16 .14,.25 .27,.35 .39,.47 .49,.59 .61,.68 .74,.72 .87,.64 1.03,.60|0,.81 .13,.74 .27,.68 .39,.62 .49,.59 .61,.68 .74,.72 .87,.64 1.03,.60"],
    ["Golden Causeway","Sky Kingdom",3,"An airy marathon course over a sea of clouds.","0,.49 .11,.42 .23,.32 .36,.25 .49,.31 .58,.43 .66,.55 .75,.66 .86,.72 .79,.84 .65,.85 .71,.75 .63,.65 .53,.56 .65,.45 .77,.39 .90,.30 1.03,.28"],
    ["Aether Spiral","Sky Kingdom",3,"A spiral route circles the central aether platform.","0,.88 .13,.78 .27,.68 .40,.57 .52,.47 .64,.39 .76,.34 .86,.42 .78,.53 .66,.61 .54,.57 .48,.48 .56,.39 .66,.43 .70,.53 .62,.66 .74,.71 .88,.62 1.03,.58"],
    ["Citadel Crosswind","Castle Courtyard",3,"Three approach roads stress a wide citadel defense.","0,.15 .14,.24 .28,.34 .42,.46 .56,.54 .68,.50 .80,.41 1.03,.39|0,.50 .14,.50 .29,.51 .42,.51 .56,.54 .68,.50 .80,.41 1.03,.39|0,.84 .14,.76 .29,.67 .42,.58 .56,.54 .68,.50 .80,.41 1.03,.39"],
    ["Three Bridges","Sky Kingdom",3,"Three bridges form the campaign's first full junction.","0,.16 .14,.26 .27,.35 .40,.45 .53,.52 .65,.55 .76,.49 .89,.40 1.03,.38|0,.49 .14,.48 .28,.48 .40,.49 .53,.52 .65,.55 .76,.49 .89,.40 1.03,.38|0,.83 .14,.74 .28,.67 .40,.60 .53,.52 .65,.55 .76,.49 .89,.40 1.03,.38"],
    ["Cloud Citadel Twin","Sky Kingdom",3,"Twin sky lanes loop under the cloud citadel.","0,.86 .13,.76 .27,.65 .39,.55 .49,.44 .60,.34 .72,.27 .84,.33 .76,.44 .65,.54 .73,.65 .80,.55 .91,.47 1.03,.45|0,.17 .14,.25 .27,.34 .39,.44 .49,.44 .60,.34 .72,.27 .84,.33 .76,.44 .65,.54 .73,.65 .80,.55 .91,.47 1.03,.45"],
    ["Royal Marathon","Castle Courtyard",3,"A long royal procession with overlapping late turns.","0,.53 .11,.45 .23,.35 .36,.27 .49,.31 .60,.42 .69,.54 .78,.64 .89,.70 .82,.82 .70,.87 .60,.78 .52,.67 .43,.56 .53,.45 .66,.38 .78,.29 .90,.24 1.03,.22"],
    ["Sunrise Citadel","Castle Courtyard",3,"A final warm-up of three lanes before the Crownfall siege.","0,.17 .14,.26 .28,.36 .40,.47 .52,.55 .65,.58 .77,.50 .90,.41 1.03,.39|0,.50 .14,.50 .28,.51 .40,.52 .52,.55 .65,.58 .77,.50 .90,.41 1.03,.39|0,.83 .14,.75 .28,.67 .40,.60 .52,.55 .65,.58 .77,.50 .90,.41 1.03,.39"],
    ["Crownfall Gauntlet","Sky Kingdom",3,"The final four-lane defence across the Crownfall islands.","0,.14 .13,.22 .26,.31 .39,.42 .52,.50 .65,.54 .76,.49 .88,.40 1.03,.38|0,.39 .14,.41 .28,.43 .40,.46 .52,.50 .65,.54 .76,.49 .88,.40 1.03,.38|0,.64 .14,.61 .28,.57 .40,.54 .52,.50 .65,.54 .76,.49 .88,.40 1.03,.38|0,.87 .14,.79 .28,.70 .40,.61 .52,.50 .65,.54 .76,.49 .88,.40 1.03,.38"]
  ];
  host.KD_MAPS=campaign.map(([name,theme,stars,trait,routes],index)=>{
    const parsed=parseRoutes(routes);
    const mission=index+1;
    const laneCount=parsed.length;
    const chapter=Math.floor(index/5);
    return {
      name,
      theme,
      stars,
      mission,
      chapter,
      chapterLabel:chapters[chapter],
      laneCount,
      trait:`Campaign ${mission}/30 · ${trait}`,
      src:plates[theme]||`assets/generated/maps30/${slug(name)}.png`,
      fallback:`assets/generated/maps30/${slug(name)}.png`,
      path:parsed[0],
      pads:generatePads(parsed,index),
      padTheme:padThemes[theme]||padThemes["Castle Courtyard"],
      ...(laneCount>1?{paths:parsed}: {})
    };
  });
})();
