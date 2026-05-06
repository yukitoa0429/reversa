import os

def clean_js():
    path = 'c:/AntigravityProjects/reversa/js/app.js'
    if not os.path.exists(path): return

    with open(path, 'rb') as f:
        raw = f.read()
    
    if raw.startswith(b'\xff\xfe'):
        content = raw.decode('utf-16')
    else:
        content = raw.decode('utf-8', errors='ignore')

    # Normalize newlines
    content = content.replace('\r\r\n', '\n').replace('\r\n', '\n').replace('\r', '\n')

    with open(path, 'w', encoding='utf-8', newline='\n') as f:
        f.write(content)
    print('app.js cleaned.')

if __name__ == '__main__':
    clean_js()
