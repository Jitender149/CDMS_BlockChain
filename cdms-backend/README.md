# CDMS Backend Setup

## Required Environment Variable

This backend requires a Vault token to run. You must set the `VAULT_TOKEN` environment variable before starting the backend server.

### Windows PowerShell
```pwsh
$env:VAULT_TOKEN="your-token-here"
node backend.js
```

### WSL/Linux
```bash
export VAULT_TOKEN="your-token-here" # in dev mode it is root
node backend.js
```

Replace `your-token-here` with your actual Vault token.

## Troubleshooting
If you see the error:
```
Error: Vault token is required. Set VAULT_TOKEN environment variable or pass vaultToken in config
```
It means the environment variable is missing. Set it as shown above and re-run the backend.
