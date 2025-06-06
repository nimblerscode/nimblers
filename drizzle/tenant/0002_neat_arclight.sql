CREATE TABLE `customer` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`firstName` text,
	`lastName` text,
	`shopifyCustomerId` text,
	`externalCustomerId` text,
	`status` text DEFAULT 'active' NOT NULL,
	`optInSMS` text DEFAULT 'false' NOT NULL,
	`optInEmail` text DEFAULT 'false' NOT NULL,
	`optInWhatsApp` text DEFAULT 'false' NOT NULL,
	`tags` text,
	`totalSpent` text,
	`orderCount` text DEFAULT '0',
	`lastOrderAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`lastSyncAt` integer,
	`metadata` text
);
--> statement-breakpoint
CREATE TABLE `segment_customer` (
	`id` text PRIMARY KEY NOT NULL,
	`segmentId` text NOT NULL,
	`customerId` text NOT NULL,
	`addedBy` text,
	`source` text DEFAULT 'manual' NOT NULL,
	`addedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`qualificationMetadata` text,
	FOREIGN KEY (`segmentId`) REFERENCES `segment`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`customerId`) REFERENCES `customer`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_customer_email` ON `customer` (`email`);
--> statement-breakpoint
CREATE UNIQUE INDEX `unique_segment_customer` ON `segment_customer` (`segmentId`, `customerId`);
