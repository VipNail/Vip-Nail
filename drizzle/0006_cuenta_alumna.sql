CREATE TABLE `enlace_cuenta` (
	`id` char(26) NOT NULL,
	`cliente_id` char(26) NOT NULL,
	`token_hash` char(64) NOT NULL,
	`caduca_at` datetime(3) NOT NULL,
	`usado_at` datetime(3),
	`creado_por` char(26),
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `enlace_cuenta_id` PRIMARY KEY(`id`),
	CONSTRAINT `enlace_cuenta_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
ALTER TABLE `enlace_cuenta` ADD CONSTRAINT `enlace_cuenta_cliente_id_cliente_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `cliente`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `enlace_cuenta_cliente_idx` ON `enlace_cuenta` (`cliente_id`);