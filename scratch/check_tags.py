import re

def check_tag_balance(filename, start_line, end_line):
    with open(filename, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    content = "".join(lines[start_line-1:end_line])
    
    # Simple tag regex (find <Tag or </Tag or <Tag />)
    # We ignore self-closing tags
    tag_pattern = re.compile(r'<(/?)([a-zA-Z0-9.]+)(?:\s+[^>]*)?(/?)>')
    
    stack = []
    
    for match in tag_pattern.finditer(content):
        slash_start = match.group(1) == '/'
        tag_name = match.group(2)
        slash_end = match.group(3) == '/'
        
        if slash_end:
            # Self-closing <Tag />
            continue
        
        if slash_start:
            # Closing </Tag>
            if not stack:
                print(f"Excess closer </{tag_name}> at relative pos {match.start()}")
            else:
                last_tag, last_pos = stack.pop()
                if last_tag != tag_name:
                    print(f"Mismatched tag: <{last_tag}> at {last_pos} closed by </{tag_name}> at {match.start()}")
        else:
            # Opening <Tag>
            stack.append((tag_name, match.start()))
            
    if stack:
        for tag, pos in stack:
            # Find line/col for pos
            snippet = content[:pos]
            line_num = snippet.count('\n') + start_line
            print(f"Unclosed <{tag}> at line {line_num}")
    else:
        print("Tags seem balanced in the range.")

if __name__ == "__main__":
    check_tag_balance(r"c:\Users\Utilisateur\Documents\ENR COURTAGE ENERGIE\SITES INTERNET\NELSON\NELSON\src\pages\BpAcama.jsx", 1570, 2540)
