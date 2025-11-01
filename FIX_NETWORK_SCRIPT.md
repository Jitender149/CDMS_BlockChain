# Fix Network Script Line Ending Issue

## Problem
When running `./network.sh up createChannel` in WSL, you see:
```
/usr/bin/env: 'bash\r': No such file or directory
```

This happens because the script has Windows line endings (CRLF) instead of Unix line endings (LF).

## Solution

### Option 1: Use sed (Recommended - No Permission Issues)

This works on Windows filesystems without permission problems:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Fix all shell scripts at once (removes Windows \r line endings)
find . -name "*.sh" -exec sed -i 's/\r$//' {} \;

# Now run the network
./network.sh up createChannel
```

This is the easiest method and doesn't require installing anything or changing permissions!

### Option 2: Use dos2unix with -k Flag (Keep Permissions)

If you prefer dos2unix, use the `-k` flag to keep original permissions:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

dos2unix -k network.sh
find organizations -name "*.sh" -exec dos2unix -k {} \;
```

This prevents the permission error!

### Option 3: Use Vim or Nano

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Open in vim
vim network.sh

# In vim, type:
:set ff=unix
:wq

# Or use nano
nano network.sh
# Remove any \r characters manually (Ctrl+Alt+R to see them)
```

## About chmod Permission Error

**Note**: You don't need to use `chmod` on Windows-mounted filesystems. The files will still be executable once the line endings are fixed.

The error `chmod: changing permissions of 'network.sh': Operation not permitted` is normal for Windows filesystems in WSL. The files will still work as long as the line endings are correct.

**Solution**: Use `sed` instead of `dos2unix` to avoid permission issues entirely!

## After Fixing

Once line endings are fixed, you can run:

```bash
./network.sh up createChannel
```

This should now work without the `bash\r` error!

