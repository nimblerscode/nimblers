CREATE TABLE `campaign` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`campaignType` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduledAt` integer,
	`timezone` text DEFAULT 'UTC',
	`segmentIds` text,
	`campaignSentAt` integer,
	`estimatedDeliveryTime` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`startedAt` integer,
	`completedAt` integer,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `campaign_conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`campaignId` text NOT NULL,
	`conversationId` text NOT NULL,
	`customerPhone` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`metadata` text,
	FOREIGN KEY (`campaignId`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `campaign_segment` (
	`id` text PRIMARY KEY NOT NULL,
	`campaignId` text NOT NULL,
	`segmentId` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`campaignId`) REFERENCES `campaign`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`segmentId`) REFERENCES `segment`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `segment` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`type` text DEFAULT 'manual' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`shopifySegmentId` text,
	`query` text,
	`conditions` text,
	`lastSyncAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`metadata` text
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_connected_store` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`shopDomain` text NOT NULL,
	`scope` text,
	`status` text DEFAULT 'active' NOT NULL,
	`connectedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`lastSyncAt` integer,
	`metadata` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_connected_store`("id", "type", "shopDomain", "scope", "status", "connectedAt", "lastSyncAt", "metadata", "createdAt") SELECT "id", "type", "shopDomain", "scope", "status", "connectedAt", "lastSyncAt", "metadata", "createdAt" FROM `connected_store`;--> statement-breakpoint
DROP TABLE `connected_store`;--> statement-breakpoint
ALTER TABLE `__new_connected_store` RENAME TO `connected_store`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `connected_store_shopDomain_unique` ON `connected_store` (`shopDomain`);--> statement-breakpoint
ALTER TABLE `organization` ADD `phoneNumber` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `smsFromNumber` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `whatsappFromNumber` text;