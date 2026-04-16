import sys

def check_balance(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    pairs = {'{': '}', '(': ')'}
    closers = {v: k for k, v in pairs.items()}
    
    lines = content.split('\n')
    
    char_index = 0
    for line_idx, line in enumerate(lines):
        for col_idx, char in enumerate(line):
            if char in pairs:
                stack.append((char, line_idx + 1, col_idx + 1))
            elif char in closers:
                if not stack:
                    print(f"Excess closer '{char}' at line {line_idx + 1}, col {col_idx + 1}")
                else:
                    last, l, c = stack.pop()
                    if last != closers[char]:
                        print(f"Mismatched pair: '{last}' opened at L{l}:C{c} closed by '{char}' at L{line_idx + 1}:C{col_idx + 1}")
    
    if stack:
        for char, l, c in stack:
            print(f"Unclosed '{char}' opened at L{l}:C{c}")
    else:
        print("All {}, () are balanced in the file.")

if __name__ == "__main__":
    check_balance(r"c:\Users\Utilisateur\Documents\ENR COURTAGE ENERGIE\SITES INTERNET\NELSON\NELSON\src\pages\BpAcama.jsx")
