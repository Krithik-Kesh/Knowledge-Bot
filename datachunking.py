import pypdf
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document

def load_pdf_pages(file_path: str):
    reader = pypdf.PdfReader(file_path) #Reads file path
    return reader.is_encrypted
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

#Text splitter with default text chunking
text_splitting = RecursiveCharacterTextSplitter(
    chunk_size= 100, #Chunk max size based off length func
    chunk_overlap = 20, #The amrgin of overlapping chunks, helps to find context across chunks
    length_function =len, #Function that determines chunk size
    is_separator_regex=False, #INterpret the basics as regex
)

if __name__ == "__main__":
    file_path = "C:/Users/tamilsk/OneDrive - Colas/COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf"
    docs = load_pdf_pages(file_path)
    # chunky = text_splitting.create_documents(docs)
    print(docs)