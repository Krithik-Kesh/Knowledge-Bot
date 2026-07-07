"""
chunktitioning.py

Integration of the partition and chunking (chunktitioning) to each document before chunking.

This parititon is done to partition each document, for {"Header", "Footer", "PageNumber", "UncategorizedText"}
using the unstructured.io library.

The chunking is a method called chunk_by_title. Chunk by title creates chunks dependent on title and 


"""
from pathlib import Path
from unstructured.partition.pdf import partition_pdf
from unstructured.chunking.title import chunk_by_title


#Document preperation via partition
folder_path = Path("data/imports/")

for file_path in folder_path.iterdir():
    file_path = str(file_path)
    if file_path[-3:] == "pdf": #Import is PDF
        partitioned = partition_pdf(file_path)

#Chunking data by title
chunks = chunk_by_title(partitioned)


