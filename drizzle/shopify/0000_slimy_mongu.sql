CREATE TABLE `access_tokens` (
	`shop` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`scope` text NOT NULL,
	`organization_slug` text,
	`token_type` text DEFAULT 'bearer',
	`expires_in` integer,
	`associated_user_scope` text,
	`associated_user_id` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000),
	`updatedAt` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE TABLE `nonces` (
	`nonce` text PRIMARY KEY NOT NULL,
	`expiresAt` integer NOT NULL,
	`consumed` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000),
	`updatedAt` integer DEFAULT (unixepoch() * 1000)
);
