CREATE TABLE IF NOT EXISTS `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `openId` text NOT NULL,
  `name` text,
  `email` text,
  `loginMethod` text,
  `role` text DEFAULT 'user' NOT NULL,
  `createdAt` integer NOT NULL,
  `updatedAt` integer NOT NULL,
  `lastSignedIn` integer NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS `users_openId_unique` ON `users` (`openId`);

CREATE TABLE IF NOT EXISTS `meetings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `roomId` text NOT NULL,
  `title` text NOT NULL,
  `hostName` text NOT NULL,
  `hostUserId` integer,
  `hostSecret` text,
  `isActive` integer DEFAULT true NOT NULL,
  `maxParticipants` integer DEFAULT 10 NOT NULL,
  `createdAt` integer NOT NULL,
  `endedAt` integer
);

CREATE UNIQUE INDEX IF NOT EXISTS `meetings_roomId_unique` ON `meetings` (`roomId`);
