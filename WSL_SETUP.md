# WSL Setup and Sudo Configuration Guide

## Understanding Sudo on Windows

**Important**: Windows PowerShell does NOT have native `sudo` command. The `sudo` command is a Linux/Unix command that works in:
- WSL (Windows Subsystem for Linux)
- Linux distributions
- macOS

## How to Enable Sudo (You're Already in WSL!)

When you run `wsl`, you enter a Linux environment where `sudo` is **already enabled** by default! The error you saw happened because you ran `sudo` in PowerShell, not in WSL.

## Step-by-Step Solution

### Option 1: Use WSL Properly (Recommended)

1. **Open WSL terminal:**
   ```powershell
   wsl
   ```

2. **You'll see a Linux prompt like:**
   ```
   username@hostname:~$
   ```

3. **Now `sudo` works! Try:**
   ```bash
   sudo whoami
   ```
   (This should return "root")

4. **Install Vault:**
   ```bash
   sudo snap install vault
   ```

### Option 2: Enable Windows Sudo Feature (Not Recommended)

Windows 11 has an experimental `sudo` feature that works differently:

1. **Open Settings:**
   - Press `Win + I`
   - Go to **Privacy & Security** → **For developers**
   - OR search for "Developer Settings"

2. **Enable Developer Mode:**
   - Enable "Developer Mode" toggle

3. **Enable Sudo:**
   - Scroll to "Run sudo commands in elevated mode"
   - Enable this setting

**Note**: This Windows sudo is different from Linux sudo and may not work with all Linux commands like `snap`. It's better to use WSL.

### Option 3: Use Docker (Easiest, No Sudo Needed)

Instead of using `sudo snap install vault`, use Docker which works in PowerShell:

```powershell
# Pull and run Vault in Docker
docker pull hashicorp/vault:latest
docker run -d --name vault-dev --cap-add=IPC_LOCK -e 'VAULT_DEV_ROOT_TOKEN_ID=root' -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' -p 8200:8200 hashicorp/vault:latest
```

## Common Issues and Solutions

### Issue: "Sudo is disabled on this machine"

**Problem**: You ran `sudo` in PowerShell instead of WSL.

**Solution**: 
1. Enter WSL first: `wsl`
2. Then run your sudo commands

### Issue: "Sudo: command not found" in WSL

**Problem**: Your WSL distribution might not have sudo installed (rare).

**Solution**:
```bash
# In WSL, install sudo
apt-get update
apt-get install sudo -y

# Add your user to sudo group
usermod -aG sudo $USER
```

### Issue: "User is not in the sudoers file"

**Solution**:
```bash
# In WSL, add your user to sudoers
sudo usermod -aG sudo $USER
# Then logout and login again
exit
wsl
```

## Verifying Your Setup

### Check WSL is Working:
```powershell
wsl --status
wsl --list --verbose
```

### Test Sudo in WSL:
```bash
wsl
sudo whoami  # Should return "root"
```

### Test Sudo with Password:
The first time you use sudo in a session, you might be asked for your password (the password you set when you first installed WSL).

## Recommended Workflow for Your Project

### For Vault Installation:

**Method 1: Docker (PowerShell)**
```powershell
docker run -d --name vault-dev --cap-add=IPC_LOCK -e 'VAULT_DEV_ROOT_TOKEN_ID=root' -e 'VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8200' -p 8200:8200 hashicorp/vault:latest
```

**Method 2: Snap in WSL**
```powershell
# In PowerShell:
wsl

# In WSL terminal (after wsl command):
sudo snap install vault
vault --version
vault server -dev -dev-root-token-id="root"
```

## Quick Reference

| Command | Location | Works? |
|---------|----------|--------|
| `sudo snap install vault` | PowerShell | ❌ No |
| `sudo snap install vault` | WSL Terminal | ✅ Yes |
| `docker run ...` | PowerShell | ✅ Yes |
| `export VAR=value` | PowerShell | ❌ No (use `$env:VAR="value"`) |
| `export VAR=value` | WSL Terminal | ✅ Yes |

