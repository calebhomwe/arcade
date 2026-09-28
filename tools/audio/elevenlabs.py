#!/usr/bin/env python3
"""ElevenLabs audio for the arcade's games: voices, sound effects and music.

The API key is read from $ELEVENLABS_API_KEY or from the file named by
$ELEVENLABS_KEY_FILE. It is never written to disk by this tool, never put in a
repo, and never printed.

    python3 tools/audio/elevenlabs.py quota
    python3 tools/audio/elevenlabs.py voices [--search warm]
    python3 tools/audio/elevenlabs.py tts   --voice <id> --text "Hi, I'm Claire!" --out Game/audio/vo/hi.mp3
    python3 tools/audio/elevenlabs.py sfx   --text "coin pickup, bright chime" --seconds 1 --out Game/audio/sfx/coin.mp3 [--loop]
    python3 tools/audio/elevenlabs.py music --prompt "cozy farm acoustic loop" --seconds 60 --out Game/audio/music/farm.mp3 [--instrumental]
    python3 tools/audio/elevenlabs.py batch plan.json     # many of the above, skipping files that already exist

Every file gets a sidecar <file>.json recording what made it (kind, prompt or text,
voice, model, date and the credits it used), so the game's LICENSES.md can list the
source. The account is on the Creator plan, which includes a commercial licence for
generated audio.
"""
import argparse, datetime, json, os, sys, urllib.error, urllib.request

API = 'https://api.elevenlabs.io'


def key():
    k = os.environ.get('ELEVENLABS_API_KEY', '').strip()
    if not k and os.environ.get('ELEVENLABS_KEY_FILE'):
        k = open(os.environ['ELEVENLABS_KEY_FILE']).read().strip()
    if not k:
        sys.exit('Set ELEVENLABS_API_KEY or ELEVENLABS_KEY_FILE.')
    return k


def call(method, path, body=None, accept='application/json'):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'xi-api-key': key(), 'Content-Type': 'application/json', 'Accept': accept})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            return r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors='replace')[:400]
        sys.exit(f'ElevenLabs {e.code} on {path}: {detail}')


def used():
    data, _ = call('GET', '/v1/user/subscription')
    d = json.loads(data)
    return d['character_count'], d['character_limit']


def save(out, audio, meta):
    os.makedirs(os.path.dirname(os.path.abspath(out)) or '.', exist_ok=True)
    open(out, 'wb').write(audio)
    meta = dict(meta, source='ElevenLabs', plan='Creator (commercial licence)', created=datetime.date.today().isoformat(), bytes=len(audio))
    open(out + '.json', 'w').write(json.dumps(meta, indent=1) + '\n')


def tts(voice, text, out, model='eleven_multilingual_v2', stability=0.45, similarity=0.8, style=0.35):
    body = {'text': text, 'model_id': model, 'voice_settings': {'stability': stability, 'similarity_boost': similarity, 'style': style, 'use_speaker_boost': True}}
    audio, _ = call('POST', f'/v1/text-to-speech/{voice}?output_format=mp3_44100_128', body, 'audio/mpeg')
    save(out, audio, {'kind': 'voice', 'voice_id': voice, 'model': model, 'text': text})


def sfx(text, out, seconds=None, loop=False, influence=0.5):
    body = {'text': text, 'prompt_influence': influence, 'model_id': 'eleven_text_to_sound_v2'}
    if seconds: body['duration_seconds'] = max(0.5, min(30.0, float(seconds)))
    if loop: body['loop'] = True
    audio, _ = call('POST', '/v1/sound-generation?output_format=mp3_44100_128', body, 'audio/mpeg')
    save(out, audio, {'kind': 'sfx', 'prompt': text, 'seconds': seconds, 'loop': loop})


def music(prompt, out, seconds=60, instrumental=True, model='music_v1'):
    body = {'prompt': prompt, 'music_length_ms': int(max(3, min(600, seconds)) * 1000), 'force_instrumental': bool(instrumental), 'model_id': model}
    audio, _ = call('POST', '/v1/music?output_format=mp3_44100_128', body, 'audio/mpeg')
    save(out, audio, {'kind': 'music', 'prompt': prompt, 'seconds': seconds, 'instrumental': instrumental, 'model': model})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('quota')
    v = sub.add_parser('voices'); v.add_argument('--search', default='')
    t = sub.add_parser('tts'); t.add_argument('--voice', required=True); t.add_argument('--text', required=True); t.add_argument('--out', required=True); t.add_argument('--model', default='eleven_multilingual_v2')
    s = sub.add_parser('sfx'); s.add_argument('--text', required=True); s.add_argument('--out', required=True); s.add_argument('--seconds', type=float); s.add_argument('--loop', action='store_true'); s.add_argument('--influence', type=float, default=0.5)
    m = sub.add_parser('music'); m.add_argument('--prompt', required=True); m.add_argument('--out', required=True); m.add_argument('--seconds', type=float, default=60); m.add_argument('--vocals', action='store_true', help='allow vocals (default: instrumental)')
    b = sub.add_parser('batch'); b.add_argument('plan', help='JSON list of {"kind":"tts|sfx|music", "out":..., ...}')
    a = ap.parse_args()
    if a.cmd == 'quota':
        u, lim = used(); print(f'{u} of {lim} credits used this month ({lim - u} left)'); return
    if a.cmd == 'voices':
        data, _ = call('GET', '/v2/voices?page_size=100' + (f'&search={urllib.request.quote(a.search)}' if a.search else ''))
        for vv in json.loads(data).get('voices', []):
            lab = vv.get('labels') or {}
            print(f"{vv['voice_id']}  {vv['name']:<22} {lab.get('gender', ''):<7} {lab.get('age', ''):<12} {lab.get('accent', ''):<12} {lab.get('description', lab.get('descriptive', ''))}")
        return
    # The account's credit count updates a little after each request, so credits are reported per run
    # (after a short wait), not per file. Measured 2026-09-28: a 1.5 s effect plus a 15 s music clip = 223.
    before, _ = used()
    jobs = json.load(open(a.plan)) if a.cmd == 'batch' else [dict(vars(a), kind=a.cmd)]
    made = 0
    for j in jobs:
        if a.cmd == 'batch' and os.path.exists(j['out']):
            print('skip (exists)', j['out']); continue
        if j['kind'] == 'tts': tts(j['voice'], j['text'], j['out'], j.get('model', 'eleven_multilingual_v2'))
        elif j['kind'] == 'sfx': sfx(j['text'], j['out'], j.get('seconds'), j.get('loop', False), j.get('influence', 0.5))
        elif j['kind'] == 'music': music(j['prompt'], j['out'], j.get('seconds', 60), not j.get('vocals', False))
        made += 1
        print(f"{j['kind']:<5} {j['out']}")
    if made:
        import time; time.sleep(20)
    after, lim = used()
    print(f'{made} file(s); about {after - before} credits; {lim - after} left this month')


if __name__ == '__main__':
    main()
