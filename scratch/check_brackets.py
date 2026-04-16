import sys

def check_balance(filename, start_line, end_line):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    content = "".join(lines[start_line-1:end_line])
    
    stack = []
    pairs = {'{': '}', '(': ')', '[': ']'}
    closers = {v: k for k, v in pairs.items()}
    
    for i, char in enumerate(content):
        if char in pairs:
            stack.append((char, i))
        elif char in closers:
            if not stack:
                print(f"Excess closer '{char}' at relative position {i}")
            else:
                last, pos = stack.pop()
                if last != closers[char]:
                    # Find line and col for relative position
                    snippet = content[:i]
                    line_num = snippet.count('\n') + start_line
                    last_newline = snippet.rfind('\n')
                    col = i - last_newline
                    print(f"Mismatched pair: '{last}' opened at pos {pos} closed by '{char}' at line {line_num}, col {col}")
    
    if stack:
        for char, pos in stack:
            # Find line and col for relative position
            snippet = content[:pos]
            line_num = snippet.count('\n') + start_line
            last_newline = snippet.rfind('\n')
            col = pos - last_newline
            print(f"Unclosed '{char}' opened at line {line_num}, col {col}")
    else:
        print("Brackets ({}, (), []) are balanced in the provided range.")

if __name__ == "__main__":
    check_balance(r"c:\Users\Utilisateur\Documents\ENR COURTAGE ENERGIE\SITES INTERNET\NELSON\NELSON\src\pages\BpAcama.jsx", 1570, 2556)
