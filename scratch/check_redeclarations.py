import re

def check_redeclarations(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Simple regex for 'const name =' or 'function name('
    const_pattern = re.compile(r'^\s*(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=', re.MULTILINE)
    func_pattern = re.compile(r'^\s*function\s+([a-zA-Z0-9_$]+)\s*\(', re.MULTILINE)
    
    declarations = {}
    
    for match in const_pattern.finditer(content):
        name = match.group(1)
        line = content.count('\n', 0, match.start()) + 1
        if name not in declarations:
            declarations[name] = []
        declarations[name].append(line)
    
    for match in func_pattern.finditer(content):
        name = match.group(1)
        line = content.count('\n', 0, match.start()) + 1
        if name not in declarations:
            declarations[name] = []
        declarations[name].append(line)
        
    for name, lines in declarations.items():
        if len(lines) > 1:
            print(f"Redeclaration of '{name}' at lines: {lines}")

if __name__ == "__main__":
    check_redeclarations(r"c:\Users\Utilisateur\Documents\ENR COURTAGE ENERGIE\SITES INTERNET\NELSON\NELSON\src\pages\BpAcama.jsx")
