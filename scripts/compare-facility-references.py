"""Contact sheets are review artifacts only; source artwork never enters the app."""
import os,json
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
root=Path(__file__).resolve().parents[1]
refs=Path(os.environ['CAMPUS_REFERENCE_ARTWORK'])
out=root/'evidence/reference-continuation'
manifest=json.loads((out/'exteriors/geometry-manifest.json').read_text())
for start in range(0,len(manifest),8):
 subset=manifest[start:start+8]
 sheet=Image.new('RGB',(1440,80+380*((len(subset)+1)//2)), '#142027');draw=ImageDraw.Draw(sheet)
 draw.text((18,14),'SHIPPED GEOMETRY / FULL SOURCE INFOGRAPHIC',fill='#f4e3bc')
 draw.text((18,38),'CPU Cycles: geometry review. Exact-reference and photoreal acceptance remain open.',fill='#bec7c9')
 for j,f in enumerate(subset):
  x=(j%2)*720;y=80+(j//2)*380
  draw.text((x+12,y+6),f["key"]+'  '+f['name'][:65],fill='#f4e3bc')
  rendered=Image.open(out/'exteriors'/f'{f["key"]}.jpg').convert('RGB')
  rendered=ImageOps.contain(rendered,(486,340));sheet.paste(rendered,(x+4,y+30+(340-rendered.height)//2))
  ref=ImageOps.contain(Image.open(refs/f'{f["key"]}_Facility_Infographic.png').convert('RGB'),(222,340));sheet.paste(ref,(x+494,y+30))
 sheet.save(out/f'comparison-{start+1:02d}-{start+len(subset):02d}.jpg',quality=91)
ref=ImageOps.contain(Image.open(refs/'CF-13_Facility_Infographic.png').convert('RGB'),(660,990))
image=ImageOps.contain(Image.open(out/'exteriors/CF-13.jpg').convert('RGB'),(1100,700))
sheet=Image.new('RGB',(1760,1040),'#142027');draw=ImageDraw.Draw(sheet)
draw.text((18,12),'EON: PERIMETER RECONSTRUCTION / FULL REFERENCE — NOT EXACT-MATCH ACCEPTED',fill='#f4e3bc');sheet.paste(image,(0,180));sheet.paste(ref,(1100,45));sheet.save(out/'CF-13-comparison.jpg',quality=93)
