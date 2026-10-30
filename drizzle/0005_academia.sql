CREATE TABLE `acceso_curso` (
	`id` char(26) NOT NULL,
	`cliente_id` char(26) NOT NULL,
	`curso_id` char(26) NOT NULL,
	`origen` enum('compra','migracion','manual') NOT NULL,
	`pedido_id` char(26),
	`desde` datetime(3) NOT NULL,
	`hasta` datetime(3),
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `acceso_curso_id` PRIMARY KEY(`id`),
	CONSTRAINT `acceso_curso_uq` UNIQUE(`cliente_id`,`curso_id`)
);
--> statement-breakpoint
CREATE TABLE `convocatoria` (
	`id` char(26) NOT NULL,
	`curso_id` char(26) NOT NULL,
	`inicio` datetime(3) NOT NULL,
	`fin` datetime(3) NOT NULL,
	`horario` varchar(160),
	`lugar` varchar(160),
	`plazas` int NOT NULL,
	`precio_senal` int,
	`estado` enum('abierta','cerrada','cancelada') NOT NULL DEFAULT 'abierta',
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `convocatoria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `curso` (
	`id` char(26) NOT NULL,
	`tipo` enum('online','presencial') NOT NULL,
	`titulo` varchar(160) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`resumen` varchar(300),
	`descripcion` text,
	`precio` int NOT NULL,
	`tipo_iva` tinyint NOT NULL DEFAULT 21,
	`nivel` varchar(60),
	`duracion` varchar(60),
	`visible` boolean NOT NULL DEFAULT true,
	`orden` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `curso_id` PRIMARY KEY(`id`),
	CONSTRAINT `curso_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `leccion` (
	`id` char(26) NOT NULL,
	`curso_id` char(26) NOT NULL,
	`modulo` varchar(120),
	`titulo` varchar(160) NOT NULL,
	`orden` int NOT NULL DEFAULT 0,
	`vimeo_id` varchar(20),
	`vimeo_hash` varchar(40),
	`duracion_min` smallint,
	`descripcion` text,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `leccion_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plaza` (
	`id` char(26) NOT NULL,
	`convocatoria_id` char(26) NOT NULL,
	`cliente_id` char(26) NOT NULL,
	`estado` enum('reservada_pendiente','senal_pagada','pagada','cancelada') NOT NULL DEFAULT 'reservada_pendiente',
	`modalidad` enum('senal','total') NOT NULL,
	`pedido_id` char(26),
	`importe_pagado` int NOT NULL DEFAULT 0,
	`caduca_at` datetime(3),
	`notas` varchar(255),
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `plaza_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `progreso` (
	`id` char(26) NOT NULL,
	`cliente_id` char(26) NOT NULL,
	`leccion_id` char(26) NOT NULL,
	`completada_at` datetime(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `progreso_id` PRIMARY KEY(`id`),
	CONSTRAINT `progreso_uq` UNIQUE(`cliente_id`,`leccion_id`)
);
--> statement-breakpoint
ALTER TABLE `pedido` MODIFY COLUMN `envio_tipo` enum('envio','recogida','sin_envio') NOT NULL;--> statement-breakpoint
ALTER TABLE `pedido_linea` ADD `tipo` enum('producto','curso','plaza') DEFAULT 'producto' NOT NULL;--> statement-breakpoint
ALTER TABLE `pedido_linea` ADD `curso_id` char(26);--> statement-breakpoint
ALTER TABLE `acceso_curso` ADD CONSTRAINT `acceso_curso_cliente_id_cliente_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `cliente`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `acceso_curso` ADD CONSTRAINT `acceso_curso_curso_id_curso_id_fk` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `convocatoria` ADD CONSTRAINT `convocatoria_curso_id_curso_id_fk` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leccion` ADD CONSTRAINT `leccion_curso_id_curso_id_fk` FOREIGN KEY (`curso_id`) REFERENCES `curso`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza` ADD CONSTRAINT `plaza_convocatoria_id_convocatoria_id_fk` FOREIGN KEY (`convocatoria_id`) REFERENCES `convocatoria`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plaza` ADD CONSTRAINT `plaza_cliente_id_cliente_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `cliente`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progreso` ADD CONSTRAINT `progreso_cliente_id_cliente_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `cliente`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `progreso` ADD CONSTRAINT `progreso_leccion_id_leccion_id_fk` FOREIGN KEY (`leccion_id`) REFERENCES `leccion`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `convocatoria_curso_idx` ON `convocatoria` (`curso_id`,`inicio`);--> statement-breakpoint
CREATE INDEX `curso_tipo_idx` ON `curso` (`tipo`,`orden`);--> statement-breakpoint
CREATE INDEX `leccion_curso_idx` ON `leccion` (`curso_id`,`orden`);--> statement-breakpoint
CREATE INDEX `plaza_convocatoria_idx` ON `plaza` (`convocatoria_id`);--> statement-breakpoint
CREATE INDEX `plaza_cliente_idx` ON `plaza` (`cliente_id`);