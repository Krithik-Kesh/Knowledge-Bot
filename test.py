import pikepdf
from pathlib import Path

SRC = Path(r"C:/Users/tamilsk/OneDrive - Colas/Desktop/VsCode/Knowledge-Bot/Documents")
DST = Path(r"C:/Users/tamilsk/Downloads/pdfs_clean")
DST.mkdir(parents=True, exist_ok=True)

print(f"SRC exists?  {SRC.exists()}")
print(f"DST created: {DST.resolve()}")

pdfs = list(SRC.glob("*.pdf"))
print(f"Found {len(pdfs)} PDF(s) in SRC")

for pdf in pdfs:
    try:
        with pikepdf.open(pdf) as f:
            f.save(DST / pdf.name)
        print(f"OK   {pdf.name}")
    except Exception as e:
        print(f"FAIL {pdf.name} -> {e}")

print("done")