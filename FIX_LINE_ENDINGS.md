# Fix Line Endings Without Permission Issues

## Problem
`dos2unix` fails with "Operation not permitted" because Windows filesystems in WSL don't allow changing permissions.

## Solution: Use sed Instead

Use `sed` to remove Windows line endings (`\r`) without needing to change permissions:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Fix network.sh
sed -i 's/\r$//' network.sh

# Fix all shell scripts in the directory
find . -name "*.sh" -exec sed -i 's/\r$//' {} \;

# Verify it worked (no output means success)
grep -l $'\r' network.sh  # Should return nothing if fixed
```

## Alternative: Use tr Command

If sed doesn't work, use `tr`:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Fix network.sh
tr -d '\r' < network.sh > network.sh.tmp && mv network.sh.tmp network.sh

# Fix all scripts (more complex with find)
find . -name "*.sh" -type f | while read file; do
    tr -d '\r' < "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
done
```

## Alternative: Use dos2unix with -k Flag

The `-k` flag keeps original permissions:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

dos2unix -k network.sh
dos2unix -k organizations/ccp-generate.sh
find organizations -name "*.sh" -exec dos2unix -k {} \;
```

## Quick Fix (Recommended)

Run this in your WSL terminal:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
find . -name "*.sh" -exec sed -i 's/\r$//' {} \;
```

This will fix all shell scripts without permission issues!

