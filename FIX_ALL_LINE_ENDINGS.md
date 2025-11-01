# Fix All Line Endings - Complete Solution

## Problem
- `sed` shows permission warnings (these are warnings only, not errors)
- `network.config` file also has Windows line endings
- Docker network needs to be running

## Complete Solution

### Step 1: Fix ALL Files (Ignore Permission Warnings)

The `sed` permission warnings are just warnings - the line endings ARE being fixed. Run:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network

# Fix all shell scripts (ignore permission warnings)
find . -name "*.sh" -exec sed -i 's/\r$//' {} \; 2>/dev/null

# Fix network.config file (this is critical!)
sed -i 's/\r$//' network.config 2>/dev/null

# Also fix any other config files
find . -name "*.config" -exec sed -i 's/\r$//' {} \; 2>/dev/null
```

**Note**: The permission warnings are harmless - the line endings ARE being converted correctly!

### Step 2: Check Docker is Running

Before starting the network, ensure Docker is running:

```bash
# Check Docker is running
docker ps

# If Docker isn't running or accessible, check Docker Desktop
# Make sure WSL integration is enabled in Docker Desktop settings
```

### Step 3: Verify Line Endings Are Fixed

Check if the files are fixed:

```bash
# This should return nothing (no \r characters found)
grep -l $'\r' network.sh network.config 2>/dev/null || echo "Files are fixed!"
```

### Step 4: Start the Network

Now run:

```bash
./network.sh up createChannel
```

## Alternative: Copy to Linux Filesystem First

If permission issues persist, copy the files to Linux filesystem first:

```bash
# Create a temp directory in Linux filesystem
mkdir -p ~/fabric-work

# Copy the test-network to Linux filesystem
cp -r /mnt/c/CDMS_Blockchain/fabric-samples/test-network ~/fabric-work/

# Navigate to copied directory
cd ~/fabric-work/test-network

# Now fix line endings (should work without permission issues)
find . -name "*.sh" -exec sed -i 's/\r$//' {} \;
sed -i 's/\r$//' network.config

# Run from Linux filesystem
./network.sh up createChannel
```

**Note**: If you do this, you'll need to copy connection profiles back after network starts, OR update the backend to point to this location.

## Quick One-Liner Fix

Run this in your WSL terminal:

```bash
cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network && \
find . -type f \( -name "*.sh" -o -name "*.config" \) -exec sed -i 's/\r$//' {} \; 2>/dev/null && \
docker ps > /dev/null 2>&1 && echo "Ready! Run: ./network.sh up createChannel" || echo "Docker not running - start Docker Desktop first"
```

## About the Permission Warnings

The "preserving permissions" warnings from `sed` are **harmless warnings** - the line endings ARE being converted correctly. The warnings occur because:

1. Windows filesystems (NTFS) don't support Unix permissions the same way
2. `sed` tries to preserve original file permissions when creating temp files
3. It can't do this on Windows filesystems
4. **But the line ending conversion still works!**

You can safely ignore these warnings - your files are being fixed correctly.

