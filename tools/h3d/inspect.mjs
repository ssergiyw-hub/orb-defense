import fs from 'fs';
const b = fs.readFileSync(process.argv[2]); const len = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + len).toString());
console.log('anims', (j.animations || []).map(a => a.name + ':' + a.channels.length), 'skins', (j.skins || []).length, 'nodes', j.nodes.length, 'meshes', j.meshes.length, 'images', (j.images||[]).length);
console.log((j.nodes||[]).map(n=>n.name).filter(Boolean).slice(0,80).join(' '));
