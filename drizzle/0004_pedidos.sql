CREATE TABLE `contador` (
	`clave` varchar(40) NOT NULL,
	`valor` int NOT NULL DEFAULT 0,
	CONSTRAINT `contador_clave` PRIMARY KEY(`clave`)
);
--> statement-breakpoint
CREATE TABLE `metodo_envio` (
	`id` char(26) NOT NULL,
	`nombre` varchar(120) NOT NULL,
	`tipo` enum('envio','recogida') NOT NULL,
	`descripcion` varchar(255),
	`precio` int NOT NULL DEFAULT 0,
	`gratis_desde` int,
	`activo` boolean NOT NULL DEFAULT true,
	`orden` int NOT NULL DEFAULT 0,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `metodo_envio_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pedido` (
	`id` char(26) NOT NULL,
	`numero` varchar(20) NOT NULL,
	`cliente_id` char(26) NOT NULL,
	`estado` enum('pendiente_pago','pagado','preparando','enviado','cancelado','reembolsado') NOT NULL DEFAULT 'pendiente_pago',
	`nombre` varchar(160) NOT NULL,
	`email` varchar(191) NOT NULL,
	`telefono` varchar(32) NOT NULL,
	`metodo_envio_id` char(26),
	`envio_nombre` varchar(120) NOT NULL,
	`envio_tipo` enum('envio','recogida') NOT NULL,
	`direccion` json,
	`notas` text,
	`subtotal` int NOT NULL,
	`envio` int NOT NULL,
	`total` int NOT NULL,
	`metodo_pago` varchar(20),
	`ref_pasarela` varchar(100),
	`pagado_at` datetime(3),
	`enviado_at` datetime(3),
	`seguimiento` varchar(120),
	`incidencia` varchar(255),
	`token_acceso` varchar(64) NOT NULL,
	`factusol_estado` enum('pendiente','enviado','error'),
	`factusol_at` datetime(3),
	`factusol_error` varchar(255),
	`nota_interna` text,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `pedido_id` PRIMARY KEY(`id`),
	CONSTRAINT `pedido_numero_unique` UNIQUE(`numero`),
	CONSTRAINT `pedido_token_acceso_unique` UNIQUE(`token_acceso`)
);
--> statement-breakpoint
CREATE TABLE `pedido_linea` (
	`id` char(26) NOT NULL,
	`pedido_id` char(26) NOT NULL,
	`producto_id` char(26),
	`referencia` varchar(40) NOT NULL,
	`nombre` varchar(200) NOT NULL,
	`precio` int NOT NULL,
	`precio_original` int NOT NULL,
	`oferta` varchar(120),
	`tipo_iva` tinyint NOT NULL,
	`cantidad` int NOT NULL,
	`created_at` timestamp(3) NOT NULL,
	`updated_at` timestamp(3) NOT NULL,
	CONSTRAINT `pedido_linea_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pedido` ADD CONSTRAINT `pedido_cliente_id_cliente_id_fk` FOREIGN KEY (`cliente_id`) REFERENCES `cliente`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pedido` ADD CONSTRAINT `pedido_metodo_envio_id_metodo_envio_id_fk` FOREIGN KEY (`metodo_envio_id`) REFERENCES `metodo_envio`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pedido_linea` ADD CONSTRAINT `pedido_linea_pedido_id_pedido_id_fk` FOREIGN KEY (`pedido_id`) REFERENCES `pedido`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pedido_linea` ADD CONSTRAINT `pedido_linea_producto_id_producto_id_fk` FOREIGN KEY (`producto_id`) REFERENCES `producto`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pedido_cliente_idx` ON `pedido` (`cliente_id`);--> statement-breakpoint
CREATE INDEX `pedido_estado_idx` ON `pedido` (`estado`,`created_at`);--> statement-breakpoint
CREATE INDEX `pedido_linea_pedido_idx` ON `pedido_linea` (`pedido_id`);