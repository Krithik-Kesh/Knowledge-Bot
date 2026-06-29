import pikepdf

p = r"C:/Users/tamilsk/OneDrive - Colas/pdfs_clean/COR.HSE.TRN.001.EN.00.Corporate HSE Orientation.pdf"
try:
    with pikepdf.open(p) as pdf:        # empty password by default
        print("Opens fine. is_encrypted =", pdf.is_encrypted)
        print("No password needed — restrictions strip on save.")
except pikepdf.PasswordError:
    print("This one genuinely needs an OPEN password.")