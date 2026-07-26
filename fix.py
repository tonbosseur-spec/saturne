import re

with open('src/components/PublicFormView.tsx', 'r') as f:
    lines = f.read().split('\n')

# The exact lines we know need `)}` based on the spaces and errors:
target_lines = [
    695, 698, 756, 759, 784, 807, 867, 922, 943, 984, 1003, 1012, 1036,
    1094, 1104, 1189, 1194, 1196, 1202, 1230, 1244, 1266, 1293, 1310, 1332, 1341
]

for i in target_lines:
    idx = i - 1  # 0-indexed
    if lines[idx].strip() == '':
        lines[idx] = lines[idx] + ')}'

with open('src/components/PublicFormView.tsx', 'w') as f:
    f.write('\n'.join(lines))
