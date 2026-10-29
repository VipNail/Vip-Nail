CREATE TABLE `categoria` (
	`id` char(26) NOT NULL,
	`parent_id` char(26),
	`nombre` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`descripcion` text,
	`orden` int NOT NULL DEFAULT 0,
	`visible` boolean NOT NULL DEFAULT true,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `categoria_id` PRIMARY KEY(`id`),
	CONSTRAINT `categoria_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `marca` (
	`id` char(26) NOT NULL,
	`nombre` varchar(120) NOT NULL,
	`slug` varchar(140) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `marca_id` PRIMARY KEY(`id`),
	CONSTRAINT `marca_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `oferta` (
	`id` char(26) NOT NULL,
	`nombre` varchar(120) NOT NULL,
	`producto_id` char(26),
	`categoria_id` char(26),
	`tipo` enum('porcentaje','importe') NOT NULL,
	`valor` int NOT NULL,
	`inicio` datetime(3) NOT NULL,
	`fin` datetime(3) NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `oferta_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `producto` (
	`id` char(26) NOT NULL,
	`referencia` varchar(40) NOT NULL,
	`ean` varchar(20),
	`factusol_codigo` varchar(32),
	`nombre` varchar(200) NOT NULL,
	`slug` varchar(220) NOT NULL,
	`descripcion` text,
	`categoria_id` char(26),
	`marca_id` char(26),
	`precio` int NOT NULL,
	`tipo_iva` tinyint NOT NULL DEFAULT 21,
	`stock` int NOT NULL DEFAULT 0,
	`activo` boolean NOT NULL DEFAULT true,
	`destacado` boolean NOT NULL DEFAULT false,
	`peso_g` int,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `producto_id` PRIMARY KEY(`id`),
	CONSTRAINT `producto_referencia_unique` UNIQUE(`referencia`),
	CONSTRAINT `producto_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `oferta` ADD CONSTRAINT `oferta_producto_id_producto_id_fk` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `oferta` ADD CONSTRAINT `oferta_categoria_id_categoria_id_fk` FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `producto` ADD CONSTRAINT `producto_categoria_id_categoria_id_fk` FOREIGN KEY (`categoria_id`) REFERENCES `categoria`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `producto` ADD CONSTRAINT `producto_marca_id_marca_id_fk` FOREIGN KEY (`marca_id`) REFERENCES `marca`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `categoria_parent_idx` ON `categoria` (`parent_id`,`orden`);--> statement-breakpoint
CREATE INDEX `oferta_fechas_idx` ON `oferta` (`inicio`,`fin`);--> statement-breakpoint
CREATE INDEX `producto_categoria_idx` ON `producto` (`categoria_id`);--> statement-breakpoint
CREATE INDEX `producto_marca_idx` ON `producto` (`marca_id`);--> statement-breakpoint
CREATE INDEX `producto_nombre_idx` ON `producto` (`nombre`);