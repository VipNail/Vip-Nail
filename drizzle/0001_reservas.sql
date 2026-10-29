CREATE TABLE `ajustes_reserva` (
	`id` char(26) NOT NULL,
	`antelacion_min_min` int NOT NULL DEFAULT 120,
	`ventana_max_dias` int NOT NULL DEFAULT 60,
	`limite_cancelacion_horas` int NOT NULL DEFAULT 24,
	`paso_min` int NOT NULL DEFAULT 15,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `ajustes_reserva_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bloqueo` (
	`id` char(26) NOT NULL,
	`staff_id` char(26),
	`inicio` datetime(3) NOT NULL,
	`fin` datetime(3) NOT NULL,
	`motivo` varchar(160) NOT NULL,
	`creado_por` char(26),
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `bloqueo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cita` (
	`id` char(26) NOT NULL,
	`cliente_id` char(26) NOT NULL,
	`staff_id` char(26) NOT NULL,
	`servicio_id` char(26) NOT NULL,
	`inicio` datetime(3) NOT NULL,
	`fin` datetime(3) NOT NULL,
	`margen_min` smallint NOT NULL DEFAULT 0,
	`estado` enum('confirmada','cancelada','no_vino','completada') NOT NULL DEFAULT 'confirmada',
	`origen` enum('web','telefono','presencial') NOT NULL,
	`token_gestion` varchar(64) NOT NULL,
	`recordatorio_enviado_at` datetime(3),
	`notas` text,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `cita_id` PRIMARY KEY(`id`),
	CONSTRAINT `cita_token_gestion_unique` UNIQUE(`token_gestion`)
);
--> statement-breakpoint
CREATE TABLE `horario` (
	`id` char(26) NOT NULL,
	`staff_id` char(26) NOT NULL,
	`dia_semana` tinyint NOT NULL,
	`inicio_min` smallint NOT NULL,
	`fin_min` smallint NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `horario_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `servicio` (
	`id` char(26) NOT NULL,
	`nombre` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`descripcion` text,
	`categoria` varchar(80),
	`duracion_min` smallint NOT NULL,
	`margen_min` smallint NOT NULL DEFAULT 0,
	`visible` boolean NOT NULL DEFAULT true,
	`activo` boolean NOT NULL DEFAULT true,
	`orden` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `servicio_id` PRIMARY KEY(`id`),
	CONSTRAINT `servicio_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `staff_servicio` (
	`id` char(26) NOT NULL,
	`staff_id` char(26) NOT NULL,
	`servicio_id` char(26) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `staff_servicio_id` PRIMARY KEY(`id`),
	CONSTRAINT `staff_servicio_uq` UNIQUE(`staff_id`,`servicio_id`)
);
--> statement-breakpoint
ALTER TABLE `bloqueo` ADD CONSTRAINT `bloqueo_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bloqueo` ADD CONSTRAINT `bloqueo_creado_por_user_id_fk` FOREIGN KEY (`creado_por`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cita` ADD CONSTRAINT `cita_cliente_id_cliente_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `cliente`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cita` ADD CONSTRAINT `cita_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `cita` ADD CONSTRAINT `cita_servicio_id_servicio_id_fk` FOREIGN KEY (`servicio_id`) REFERENCES `servicio`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `horario` ADD CONSTRAINT `horario_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_servicio` ADD CONSTRAINT `staff_servicio_staff_id_staff_id_fk` FOREIGN KEY (`staff_id`) REFERENCES `staff`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `staff_servicio` ADD CONSTRAINT `staff_servicio_servicio_id_servicio_id_fk` FOREIGN KEY (`servicio_id`) REFERENCES `servicio`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bloqueo_rango_idx` ON `bloqueo` (`inicio`,`fin`);--> statement-breakpoint
CREATE INDEX `cita_staff_inicio_idx` ON `cita` (`staff_id`,`inicio`);--> statement-breakpoint
CREATE INDEX `cita_cliente_idx` ON `cita` (`cliente_id`);--> statement-breakpoint
CREATE INDEX `horario_staff_idx` ON `horario` (`staff_id`,`dia_semana`);--> statement-breakpoint
CREATE INDEX `servicio_orden_idx` ON `servicio` (`orden`);