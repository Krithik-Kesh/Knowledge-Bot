import imports_cleaned
from unstructured.partition.auto import partition

    
elements = partition("C:/Users/tamilsk\OneDrive - Colas\pdfs_clean\COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf")

if __name__ == "__main__":
    file_path = "C:/Users/tamilsk\OneDrive - Colas\pdfs_clean\COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf"
    print("\n\n".join([str(el) for el in elements]))