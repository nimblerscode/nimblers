CREATE TABLE `conversation` (
	`id` text PRIMARY KEY NOT NULL,
	`organizationSlug` text NOT NULL,
	`campaignId` text,
	`customerPhone` text NOT NULL,
	`storePhone` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`lastMessageAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `conversation_event` (
	`id` text PRIMARY KEY NOT NULL,
	`eventType` text NOT NULL,
	`description` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `message` (
	`id` text PRIMARY KEY NOT NULL,
	`direction` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`messageType` text,
	`externalMessageId` text,
	`sentAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`deliveredAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`readAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`failedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`failureReason` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`metadata` text
);
