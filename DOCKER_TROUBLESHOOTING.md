# Docker Troubleshooting Guide

## Common Docker Errors on Windows

### Error: "request returned 500 Internal Server Error for API route... check if the server supports the requested API version"

This error typically occurs due to:

1. **Docker Desktop not running or crashed**
   - Solution: Restart Docker Desktop
   - Check status: `docker info`

2. **API version mismatch**
   - Solution: Update Docker Desktop to the latest version
   - Or downgrade Docker client if server is older

3. **WSL2 integration issues**
   - Solution: Ensure WSL2 is properly configured
   - In Docker Desktop: Settings → Resources → WSL Integration
   - Enable integration for your WSL distribution

4. **Named pipe connection issues**
   - Solution: Restart Docker Desktop service
   - Or use WSL-based Docker commands instead

### Quick Fixes

```powershell
# 1. Restart Docker Desktop
# Right-click Docker Desktop icon → Restart

# 2. Check Docker status
docker info

# 3. Test Docker connection
docker run hello-world

# 4. If still failing, reset Docker Desktop
# Docker Desktop → Settings → Troubleshoot → Reset to factory defaults
```

### Alternative: Use WSL Directly

Instead of using Docker Desktop, you can install Vault directly in WSL:

```bash
# Open WSL terminal
wsl

# Install Vault using snap
sudo snap install vault

# Or download binary
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Start Vault
vault server -dev -dev-root-token-id="root"
```

### Windows PowerShell Alternative

If Docker/WSL aren't working, you can download Vault binary for Windows:

1. Download from: https://releases.hashicorp.com/vault/
2. Extract to a folder in PATH
3. Run: `vault server -dev -dev-root-token-id="root"`

