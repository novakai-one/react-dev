import { build } from 'esbuild'
const out = await build({
  entryPoints: ['src/layout/collisionManager.ts','src/layout/layoutManager.ts','src/layout/grid.ts'],
  bundle: true, format: 'esm', write: false, outdir: '/tmp/cmbundle',
})
import { writeFileSync } from 'fs'
for (const f of out.outputFiles) writeFileSync(f.path, f.text)
const { resolveCollisions } = await import('/tmp/cmbundle/collisionManager.js')
const { collapseAfterDelete } = await import('/tmp/cmbundle/layoutManager.js')

const li = (id,y,h) => ({ blockId:id, fileId:'f', x:56, y, w:400, h })
let pass=0, fail=0
const eq=(name,got,want)=>{ const g=JSON.stringify(got),w=JSON.stringify(want); if(g===w){pass++;console.log('PASS',name)} else {fail++;console.log('FAIL',name,'\n got',g,'\n want',w)} }

// 1. No overlap → unchanged
let items=[li('a',0,26),li('b',52,26)]
eq('no-overlap', resolveCollisions(items,'a').map(i=>i.y), [0,52])

// 2. Drop A onto B (A higher) → B pushed down by overlap, A stays
// A at y=0 h=52 (2 rows), B at y=26 h=26 → overlap: A.bottom=52, B.top=26 → push 26
items=[li('a',0,52),li('b',26,26)]
eq('push-down-overlap', resolveCollisions(items,'a').map(i=>({id:i.blockId,y:i.y})),
  [{id:'a',y:0},{id:'b',y:52}])

// 3. Moved is lower → moved gets pushed, pinned stays
// B at y=0 h=52, A(moved) at y=26 h=26 → A pushed to 52
items=[li('a',26,26),li('b',0,52)]
eq('moved-lower-pushed', resolveCollisions(items,'a').map(i=>({id:i.blockId,y:i.y})),
  [{id:'a',y:52},{id:'b',y:0}])

// 4. Cascade: A onto B, C already just below B → all slide, gaps preserved
// A y0 h52, B y26 h26, C y78 h26 (gap of 26 below B). push B by 26 → B 52. C y>=pin(0) → C+26=104. gap preserved (B bottom 78, C 104 → gap 26)
items=[li('a',0,52),li('b',26,26),li('c',78,26)]
eq('cascade-gap-preserved', resolveCollisions(items,'a').map(i=>({id:i.blockId,y:i.y})),
  [{id:'a',y:0},{id:'b',y:52},{id:'c',y:104}])

// 5. Blocks ABOVE collision untouched
// X y0 h26 (above), A y52 h52 moved, B y78 h26 → A pins(52<78), B push to 104? A.bottom=104,B.top=78→push26→104. X stays 0
items=[li('x',0,26),li('a',52,52),li('b',78,26)]
eq('above-untouched', resolveCollisions(items,'a').map(i=>({id:i.blockId,y:i.y})),
  [{id:'x',y:0},{id:'a',y:52},{id:'b',y:104}])

// collapse: delete block at y=26 h=26, gap 6 → shift below up by 32, snapped
// remaining: top y0, below y58 → 58-32=26 → snap26
let rem=[li('t',0,26),li('d',58,26)]
eq('collapse-pull-up', collapseAfterDelete(rem,26,26,6).map(i=>({id:i.blockId,y:i.y})),
  [{id:'t',y:0},{id:'d',y:26}])

// collapse: blocks above deleted untouched
rem=[li('a',0,26),li('b',104,26)]
eq('collapse-above-untouched', collapseAfterDelete(rem,52,26,6).map(i=>i.y),[0, 78])

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
