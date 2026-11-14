"""правка 178: the APK must be signed with tools/apk-key/debug.keystore — otherwise it will not install over the previous one.
Reads the certificate from the APK signing block (v2/v3) and compares its SHA-256 with the fixed key."""
import hashlib, struct, sys

EXPECTED = 'FB17B2714653E86CB300BD1B8C62B635C8C5805C0F1CF9376889DAB6BD512036'


def lp(b, o):
    n = struct.unpack('<I', b[o:o + 4])[0]
    return b[o + 4:o + 4 + n], o + 4 + n


d = open(sys.argv[1], 'rb').read()
e = d.rfind(b'PK\x05\x06')
cd = struct.unpack('<I', d[e + 16:e + 20])[0]
if d[cd - 16:cd] != b'APK Sig Block 42':
    sys.exit('no APK signing block')
size = struct.unpack('<Q', d[cd - 24:cd - 16])[0]
p, end, found = cd - size - 8 + 8, cd - 24, None
while p < end:
    ln = struct.unpack('<Q', d[p:p + 8])[0]
    pid = struct.unpack('<I', d[p + 8:p + 12])[0]
    val = d[p + 12:p + 8 + ln]
    p += 8 + ln
    if pid in (0x7109871a, 0xf05368c0):
        signers, _ = lp(val, 0); signer, _ = lp(signers, 0); sd, _ = lp(signer, 0)
        _, o = lp(sd, 0); certs, _ = lp(sd, o); cert, _ = lp(certs, 0)
        found = hashlib.sha256(cert).hexdigest().upper()
        break
print('APK signer SHA-256:', found)
if found != EXPECTED:
    sys.exit('APK is NOT signed with tools/apk-key/debug.keystore')
print('signed with the fixed debug key — installs over the previous build')
