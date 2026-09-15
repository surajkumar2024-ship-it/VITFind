CREATE TABLE `audit` (
	`scope` text NOT NULL,
	`id` text NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`reportId` text NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`scope`, `id`)
);
--> statement-breakpoint
CREATE INDEX `audit_scope_date` ON `audit` (`scope`,`createdAt`);--> statement-breakpoint
CREATE TABLE `claims` (
	`scope` text NOT NULL,
	`id` text NOT NULL,
	`reportId` text NOT NULL,
	`claimant` text NOT NULL,
	`proof` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`code` text DEFAULT '' NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`scope`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `claim_once` ON `claims` (`scope`,`reportId`,`claimant`);--> statement-breakpoint
CREATE UNIQUE INDEX `one_approved_claim` ON `claims` (`scope`,`reportId`) WHERE "claims"."status" IN ('approved','completed');--> statement-breakpoint
CREATE INDEX `claims_scope_claimant` ON `claims` (`scope`,`claimant`);--> statement-breakpoint
CREATE TABLE `messages` (
	`scope` text NOT NULL,
	`id` text NOT NULL,
	`claimId` text NOT NULL,
	`sender` text NOT NULL,
	`text` text NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`scope`, `id`)
);
--> statement-breakpoint
CREATE INDEX `messages_thread` ON `messages` (`scope`,`claimId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`scope` text NOT NULL,
	`id` text NOT NULL,
	`recipient` text NOT NULL,
	`text` text NOT NULL,
	`reportId` text NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`scope`, `id`)
);
--> statement-breakpoint
CREATE INDEX `notices_recipient_date` ON `notifications` (`scope`,`recipient`,`createdAt`);--> statement-breakpoint
CREATE TABLE `reports` (
	`scope` text NOT NULL,
	`id` text NOT NULL,
	`owner` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`location` text NOT NULL,
	`color` text NOT NULL,
	`date` text NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`scope`, `id`)
);
--> statement-breakpoint
CREATE INDEX `reports_scope_status_date` ON `reports` (`scope`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reports_scope_owner` ON `reports` (`scope`,`owner`);--> statement-breakpoint
CREATE TABLE `saved` (
	`scope` text NOT NULL,
	`actor` text NOT NULL,
	`reportId` text NOT NULL,
	PRIMARY KEY(`scope`, `actor`, `reportId`)
);
--> statement-breakpoint
CREATE TABLE `spaces` (
	`scope` text PRIMARY KEY NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `uploads` (
	`scope` text NOT NULL,
	`id` text NOT NULL,
	`actor` text NOT NULL,
	`contentType` text NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`scope`, `id`)
);
