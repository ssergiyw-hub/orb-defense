# правка 159: Kenney (CC0) sounds → peak-normalised mono Ogg → base64 in src/client/sfxData.ts
import subprocess, base64, json, numpy as np
SRC = {'open': 'open_002.ogg', 'close': 'close_002.ogg', 'buy': 'handleCoins.ogg', 'reward': 'confirmation_004.ogg', 'pick': 'confirmation_001.ogg'}
out = {}
for k, f in SRC.items():
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'art/sfx/{f}', '-ac', '1', '-ar', '44100', '-f', 'f32le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32)
    gain = 0.89 / max(1e-6, float(np.abs(x).max()))  # peak −1 dB
    o = f'/tmp/sfx_{k}.ogg'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f'art/sfx/{f}', '-ac', '1', '-ar', '44100', '-af', f'silenceremove=start_periods=1:start_threshold=-50dB,volume={gain:.3f}', '-c:a', 'libvorbis', '-q:a', '4', o], check=True)
    out[k] = 'data:audio/ogg;base64,' + base64.b64encode(open(o, 'rb').read()).decode()
    print(k, f, f'gain {gain:.2f}', len(out[k]) // 1024, 'KB')
open('src/client/sfxData.ts', 'w').write('// правка 159: sounds from Kenney (CC0, art/sfx) — tools/art/pack_sfx.py\nexport const SFX_DATA: Record<string, string> = ' + json.dumps(out, indent=0) + ';\n')
