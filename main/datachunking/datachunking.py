import pypdf
from unstructured.partition.auto import partition

#Loading pdf reader to calibrate one specific page
def load_pdf_pages(file_path: str):
    reader = pypdf.PdfReader(file_path) #Reads file path
    page = reader.pages[2]
    text = page.extract_text()
    return text

elements = partition("C:/Users/tamilsk/Downloads/pdfs_clean/COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf")

if __name__ == "__main__":
    file_path = "C:/Users/tamilsk/Downloads/pdfs_clean/COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf"
    docs = load_pdf_pages(file_path)
    print(elements)
    # print("\n\n".join([str(el) for el in elements]))