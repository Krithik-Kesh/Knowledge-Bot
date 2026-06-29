from pathlib import Path
from unstructured.partition.pdf import partition_pdf
from unstructured.partition.pptx import partition_pptx
#docs

folder_path = Path("data/imports/")

for file_path in folder_path.iterdir():
    file_path = str(file_path)
    if file_path[-3:] == "pdf": #Import is PDF
        file = partition_pdf(file_path)

partitioned = "\n\n".join([str(i) for i in file])

lst = partitioned.split("\n")


if __name__ == "__main__":
    print("\n\n".join([str(i) for i in file]))