import pypdf
from langchain_core.documents import Document


#PDF scanner to load the pdfs
def load_pdf_pages(file_path: str) -> list[Document]:
    reader = pypdf.PdfReader(file_path)
    return [
        Document(
            page_content=page.extract_text() or "",
            metadata={"source": file_path, "page": i},
        )
        for i, page in enumerate(reader.pages)
    ]

file_path = "C:/Users/MIL/Downloads/COR.HSE.TRN.002.EN.00.Corporate HSE Driver Orientation.pdf"
docs = load_pdf_pages(file_path)
print(docs)