# Enable Docker WSL Integration - Step by Step Guide

## Problem
Docker Desktop is running, but WSL cannot access Docker. This means WSL integration is not enabled.

## Solution: Enable WSL Integration in Docker Desktop

### Step 1: Open Docker Desktop Settings

1. **Find Docker Desktop icon** in your system tray (bottom-right corner)
2. **Right-click** on the Docker Desktop icon
3. Click **"Settings"** or **"Settings..."**

   OR

   If Docker Desktop window is open:
   - Click the **gear icon** (⚙️) in the top-right corner
   - This opens Settings

### Step 2: Navigate to Resources → WSL Integration

1. In the Settings window, click on **"Resources"** in the left sidebar
2. Click on **"WSL Integration"** under Resources

### Step 3: Enable WSL Integration

1. **Turn on** the toggle at the top: **"Enable integration with my default WSL distro"**

2. **Enable your specific WSL distribution**:
   - Look for your distribution (likely "Ubuntu")
   - **Turn on** the toggle next to it
   - You should see a checkmark ✅

3. Click **"Apply & Restart"** button at the bottom
   - Docker Desktop will restart
   - Wait for it to fully restart (icon turns green in system tray)

### Step 4: Verify Docker Works in WSL

Open a **WSL terminal** and test:

```bash
# Test Docker is accessible
docker ps

# If this works, you should see output (even if empty) or a container list
```

If you see an error like "Cannot connect to Docker daemon", wait a moment and try again, or restart Docker Desktop.

### Step 5: Test Docker with a Simple Container

Run this in WSL to verify everything works:

```bash
docker run hello-world
```

You should see:
```
Hello from Docker!
...
```

If you see this, Docker is working correctly in WSL!

## Visual Guide

### Docker Desktop Settings Window:

```
┌─────────────────────────────────────┐
│ Docker Desktop - Settings            │
├─────────────────────────────────────┤
│ General                              │
│ Resources ▼                          │
│  ├─ Advanced                        │
│  ├─ WSL Integration ← Click here    │
│  ├─ Network                          │
│  └─ Proxies                          │
│ ...                                  │
└─────────────────────────────────────┘
```

### WSL Integration Settings:

```
┌─────────────────────────────────────┐
│ WSL Integration                      │
├─────────────────────────────────────┤
│ ☑ Enable integration with my        │
│   default WSL distro                │
│                                     │
│ Distributions:                       │
│ ☑ Ubuntu                            │
│ ☐ Debian                            │
│ ☐ Kali-Linux                        │
│                                     │
│ [Apply & Restart]                    │
└─────────────────────────────────────┘
```

## Troubleshooting

### Issue: "WSL Integration" option is grayed out or missing

**Solution:**
1. Make sure WSL2 is installed (not WSL1)
2. Check WSL version:
   ```powershell
   wsl --list --verbose
   ```
   Should show "2" under "VERSION"
3. If it shows "1", upgrade:
   ```powershell
   wsl --set-version Ubuntu 2
   ```

### Issue: Distribution doesn't appear in the list

**Solution:**
1. Make sure your WSL distribution is installed
2. Restart Docker Desktop
3. If still not showing, restart your computer
4. Check WSL is installed:
   ```powershell
   wsl --list
   ```

### Issue: After enabling, still can't access Docker in WSL

**Solutions:**
1. **Restart WSL**:
   ```powershell
   wsl --shutdown
   ```
   Then open WSL again

2. **Restart Docker Desktop**:
   - Right-click Docker icon → Quit Docker Desktop
   - Start Docker Desktop again
   - Wait for it to fully start (green icon)

3. **Check Docker is running**:
   ```bash
   # In WSL
   docker ps
   ```

### Issue: "Cannot connect to Docker daemon"

**Solutions:**
1. Make sure Docker Desktop is running (check system tray - should be green)
2. Wait a few seconds after enabling WSL integration
3. Restart Docker Desktop:
   - Right-click Docker icon → Restart
4. Restart WSL:
   ```powershell
   wsl --shutdown
   ```
   Then open WSL terminal again

### Issue: Docker Desktop doesn't see WSL

**Solution:**
1. Make sure WSL2 is installed and working:
   ```powershell
   wsl --status
   ```
2. Update WSL:
   ```powershell
   wsl --update
   ```
3. Restart your computer

## Quick Test After Enabling

Once WSL integration is enabled, run these commands in WSL:

```bash
# 1. Check Docker is accessible
docker ps

# 2. Test with hello-world
docker run hello-world

# 3. Check Docker version
docker --version
```

All should work without errors!

## After Enabling WSL Integration

Once Docker is working in WSL, you can:

1. ✅ Start Fabric network:
   ```bash
   cd /mnt/c/CDMS_Blockchain/fabric-samples/test-network
   ./network.sh up createChannel
   ```

2. ✅ Use Docker commands in WSL

3. ✅ Run Docker containers from WSL

## Need More Help?

- Docker Desktop documentation: https://docs.docker.com/desktop/wsl/
- WSL documentation: https://learn.microsoft.com/en-us/windows/wsl/

