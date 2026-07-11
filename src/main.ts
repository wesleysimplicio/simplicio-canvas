import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { buildArchitectureGraph, LAYERS, PIECES, type ArchitectureGraph, type ArchitectureNode } from './domain/architecture'
import { SIMPLICIO_LOOP_PATHS } from './example'
import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header><div class="brand"><span class="mark">S/</span><div><b>SIMPLICIO CANVAS</b><small>software assembly space · alpha 01</small></div></div>
  <div class="actions"><label class="folder">＋ ABRIR PROJETO<input id="folder" type="file" webkitdirectory multiple></label><button id="reset">EXEMPLO SIMPLICIO-LOOP</button></div></header>
  <main><aside><p class="eyebrow">CAMADAS</p><div id="legend"></div><p class="eyebrow gap">PEÇAS</p><div id="pieces"></div></aside>
  <section id="stage"><canvas></canvas><div class="stage-label"><span>ARQUITETURA / VISÃO EXPLODIDA</span><strong id="project-name">simplicio-loop · snapshot seguro</strong></div>
  <div class="hint">arraste para orbitar · scroll para zoom · clique numa peça</div></section>
  <aside class="inspector"><p class="eyebrow">INSPECTOR</p><div id="selection"><div class="empty-orbit">◌</div><h2>Selecione uma peça</h2><p>Veja o papel, caminho e encaixes do objeto.</p></div></aside></main>
  <footer><span id="stats"></span><span><i class="pulse"></i> FLUXOS ATIVOS</span><span>LOCAL-FIRST · NENHUM CÓDIGO ENVIADO</span></footer>`

const canvas = document.querySelector('canvas')!; const scene = new THREE.Scene(); scene.background = new THREE.Color('#07100f'); scene.fog = new THREE.FogExp2('#07100f', .018)
const camera = new THREE.PerspectiveCamera(42, 1, .1, 300); camera.position.set(18, 18, 29)
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.shadowMap.enabled = true
const controls = new OrbitControls(camera, canvas); controls.enableDamping = true; controls.target.set(10, 0, 1); controls.maxPolarAngle = Math.PI / 2.05
scene.add(new THREE.HemisphereLight('#d6fff5', '#06100d', 2.2)); const key = new THREE.DirectionalLight('#fff1d4', 4); key.position.set(8, 18, 10); key.castShadow = true; scene.add(key)
const grid = new THREE.GridHelper(60, 60, '#19352f', '#10241f'); scene.add(grid)
let group = new THREE.Group(); scene.add(group); const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); const meshNodes = new Map<THREE.Object3D, ArchitectureNode>()

function puzzleGeometry(kind: string) {
  const shape = new THREE.Shape(); const w = 3.6, h = 1.65, r = kind === 'entity' ? .48 : .34
  shape.moveTo(-w/2+r,-h/2); shape.lineTo(-.42,-h/2); shape.absarc(0,-h/2,.42,Math.PI,0,false); shape.lineTo(w/2-r,-h/2)
  shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r); shape.lineTo(w/2,-.38); shape.absarc(w/2,.0,.38,-Math.PI/2,Math.PI/2,false); shape.lineTo(w/2,h/2-r)
  shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2); shape.lineTo(-w/2+r,h/2); shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r); shape.lineTo(-w/2,.38)
  shape.absarc(-w/2,0,.38,Math.PI/2,-Math.PI/2,true); shape.lineTo(-w/2,-h/2+r); shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2)
  return new THREE.ExtrudeGeometry(shape,{depth:.34,bevelEnabled:true,bevelSize:.09,bevelThickness:.08,bevelSegments:3})
}
function labelTexture(node: ArchitectureNode) { const c=document.createElement('canvas'); c.width=512;c.height=210;const x=c.getContext('2d')!;x.fillStyle='#091411';x.fillRect(0,0,512,210);x.fillStyle=LAYERS[node.layer].color;x.font='700 21px monospace';x.fillText(node.layer.toUpperCase(),25,38);x.fillStyle='#effbf6';x.font='700 30px sans-serif';x.fillText(node.name.slice(0,24),25,92);x.fillStyle='#78978b';x.font='18px monospace';x.fillText(PIECES[node.kind].label+'  →  '+PIECES[node.kind].tab,25,142);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t }
function renderGraph(graph: ArchitectureGraph) {
  scene.remove(group); group = new THREE.Group(); scene.add(group); meshNodes.clear(); const byId=new Map<string,THREE.Vector3>()
  graph.nodes.forEach((node) => { const material=new THREE.MeshStandardMaterial({color:LAYERS[node.layer].color,roughness:.46,metalness:.12});const mesh=new THREE.Mesh(puzzleGeometry(node.kind),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(node.x,1,node.z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.baseY=1;group.add(mesh);meshNodes.set(mesh,node);byId.set(node.id,mesh.position.clone());const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:labelTexture(node),transparent:true}));sprite.scale.set(3.4,1.4,1);sprite.position.set(node.x,2.5,node.z);group.add(sprite) })
  graph.edges.forEach((edge)=>{const a=byId.get(edge.from),b=byId.get(edge.to);if(!a||!b)return;const curve=new THREE.CatmullRomCurve3([a.clone().add(new THREE.Vector3(0,.7,0)),a.clone().lerp(b,.5).add(new THREE.Vector3(0,2.4,0)),b.clone().add(new THREE.Vector3(0,.7,0))]);const tube=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.035,5,false),new THREE.MeshBasicMaterial({color:'#86ffce',transparent:true,opacity:.5}));group.add(tube) })
  document.querySelector('#stats')!.textContent=`${graph.nodes.length} OBJETOS · ${graph.edges.length} CONEXÕES · ${new Set(graph.nodes.map(n=>n.layer)).size} CAMADAS`
}
document.querySelector('#legend')!.innerHTML=Object.entries(LAYERS).map(([id,l])=>`<button data-layer="${id}"><i style="--c:${l.color}"></i><span>${l.label}<small>${l.role}</small></span></button>`).join('')
document.querySelector('#pieces')!.innerHTML=Object.entries(PIECES).slice(0,9).map(([id,p])=>`<span class="chip">${p.label}<small>${id==='screen'?'◖':id==='entity'?'◆':'⊕'}</small></span>`).join('')
function load(paths:string[],name:string){renderGraph(buildArchitectureGraph(paths));document.querySelector('#project-name')!.textContent=name}
load(SIMPLICIO_LOOP_PATHS,'simplicio-loop · snapshot seguro')
document.querySelector<HTMLInputElement>('#folder')!.onchange=(e)=>{const files=Array.from((e.target as HTMLInputElement).files??[]);if(files.length)load(files.map(f=>(f as File & {webkitRelativePath:string}).webkitRelativePath||f.name),files[0].webkitRelativePath.split('/')[0])}
document.querySelector('#reset')!.addEventListener('click',()=>load(SIMPLICIO_LOOP_PATHS,'simplicio-loop · snapshot seguro'))
canvas.addEventListener('click',(e)=>{const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects([...meshNodes.keys()])[0];if(!hit)return;const node=meshNodes.get(hit.object)!;document.querySelector('#selection')!.innerHTML=`<div class="piece-icon" style="--c:${LAYERS[node.layer].color}">⊕</div><p class="tag">${node.layer} / ${node.kind}</p><h2>${node.name}</h2><code>${node.path}</code><dl><dt>ENTRADA</dt><dd>${PIECES[node.kind].socket}</dd><dt>SAÍDA</dt><dd>${PIECES[node.kind].tab}</dd></dl>`})
function resize(){const el=document.querySelector('#stage')!;renderer.setSize(el.clientWidth,el.clientHeight,false);camera.aspect=el.clientWidth/el.clientHeight;camera.updateProjectionMatrix()}addEventListener('resize',resize);resize()
function animate(t:number){controls.update();meshNodes.forEach((n,m)=>m.position.y=(m.userData.baseY??1)+Math.sin(t*.001+n.x)*.045);renderer.render(scene,camera);requestAnimationFrame(animate)}requestAnimationFrame(animate)
