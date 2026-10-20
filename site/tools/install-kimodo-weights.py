"""Fetch pinned upstream Kimodo CPU assets, resume partial transfers and verify SHA-256.

No credentials are read, no system settings are changed, and original assets are not deleted.
Usage: python tools/install-kimodo-weights.py D:/kimodo
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import hashlib
import json
import sys
import time
import urllib.request

FILES = [
    ("models/kimodo-soma-rp-v1.1-f32.gguf",
     "https://huggingface.co/LocalAI-io/Kimodo-SOMA-RP-v1.1-GGML/resolve/65f8b8ab34ee7524161cc87b20ae4cb4f5d3a12d/models/kimodo-soma-rp-v1.1-f32.gguf",
     1133166784, "3bf1229f4c1eff1d28f5196a854113da2df9a11a5e21c60694630903bf948ee4"),
    ("models/text/Llama-3-Kimodo-Q8_0.gguf",
     "https://huggingface.co/LocalAI-io/Llama-3-Kimodo-GGML/resolve/3e8d958803beaddb6011ac534f2be972e2710c7d/Llama-3-Kimodo-Q8_0.gguf",
     8142058752, "b26d0e74b115b33a7f2df5aca04426548365e99217cd590986f8abc4172e4c5c"),
    ("models/text/tokenizer.gguf",
     "https://huggingface.co/LocalAI-io/Llama-3-Kimodo-GGML/resolve/3e8d958803beaddb6011ac534f2be972e2710c7d/tokenizer.gguf",
     7295054, "81614aca62a98846c02b72cc2e5378e5bdce8b4d507b88f96eb1faa90dae607e"),
]
ROOT=Path(sys.argv[1]).resolve()
ROOT.mkdir(parents=True,exist_ok=True)
def digest(path):
    h=hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda:stream.read(8*1024*1024),b""): h.update(chunk)
    return h.hexdigest()
def download(entry):
    name,url,size,sha=entry
    path=(ROOT/name).resolve()
    if ROOT not in path.parents: raise RuntimeError("Path escapes installation")
    path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():
        if path.stat().st_size==size and digest(path)==sha: return {"file":name,"sha256":sha,"bytes":size,"verified":True}
        raise RuntimeError(f"Existing file differs; preserved: {path}")
    part=path.with_suffix(path.suffix+".part")
    for attempt in range(5):
        offset=part.stat().st_size if part.exists() else 0
        if offset==size: break
        try:
            headers={"User-Agent":"ScratchXR-local-setup/0.1"}
            if offset: headers["Range"]=f"bytes={offset}-"
            with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=120) as response:
                resume=response.status==206 and offset>0
                if not resume: offset=0
                last=time.monotonic()
                with part.open("ab" if resume else "wb") as out:
                    while chunk:=response.read(4*1024*1024):
                        out.write(chunk);offset+=len(chunk)
                        if offset>size: raise RuntimeError("Unexpected download size")
                        if time.monotonic()-last>20:
                            print(f"{name}: {offset/size:.0%} ({offset//1048576} MiB)",flush=True);last=time.monotonic()
            break
        except Exception as error:
            print(f"{name}: retry {attempt+1}: {type(error).__name__}",flush=True)
            if attempt==4: raise
    if part.stat().st_size!=size or digest(part)!=sha: raise RuntimeError(f"Verification failed: {name}")
    part.rename(path)
    print(f"{name}: SHA-256 verified",flush=True)
    return {"file":name,"url":url,"sha256":sha,"bytes":size,"verified":True}
with ThreadPoolExecutor(max_workers=3) as executor:
    manifest=list(executor.map(download,FILES))
(ROOT/"weights-manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
print("All three files verified.",flush=True)
