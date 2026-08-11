CREATE TABLE "encrypted_drops" (
	"locator_hash" varchar(64) PRIMARY KEY NOT NULL,
	"ciphertext" "bytea" NOT NULL,
	"nonce" "bytea" NOT NULL,
	"protocol_version" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
