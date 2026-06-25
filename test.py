from pypdf import PdfReader

file_path = PdfReader("C:/Users/tamilsk/Downloads/COR.HSE.TRN.002.EN.00.Corporate HSE Driver Orientation.pdf")


if file_path.is_encrypted:
    print("This PDF is encrypted.")
    
    # Optional: Attempt to decrypt it
    # try:
    #     reader.decrypt("your_password")
    #     print("Successfully decrypted!")
    # except FileNotEncryptedError:
    #     print("Decryption failed.")
else:
    print("This PDF is not encrypted and can be read freely.")