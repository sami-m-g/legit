// Test environment setup — runs before any test file imports
process.env.BLOB_READ_WRITE_TOKEN = "test-blob-token";
process.env.POSTGRES_URL = "postgres://test:test@localhost/test";
