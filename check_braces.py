
content = open(r'c:\Users\User\Downloads\Developement\Customize Bill Branding\src\app\pages\CreateInvoice.tsx', 'r', encoding='utf-8').read()
stack = []
for i, char in enumerate(content):
    if char == '{':
        stack.append(i)
    elif char == '}':
        if not stack:
            print(f"Extra closing brace at position {i}")
            # Find line number
            line = content.count('\n', 0, i) + 1
            print(f"Line number: {line}")
            # print surrounding context
            start = max(0, i - 50)
            end = min(len(content), i + 50)
            print(f"Context: {content[start:end]}")
        else:
            stack.pop()

if stack:
    print(f"{len(stack)} unclosed opening braces")
    for pos in stack:
        line = content.count('\n', 0, pos) + 1
        print(f"Opening brace at line {line}")
else:
    print("Braces are balanced")
