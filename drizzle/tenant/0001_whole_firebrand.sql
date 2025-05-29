CREATE TABLE `connected_store` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationId` text NOT NULL,
	`type` text NOT NULL,
	`shopDomain` text NOT NULL,
	`scope` text,
	`status` text DEFAULT 'active' NOT NULL,
	`connectedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`lastSyncAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`metadata` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`organizationId`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE cascade
);
