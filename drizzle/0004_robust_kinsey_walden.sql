CREATE TABLE `local_demo_sessions` (
	`tokenHash` text PRIMARY KEY NOT NULL,
	`account` text NOT NULL,
	`expiresAt` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `local_demo_session_expiry` ON `local_demo_sessions` (`expiresAt`);