CREATE TABLE `anime` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`japanese_title` varchar(255),
	`endpoint` varchar(255) NOT NULL,
	`thumb` text,
	`status` enum('Ongoing','Completed') NOT NULL,
	`score` float,
	`producer` varchar(255),
	`type` varchar(50),
	`studio` varchar(255),
	`duration` varchar(50),
	`release_date` date,
	`available_eps` int DEFAULT 0,
	`total_eps` int,
	`broadcast_day` varchar(20),
	`synopsis` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `anime_id` PRIMARY KEY(`id`),
	CONSTRAINT `anime_endpoint_unique` UNIQUE(`endpoint`)
);
--> statement-breakpoint
CREATE TABLE `anime_genres` (
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`anime_id` int NOT NULL,
	`genre_id` int NOT NULL,
	CONSTRAINT `anime_genres_anime_id_genre_id_pk` PRIMARY KEY(`anime_id`,`genre_id`)
);
--> statement-breakpoint
CREATE TABLE `batch_downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`batch_id` int NOT NULL,
	`provider` varchar(100),
	`resolution` varchar(50),
	`format` varchar(20),
	`url` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `batch_downloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anime_id` int,
	`title` varchar(255),
	`endpoint` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `batches_id` PRIMARY KEY(`id`),
	CONSTRAINT `batches_endpoint_unique` UNIQUE(`endpoint`)
);
--> statement-breakpoint
CREATE TABLE `downloads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`episode_id` int NOT NULL,
	`provider` varchar(100),
	`resolution` varchar(50),
	`format` varchar(20),
	`url` text NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `downloads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `episodes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`anime_id` int NOT NULL,
	`title` varchar(255),
	`episode_number` float,
	`endpoint` varchar(255) NOT NULL,
	`date` datetime,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `episodes_id` PRIMARY KEY(`id`),
	CONSTRAINT `episodes_endpoint_unique` UNIQUE(`endpoint`)
);
--> statement-breakpoint
CREATE TABLE `genres` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `genres_id` PRIMARY KEY(`id`),
	CONSTRAINT `genres_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `streams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`episode_id` int NOT NULL,
	`provider` varchar(100),
	`quality` varchar(50) DEFAULT 'Unknown',
	`url` text,
	`is_default` int DEFAULT 0,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `streams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `anime_genres` ADD CONSTRAINT `anime_genres_anime_id_anime_id_fk` FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `anime_genres` ADD CONSTRAINT `anime_genres_genre_id_genres_id_fk` FOREIGN KEY (`genre_id`) REFERENCES `genres`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `batch_downloads` ADD CONSTRAINT `batch_downloads_batch_id_batches_id_fk` FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `batches` ADD CONSTRAINT `batches_anime_id_anime_id_fk` FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `downloads` ADD CONSTRAINT `downloads_episode_id_episodes_id_fk` FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `episodes` ADD CONSTRAINT `episodes_anime_id_anime_id_fk` FOREIGN KEY (`anime_id`) REFERENCES `anime`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `streams` ADD CONSTRAINT `streams_episode_id_episodes_id_fk` FOREIGN KEY (`episode_id`) REFERENCES `episodes`(`id`) ON DELETE no action ON UPDATE no action;