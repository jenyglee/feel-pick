-- AlterTable
ALTER TABLE `User` ADD COLUMN `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    ADD COLUMN `marketingAgreedAt` DATETIME(3) NULL,
    ADD COLUMN `privacyAgreedAt` DATETIME(3) NULL,
    ADD COLUMN `termsAgreedAt` DATETIME(3) NULL;
