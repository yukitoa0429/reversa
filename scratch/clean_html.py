import os

def clean_and_version():
    path = 'c:/AntigravityProjects/reversa/index.html'
    if not os.path.exists(path): return

    # 1. Read raw and normalize encoding/newlines
    with open(path, 'rb') as f:
        raw = f.read()
    
    # Remove UTF-16 BOM if it exists
    if raw.startswith(b'\xff\xfe'):
        content = raw.decode('utf-16')
    else:
        content = raw.decode('utf-8', errors='ignore')

    # Normalize double newlines \r\r\n -> \n
    content = content.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')

    # 2. Update version strings
    import re
    # Match any src="...js..."
    content = re.sub(r'src="questions\.js[^"]*"', 'src="questions.js?v=final"', content)
    content = re.sub(r'src="config\.js[^"]*"', 'src="config.js?v=final"', content)
    content = re.sub(r'src="js/app\.js[^"]*"', 'src="js/app.js?v=final"', content)

    # 3. Write back as clean UTF-8
    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print('index.html cleaned and versioned.')

if __name__ == '__main__':
    clean_and_version()
