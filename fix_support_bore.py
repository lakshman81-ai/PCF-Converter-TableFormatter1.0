import re

with open('src/components/DataTableTab.jsx', 'r') as f:
    content = f.read()

# Update DataTableTab.jsx to ignore bore if it's a SUPPORT
old_check = '    if (field === \'bore\' && (row.bore === null || row.bore === undefined || row.bore === "") && type !== "MESSAGE-SQUARE") {'
new_check = '    if (field === \'bore\' && (row.bore === null || row.bore === undefined || row.bore === "") && type !== "MESSAGE-SQUARE" && type !== "SUPPORT") {'

content = content.replace(old_check, new_check)

with open('src/components/DataTableTab.jsx', 'w') as f:
    f.write(content)
