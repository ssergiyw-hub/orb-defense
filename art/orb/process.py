import numpy as np, json, os, shutil
from PIL import Image
from scipy import ndimage as nd
HERE=os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
U=HERE+'/src/'  # Серёгины исходники (id картинки из чата)
OUT=os.environ.get('ORB_OUT', os.path.join(HERE,'../../assets/orb/'))
for d in ['bg','wall','spirit','en','book','rune','ui']: os.makedirs(OUT+d,exist_ok=True)
meta={}
def save(img,path,q=88):
    img.save(OUT+path,'WEBP',quality=q,method=6)
def keycut(f,key,lo=60,hi=150):
    im=np.array(Image.open(U+f+'.png').convert('RGB')).astype(float)
    k=np.array(key,float)
    d=np.sqrt(((im-k)**2).sum(2))
    a=np.clip((d-lo)/(hi-lo),0,1)
    # despill: remove key tint on semi-transparent pixels
    fg=im.copy(); m=(a>0)&(a<1)
    fg[m]=(im[m]-(1-a[m,None])*k)/np.maximum(a[m,None],0.05)
    if key[1]<100: # magenta: limit r,b excess over g on edges
        sp=np.minimum(fg[...,0],fg[...,2])-fg[...,1]; mm=(a<0.98)&(sp>0); fg[mm,0]-=sp[mm]*0.7; fg[mm,2]-=sp[mm]*0.7
    else: # green key
        sp=fg[...,1]-np.maximum(fg[...,0],fg[...,2]); mm=(a<0.98)&(sp>0); fg[mm,1]-=sp[mm]*0.8
    fg=np.clip(fg,0,255)
    return np.dstack([fg,a*255]).astype(np.uint8)
def bbox(arr,th=20):
    ys,xs=np.where(arr[...,3]>th); return xs.min(),ys.min(),xs.max()+1,ys.max()+1
# --- biomes
BG={'water':'f8e48531','light':'b6e89a3e','fire':'836985c6','lightning':'fbc27b75','dark':'a2564f2c','poison':'58833f35','air':'4bb151b7','ice':'4f33ec8c','nature':'a2caeb88','earth':'2dce8598'}
for k,f in BG.items(): save(Image.open(U+f+'.png').convert('RGB'),f'bg/{k}.webp',86)
# --- walls
W={'start':'ec3e6780','heal1':'bfd788c1','heal2':'8b2a4ede','heal3':'fa28829f','counter1':'1edec63d','counter2':'00ca79c7','counter3':'6334e48c','shield1':'5c2d1559','shield2':'fd460b52','shield3':'bad140de','reinf1':'beb9927e','reinf2':'38c91af9','reinf3':'85648e4a'}
meta['wall']={}
for k,f in W.items():
    a=keycut(f,(255,0,255),50,140)
    op=(a[...,3]>200).mean(1)
    rows=np.where(op>0.9)[0]; last=rows.max()
    a=a[:last+1]
    top=int(np.where((a[...,3]>20).mean(1)>0.02)[0].min())
    solid=int(np.where((a[...,3]>200).mean(1)>0.97)[0].min())
    a=a[top:]; solid-=top
    img=Image.fromarray(a,'RGBA'); save(img,f'wall/{k}.webp',88)
    meta['wall'][k]={'w':img.width,'h':img.height,'solid':solid}
# --- spirits
SP={'healer':(['f558347a','d2ba839a','c32b23a6'],['750a591c','d6f55119','e4e20bea']),
    'fire':(['79dbe08c','ba903af6','7850d59e'],['c73585fa','1a243c36','9eb0eb7d']),
    'storm':(['4626693a','4f308542','0ce3ea3b'],['e5d03ba3','e8d63e5c','141af13b']),
    'frost':(['cc0f5914','c13a04a3','ff59eff6'],['22c11c9b','2442545a','3a66b281']),
    'curse':(['d84f36c6','4bdb8b84','f15e33bf'],['e1a6d8c1','75a22914','f31a96ba'])}
TILT={'750a591c':-18,'c73585fa':-8,'e8d63e5c':-8}
for sp,(fr,bk) in SP.items():
    key=(3,247,2) if sp=='curse' else (250,2,250)
    for side,lst in (('f',fr),('b',bk)):
        for i,f in enumerate(lst):
            a=keycut(f,key,55,140)
            img=Image.fromarray(a,'RGBA')
            if f in TILT: img=img.rotate(TILT[f],resample=Image.BICUBIC,expand=True)
            img=img.crop(bbox(np.array(img))); img.thumbnail((440,440),Image.LANCZOS)
            save(img,f'spirit/{sp}{i+1}{side}.webp',90)
# --- books
def darkcut(f,box,bgc,tol=22):
    im=np.array(Image.open(U+f+'.png').convert('RGB')).astype(int)
    x0,y0,x1,y1=box; a=im[y0-6:y1+6,x0-6:x1+6]
    d=np.sqrt(((a-np.array(bgc))**2).sum(2))
    lab,n=nd.label(d<tol); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(edge)); al=nd.gaussian_filter((~bg).astype(float),0.7)
    out=np.dstack([a,np.clip(al*1.2,0,1)*255]).astype(np.uint8)
    return Image.fromarray(out,'RGBA')
BK={'fire':('3b59a118',(36,139,375,610)),'ice':('3b59a118',(414,143,751,612)),'spike':('3b59a118',(789,144,1124,610)),'lightning':('3b59a118',(1164,141,1503,610)),
    'quake':('aa162f7c',(35,142,375,611)),'cluster':('aa162f7c',(414,144,752,612)),'wet':('aa162f7c',(789,144,1125,612)),
    'ghost':('f1e3af05',(575,138,942,611)),'poison':('f1e3af05',(1052,140,1432,612))}
for k,(f,box) in BK.items():
    img=darkcut(f,box,(24,25,27)); img=img.crop(bbox(np.array(img),30)); img=img.resize((img.width*2,img.height*2),Image.LANCZOS); save(img,f'book/{k}.webp',90)
im=np.array(Image.open(U+'946880bb.png').convert('RGB')).astype(int)
img=darkcut('946880bb',(150,40,880,970),tuple(im[10,10])); img=img.crop(bbox(np.array(img),30)); save(img,'book/beam.webp',90)
# card page (purple gradient bg) — flood by saturation of purple
im=np.array(Image.open(U+'c313481d.png').convert('RGB')).astype(int)
pur=(im[...,2]>im[...,1]+40)&(im[...,0]<im[...,2])
lab,n=nd.label(pur); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
bg=np.isin(lab,list(edge)); al=nd.gaussian_filter((~bg).astype(float),0.8)
img=Image.fromarray(np.dstack([im,np.clip(al*1.2,0,1)*255]).astype(np.uint8),'RGBA'); img=img.crop(bbox(np.array(img),30)); save(img,'ui/page.webp',90)
meta['page']={'w':img.width,'h':img.height}
# --- runes 4x4 on white
im=np.array(Image.open(U+'86c18b26.png').convert('RGB')).astype(int)
wh=(im.min(2)>235)&((im.max(2)-im.min(2))<18)
lab,n=nd.label(wh); edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
bg=np.isin(lab,list(edge))
RN=['stone','crit','critdmg','boss','dur','afflicted','repair','wallhp','normal','allballs','plusball','spirit','impact','area','beamlight','pierce']
for i,k in enumerate(RN):
    r,c=divmod(i,4); x0,y0=c*256,r*256
    a=im[y0:y0+256,x0:x0+256]; b=bg[y0:y0+256,x0:x0+256].copy()
    if k=='crit':  # white disc inside the crosshair ring
        inner=wh[y0:y0+256,x0:x0+256]&~b; lab2,n2=nd.label(inner)
        if n2: sizes=nd.sum(inner,lab2,range(1,n2+1)); j=int(np.argmax(sizes))+1; b|=(lab2==j)
    al=nd.gaussian_filter((~b).astype(float),0.6)
    img=Image.fromarray(np.dstack([a,np.clip(al*1.2,0,1)*255]).astype(np.uint8),'RGBA'); img=img.crop(bbox(np.array(img),30))
    save(img,f'rune/{k}.webp',90)
# --- enemies (from enemies.py output)
meta['en']={}
for fn in os.listdir('en'):
    if fn.endswith('.png'):
        img=Image.open('en/'+fn); img.thumbnail((360,360),Image.LANCZOS); save(img,'en/'+fn[:-4]+'.webp',90); meta['en'][fn[:-4]]=[img.width,img.height]
json.dump(meta,open(OUT+'meta.json','w'))
print('ok')
