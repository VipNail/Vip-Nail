CREATE TABLE `account` (
	`id` char(26) NOT NULL,
	`account_id` varchar(191) NOT NULL,
	`provider_id` varchar(64) NOT NULL,
	`user_id` char(26) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` timestamp(3),
	`refresh_token_expires_at` timestamp(3),
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` char(26) NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`token` varchar(191) NOT NULL,
	`ip_address` varchar(64),
	`user_agent` text,
	`user_id` char(26) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` char(26) NOT NULL,
	`name` varchar(191) NOT NULL,
	`email` varchar(191) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` char(26) NOT NULL,
	`identifier` varchar(191) NOT NULL,
	`value` text NOT NULL,
	`expires_at` timestamp(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cliente` (
	`id` char(26) NOT NULL,
	`user_id` char(26),
	`nombre` varchar(160) NOT NULL,
	`email` varchar(191),
	`telefono` varchar(32),
	`etiquetas` json,
	`notas` text,
	`factusol_codigo` varchar(32),
	`origen` enum('web','estudio','migracion') NOT NULL DEFAULT 'web',
	`consentimiento_marketing` boolean NOT NULL DEFAULT false,
	`consentimiento_marketing_at` datetime(3),
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `cliente_id` PRIMARY KEY(`id`),
	CONSTRAINT `cliente_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `staff` (
	`id` char(26) NOT NULL,
	`user_id` char(26) NOT NULL,
	`nombre` varchar(120) NOT NULL,
	`color_agenda` varchar(7) NOT NULL DEFAULT '#9CA3AF',
	`activo` boolean NOT NULL DEFAULT true,
	`rol` enum('admin','recepcion','profesional','formadora') NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `staff_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `actividad` (
	`id` char(26) NOT NULL,
	`user_id` char(26),
	`tipo` varchar(64) NOT NULL,
	`descripcion` varchar(255) NOT NULL,
	`datos` json,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `actividad_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cliente` ADD CONSTRAINT `cliente_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff` ADD CONSTRAINT `staff_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `actividad` ADD CONSTRAINT `actividad_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_user_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_user_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `cliente_email_idx` ON `cliente` (`email`);--> statement-breakpoint
CREATE INDEX `cliente_telefono_idx` ON `cliente` (`telefono`);--> statement-breakpoint
CREATE INDEX `cliente_factusol_idx` ON `cliente` (`factusol_codigo`);--> statement-breakpoint
CREATE INDEX `staff_rol_idx` ON `staff` (`rol`);--> statement-breakpoint
CREATE INDEX `actividad_created_idx` ON `actividad` (`created_at`);