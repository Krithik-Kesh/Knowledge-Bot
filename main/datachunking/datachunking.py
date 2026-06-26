import pypdf
from unstructured.partition.auto import partition
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

def load_pdf_pages(file_path: str):
    reader = pypdf.PdfReader(file_path) #Reads file path
    page = reader.pages[2]
    text = page.extract_text()
    return text

"""
#PDF scanner to load the pdfs
def load_pdf_pages(file_path: str) -> list[Document]:
    reader = pypdf.PdfReader(file_path) #Reads file path
    #Return format
    return [
        Document(
            page_content=page.extract_text() or "",
            #Starting index of page
            metadata={"source": file_path, "page": i},
        )
        #enumerate index and page
        for i, page in enumerate(reader.pages)
    ]
"""

elements = partition("C:/Users/tamilsk/Downloads/pdfs_clean/COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf")

if __name__ == "__main__":
    file_path = "C:/Users/tamilsk/Downloads/pdfs_clean/COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf"
    docs = load_pdf_pages(file_path)
    # chunky = text_splitting.create_documents(docs)
    # print(docs)
    print("\n\n".join([str(el) for el in elements]))