PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_access_tokens` (
	`shop` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`scope` text NOT NULL,
	`token_type` text DEFAULT 'bearer',
	`expires_in` integer,
	`associated_user_scope` text,
	`associated_user_id` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000),
	`updatedAt` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
INSERT INTO `__new_access_tokens`("shop", "access_token", "scope", "token_type", "expires_in", "associated_user_scope", "associated_user_id", "createdAt", "updatedAt") SELECT "shop", "access_token", "scope", "token_type", "expires_in", "associated_user_scope", "associated_user_id", "createdAt", "updatedAt" FROM `access_tokens`;--> statement-breakpoint
DROP TABLE `access_tokens`;--> statement-breakpoint
ALTER TABLE `__new_access_tokens` RENAME TO `access_tokens`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_nonces` (
	`nonce` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`consumed` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000),
	`updatedAt` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
INSERT INTO `__new_nonces`("nonce", "expiresAt", "consumed", "createdAt", "updatedAt") SELECT "nonce", "expiresAt", "consumed", "createdAt", "updatedAt" FROM `nonces`;--> statement-breakpoint
DROP TABLE `nonces`;--> statement-breakpoint
ALTER TABLE `__new_nonces` RENAME TO `nonces`;