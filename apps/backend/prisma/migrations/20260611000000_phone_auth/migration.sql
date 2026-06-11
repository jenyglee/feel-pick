-- DropIndex
DROP INDEX `User_email_key` ON `User`;

-- AlterTable
ALTER TABLE `User`
    DROP COLUMN `email`,
    DROP COLUMN `passwordHash`,
    ADD COLUMN `phone` VARCHAR(20) NOT NULL,
    ADD COLUMN `birthday` DATE NULL;

-- CreateIndex
CREATE UNIQUE INDEX `User_phone_key` ON `User`(`phone`);

-- CreateTable
CREATE TABLE `PhoneVerification` (
    `id` VARCHAR(36) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `code` VARCHAR(6) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `verified` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PhoneVerification_phone_idx`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
