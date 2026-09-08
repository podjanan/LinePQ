CREATE TABLE `barbers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`line_user_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`phone` text NOT NULL,
	`service_id` text NOT NULL,
	`barber_id` text NOT NULL,
	`appointment_date` text NOT NULL,
	`appointment_time` text NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`barber_id`) REFERENCES `barbers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_bookings_barber_slot` ON `bookings` (`barber_id`,`appointment_date`,`appointment_time`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`booking_id` text NOT NULL,
	`amount_satang` integer NOT NULL,
	`slip_object_key` text NOT NULL,
	`trans_ref` text,
	`verification_status` text DEFAULT 'pending' NOT NULL,
	`verified_at` integer,
	FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_booking` ON `payments` (`booking_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_payments_trans_ref` ON `payments` (`trans_ref`);--> statement-breakpoint
CREATE TABLE `services` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`duration_minutes` integer NOT NULL,
	`price_satang` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL
);
