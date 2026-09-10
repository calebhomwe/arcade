import io

p = 'survivor-wave.html'
s = io.open(p, encoding='utf-8', newline='').read()

# 1) difficulty multipliers hook — right next to the peril line (same pattern)
old = "  perilRun=perilOn&&!dailyActive;\n"
assert s.count(old) == 1
new = ("  perilRun=perilOn&&!dailyActive;\n"
       "\n"
       "  /*KSC-DIFF: kingdom difficulty select (casual/normal/nightmare)*/\n"
       "  if(!dailyActive&&typeof KSC_DIFF!=='undefined'&&KSC_DIFF){\n"
       "    if(KSC_DIFF.hp)player.chHP*=KSC_DIFF.hp;\n"
       "    if(KSC_DIFF.spd&&!player.chSpd)player.chSpd=KSC_DIFF.spd;\n"
       "    if(KSC_DIFF.spawn&&player.chSpawn)player.chSpawn*=KSC_DIFF.spawn;\n"
       "    if(KSC_DIFF.gold)player.goldMul*=KSC_DIFF.gold;\n"
       "  }\n")
s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('diff hook inserted')
