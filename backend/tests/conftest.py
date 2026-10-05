"""Throwaway env vars so `import app` works on a fresh checkout."""
import os

from cryptography.fernet import Fernet

for key, value in {
    "DATABASE_URL": "sqlite:///:memory:",
    "GITHUB_CLIENT_ID": "test",
    "GITHUB_CLIENT_SECRET": "test",
    "GITHUB_OAUTH_CALLBACK_URL": "http://localhost/cb",
    "SECRET_KEY": "test-secret-key",
    "INTERNAL_API_SECRET": "test-internal-secret",
}.items():
    os.environ.setdefault(key, value)
os.environ.setdefault("FERNET_KEY", Fernet.generate_key().decode())