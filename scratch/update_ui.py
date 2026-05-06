import os

def update_index():
    path = 'c:/AntigravityProjects/reversa/index.html'
    if not os.path.exists(path): return

    # 文字コードを自動判別して読み込む
    content = None
    for enc in ['utf-16', 'utf-8-sig', 'utf-8', 'cp932']:
        try:
            with open(path, 'r', encoding=enc) as f:
                content = f.read()
                print(f'Read index.html using {enc}')
                break
        except:
            continue

    if content is None:
        print('Failed to read index.html')
        return

    target = '<div id="display-correct-reverse" class="display-correct-reverse"></div>'
    if 'display-user-comparison' not in content:
        new_div = '\n                        <div id="display-user-comparison" class="display-user-comparison" style="margin-top: 10px; font-size: 1.2rem; min-height: 1.5em; opacity: 0.9;"></div>'
        new_content = content.replace(target, target + new_div)
        # 常に UTF-8 で保存し直す
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('index.html updated and converted to UTF-8.')
    else:
        # すでに要素があっても、UTF-8 に統一するために保存し直す
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print('index.html was already updated, but converted to UTF-8 for safety.')

if __name__ == '__main__':
    update_index()
