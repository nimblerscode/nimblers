ALTER TABLE `campaign` ADD `messageContent` text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE `campaign` ADD `messageSubject` text;--> statement-breakpoint
ALTER TABLE `campaign` ADD `messageMediaUrls` text;--> statement-breakpoint
ALTER TABLE `campaign` ADD `isLaunching` text DEFAULT 'false' NOT NULL;--> statement-breakpoint
ALTER TABLE `campaign` ADD `launchedAt` integer;--> statement-breakpoint
ALTER TABLE `campaign` ADD `totalCustomers` text DEFAULT '0';--> statement-breakpoint
ALTER TABLE `campaign` ADD `conversationsCreated` text DEFAULT '0';--> statement-breakpoint
ALTER TABLE `campaign` ADD `launchErrors` text;--> statement-breakpoint
ALTER TABLE `campaign` ADD `launchCompletedAt` integer;
