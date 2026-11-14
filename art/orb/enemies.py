import numpy as np, json, os
from PIL import Image
from scipy import ndimage as nd
HERE=os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
U=HERE+'/src/'  # Серёгины исходники (id картинки из чата)
SH={'o1':'907bd206','o2':'7d311ec0','o3':'39651ff6','o4':'c2fe86f7','s1':'67714c99','s2':'505ef6cb','s3':'0f8a65c6','s4':'e8e06f17'}
# (set, name): (sheet, box)
B={
 'olymp':{
  'base':('o1',(22,80,135,224)),'base2':('o1',(522,80,634,224)),
  'shield':('o1',(16,318,266,590)),'cannon':('o1',(12,680,268,932)),
  'healer':('o2',(60,8,255,168)),'fast':('o2',(60,176,262,302)),'slime':('o2',(60,303,262,458)),
  'ram':('o2',(60,460,262,628)),'echidna':('o2',(55,628,265,800)),'talos':('o2',(52,806,268,990)),
  'archer':('o3',(14,50,142,250)),'cyclops':('o3',(520,30,700,255)),'summoner':('o3',(4,302,150,505)),
  'brute':('o3',(518,292,700,505)),'bigslime':('o3',(8,606,142,808)),'hydra':('o3',(500,516,804,775)),
  'bhealer':('o4',(10,78,210,284)),'split1':('o4',(24,690,343,930)),'split2':('o4',(360,732,502,905)),'split3':('o4',(702,788,805,895)),
 },
 'stone':{
  'base':('s1',(22,80,135,224)),'base2':('s1',(522,80,634,224)),
  'shield':('s1',(16,318,266,590)),'cannon':('s1',(12,680,268,932)),
  'healer':('s2',(15,122,138,300)),'fast':('s2',(520,145,645,300)),'slime':('s2',(20,445,140,594)),
  'ram':('s2',(520,428,645,594)),'echidna':('s2',(10,720,135,892)),'talos':('s2',(515,726,645,892)),
  'archer':('s3',(140,80,435,280)),'cyclops':('s3',(510,20,905,310)),'summoner':('s3',(115,305,475,605)),
  'brute':('s3',(480,335,940,610)),'bigslime':('s3',(70,625,420,970)),'hydra':('s3',(460,610,970,980)),
  'bhealer':('s4',(12,92,205,268)),'split1':('s4',(36,686,292,925)),'split2':('s4',(360,742,493,893)),'split3':('s4',(702,786,803,893)),
 }}
os.makedirs('en',exist_ok=True)
meta={}
for st,d in B.items():
  for name,(sh,box) in d.items():
    im=np.array(Image.open(U+SH[sh]+'.png').convert('RGB')).astype(int)
    c=np.median(np.concatenate([im[:6].reshape(-1,3),im[-6:].reshape(-1,3)]),0)
    x0,y0,x1,y1=box; a=im[y0:y1,x0:x1]
    dist=np.sqrt(((a-c)**2).sum(2))
    bgl=dist<26
    lab,n=nd.label(bgl)
    edge=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(edge))
    fg=~bg
    lab2,n2=nd.label(fg)
    if n2>1:
      sizes=nd.sum(fg,lab2,range(1,n2+1)); big=sizes.max()
      keep=[i+1 for i,s in enumerate(sizes) if s>=big*0.08]
      fg=np.isin(lab2,keep)
    fg=nd.binary_fill_holes(fg) if name not in('hydra',) else fg
    alpha=nd.gaussian_filter(fg.astype(float),0.6)
    alpha=np.clip(alpha*1.15,0,1)
    ys,xs=np.where(fg); a2=a[ys.min():ys.max()+1,xs.min():xs.max()+1]; al=alpha[ys.min():ys.max()+1,xs.min():xs.max()+1]
    out=Image.fromarray(np.dstack([a2,al*255]).astype(np.uint8),'RGBA')
    out.save(f'en/{st}_{name}.png'); meta[f'{st}_{name}']=out.size
json.dump(meta,open('en/meta.json','w'),indent=0)
# preview
ks=sorted(meta); T=150
sheet=Image.new('RGBA',(8*T,((len(ks)+7)//8)*T),(60,50,70,255))
from PIL import ImageDraw
dr=ImageDraw.Draw(sheet)
for i,k in enumerate(ks):
  im=Image.open(f'en/{k}.png'); im.thumbnail((T-10,T-22))
  x=(i%8)*T; y=(i//8)*T; sheet.alpha_composite(im,(x+5,y+3)); dr.text((x+3,y+T-14),k,fill=(255,255,0))
sheet.save('en_preview.png'); print(len(ks))
