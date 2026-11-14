# правка 121: collects every piece of Russian text the game can show, as translation keys.
# Template variables ${...} and numbers become {} ; HTML tags split the text into separate pieces;
# leading/trailing icons and punctuation are not part of a key (the runtime does the same: src/client/i18n.ts).
import re, glob, json, sys
CYR = re.compile('[А-Яа-яЁёІіЇїЄє]')
LET = 'A-Za-zА-Яа-яЁёІіЇїЄєÀ-ÿ'
CORE = re.compile(r'^([^' + LET + r'{}\d\x00]*)(.*?)([^' + LET + r'{}\d\x00]*)$', re.S)
NUM = re.compile(r'\d+(?:[.,]\d+)?')

def strip_templates(t):
    # replace ${ ... } (with nesting) by {}
    out, i = [], 0
    while i < len(t):
        if t.startswith('${', i):
            depth, j = 1, i + 2
            while j < len(t) and depth:
                if t[j] == '{': depth += 1
                elif t[j] == '}': depth -= 1
                elif t[j] == '`':  # nested template: skip it
                    k = j + 1
                    while k < len(t) and t[k] != '`': k += 1
                    j = k
                j += 1
            out.append('\x00'); i = j
        else:
            out.append(t[i]); i += 1
    return ''.join(out)

def norm(seg):
    seg = seg.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
    seg = re.sub(r'\s+', ' ', seg).strip()
    m = CORE.match(seg)
    core = m.group(2) if m else seg
    core = NUM.sub('{}', core.replace('\x00', '{}'))
    core = re.sub(r'(\{\})+', '{}', core) if False else core
    return core.strip()

def pieces(text):
    text = strip_templates(text)
    # split on tags and on attribute boundaries
    for seg in re.split(r'<[^>]*>', text):
        # attribute-like fragments (class="..") inside code are not text; keep only segments with Cyrillic
        for part in re.split(r'[\n]', seg):
            if CYR.search(part):
                k = norm(part)
                if not CYR.search(k): continue
                if re.search(r"['\"]|\)\}", k):  # code leaked in: keep only the quoted texts
                    for q in re.split(r"['\"]|\)\}", k):
                        q = norm(q)
                        if CYR.search(q) and not re.search(r'[?:]\s*$', q): yield q
                else: yield k

def literals(src):
    i, n = 0, len(src)
    while i < n:
        ch = src[i]
        if src.startswith('//', i):
            j = src.find('\n', i); i = n if j < 0 else j; continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2); i = n if j < 0 else j + 2; continue
        if ch in '\'"`':
            j, q = i + 1, ch
            depth = 0
            while j < n:
                if src[j] == '\\': j += 2; continue
                if q == '`' and src.startswith('${', j):
                    # skip the expression, it may contain nested templates
                    d, k = 1, j + 2
                    while k < n and d:
                        if src[k] == '{': d += 1
                        elif src[k] == '}': d -= 1
                        elif src[k] == '`':
                            # nested template literal
                            m2 = k + 1
                            while m2 < n and src[m2] != '`':
                                if src[m2] == '\\': m2 += 1
                                m2 += 1
                            k = m2
                        k += 1
                    j = k; continue
                if src[j] == q: break
                if q != '`' and src[j] == '\n': break
                j += 1
            yield src[i + 1:j]
            i = j + 1; continue
        i += 1

keys = {}
files = [f for f in glob.glob('src/**/*.ts', recursive=True) if 'Images.ts' not in f and '/i18n' not in f]
for f in files:
    s = open(f, encoding='utf8').read()
    for lit in literals(s):
        if not CYR.search(lit): continue
        for k in pieces(lit):
            keys.setdefault(k, f)
# nested template literals inside ${}: scan them too (literals() skips them) — rerun on expression bodies
for f in files:
    s = open(f, encoding='utf8').read()
    for m in re.finditer(r'`([^`]*)`', s):
        t = m.group(1)
        if CYR.search(t):
            for k in pieces(t): keys.setdefault(k, f)
# quoted strings anywhere, also inside ${...} expressions of templates
for f in files:
    s = open(f, encoding='utf8').read()
    for m in re.finditer(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"", s):
        t = m.group(1) if m.group(1) is not None else m.group(2)
        if CYR.search(t):
            for k in pieces(t): keys.setdefault(k, f)
html = open('src/client/index.html', encoding='utf8').read()
body = html[html.index('<body'):]
body = re.sub(r'<script>.*?</script>', '', body, flags=re.S)
for k in pieces(body): keys.setdefault(k, 'index.html')
for m in re.finditer(r'content:\s*"([^"]*[А-Яа-я][^"]*)"', html): keys.setdefault(norm(m.group(1)), 'index.html css')
# drop code-ish keys
bad = re.compile(r'[;=]|\b(const|return|function|class)\b|=>')
out = {k: v for k, v in keys.items() if not bad.search(k) and len(k) < 600}
extra = json.load(open('tools/i18n/extra.json', encoding='utf8')) if __import__('os').path.exists('tools/i18n/extra.json') else []
for k in extra: out.setdefault(k, 'crawl')
json.dump(sorted(out), open(sys.argv[1] if len(sys.argv) > 1 else '/tmp/i18n_keys.json', 'w'), ensure_ascii=False, indent=0)
print(len(out), 'keys', sum(len(k) for k in out), 'chars')
