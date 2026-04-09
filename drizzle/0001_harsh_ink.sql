CREATE TABLE `meetings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomId` varchar(36) NOT NULL,
	`title` varchar(255) NOT NULL,
	`hostName` varchar(255) NOT NULL,
	`hostUserId` int,
	`isActive` boolean NOT NULL DEFAULT true,
	`maxParticipants` int NOT NULL DEFAULT 10,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`endedAt` timestamp,
	CONSTRAINT `meetings_id` PRIMARY KEY(`id`),
	CONSTRAINT `meetings_roomId_unique` UNIQUE(`roomId`)
);
