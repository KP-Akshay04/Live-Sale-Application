-- AlterTable
ALTER TABLE `line_sale_accounts` ADD COLUMN `contact_no` VARCHAR(20) NULL,
    ADD COLUMN `geographical_location` VARCHAR(255) NULL,
    ADD COLUMN `gstn` VARCHAR(20) NULL,
    ADD COLUMN `state` VARCHAR(100) NULL,
    ADD COLUMN `upi_qr` LONGTEXT NULL;
