# Pull the official Vault image
docker pull hashicorp/vault:latest
sudo snap install vault
vault --version
vault server -dev -dev-root-token-id="root"   // keep this terminal running

export VAULT_TOKEN="root"
node backend.js
// to test: node testVault.js




*** Not to be done for now
//// For production setup (Not done right now)
vault operator init
vault operator unseal
vault login
vault secrets enable -path=cdms-kms transit
vault write -f cdms-kms/keys/master-kek type=aes256-gcm96

And set environment variables in your backend host:
export VAULT_ADDR="https://vault.myorg.com:8200"
export VAULT_TOKEN="<AppRole or JWT token>"
