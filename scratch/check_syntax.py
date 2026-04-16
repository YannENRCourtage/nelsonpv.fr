
import sys

def check_brackets(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    lines = content.split('\n')
    
    for i, line in enumerate(lines):
        # Very simple parser ignoring strings/comments for now
        # Actually, let's just count for now
        pass

    # Better: just count total totals
    counts = {
        '(': content.count('('),
        ')': content.count(')'),
        '{': content.count('{'),
        '}': content.count('}'),
        '[': content.count('['),
        ']': content.count(']')
    }
    
    print(f"Counts: {counts}")
    if counts['('] != counts[')']:
        print(f"Mismatch in (): {counts['(']} vs {counts[')']}")
    if counts['{'] != counts['}']:
        print(f"Mismatch in {{}}: {counts['{']} vs {counts['}']}")
    if counts['['] != counts[']']:
        print(f"Mismatch in []: {counts['[']} vs {counts[']']}")

if __name__ == "__main__":
    check_brackets(sys.argv[1])
