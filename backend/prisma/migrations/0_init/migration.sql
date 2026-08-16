-- CreateTable
CREATE TABLE `roles` (
    `role_id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `roles_code_key`(`code`),
    UNIQUE INDEX `roles_name_key`(`name`),
    PRIMARY KEY (`role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER NOT NULL,
    `depot_id` INTEGER NULL,
    `employee_id` VARCHAR(50) NOT NULL,
    `employee_name` VARCHAR(100) NOT NULL,
    `login_id` VARCHAR(50) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_employee_id_key`(`employee_id`),
    UNIQUE INDEX `users_login_id_key`(`login_id`),
    INDEX `users_role_id_idx`(`role_id`),
    INDEX `users_depot_id_idx`(`depot_id`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `depots` (
    `depot_id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `location` VARCHAR(150) NULL,
    `address` TEXT NULL,
    `phone` VARCHAR(20) NULL,
    `sap_plant_code` VARCHAR(50) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `depots_code_key`(`code`),
    PRIMARY KEY (`depot_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `line_sale_accounts` (
    `line_sale_id` INTEGER NOT NULL AUTO_INCREMENT,
    `party_code` VARCHAR(50) NOT NULL,
    `account_name` VARCHAR(150) NOT NULL,
    `sales_officer_id` INTEGER NOT NULL,
    `price_list_id` INTEGER NULL,
    `vehicle_number` VARCHAR(30) NULL,
    `route_name` VARCHAR(100) NULL,
    `sap_customer_code` VARCHAR(50) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `line_sale_accounts_party_code_key`(`party_code`),
    INDEX `line_sale_accounts_sales_officer_id_idx`(`sales_officer_id`),
    INDEX `line_sale_accounts_price_list_id_idx`(`price_list_id`),
    PRIMARY KEY (`line_sale_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `depot_line_sales` (
    `depot_line_sale_id` INTEGER NOT NULL AUTO_INCREMENT,
    `depot_id` INTEGER NOT NULL,
    `line_sale_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `depot_line_sales_line_sale_id_idx`(`line_sale_id`),
    UNIQUE INDEX `depot_line_sales_depot_id_line_sale_id_key`(`depot_id`, `line_sale_id`),
    PRIMARY KEY (`depot_line_sale_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `line_sale_schemes` (
    `line_sale_scheme_id` INTEGER NOT NULL AUTO_INCREMENT,
    `line_sale_id` INTEGER NOT NULL,
    `scheme_list_id` INTEGER NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `line_sale_schemes_scheme_list_id_idx`(`scheme_list_id`),
    UNIQUE INDEX `line_sale_schemes_line_sale_id_scheme_list_id_key`(`line_sale_id`, `scheme_list_id`),
    PRIMARY KEY (`line_sale_scheme_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `product_id` INTEGER NOT NULL AUTO_INCREMENT,
    `material_code` VARCHAR(50) NOT NULL,
    `description` VARCHAR(200) NOT NULL,
    `additional_name` VARCHAR(200) NULL,
    `category` VARCHAR(100) NULL,
    `base_uom` VARCHAR(20) NOT NULL,
    `base_rate` DECIMAL(14, 2) NOT NULL,
    `hsn_code` VARCHAR(30) NULL,
    `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_material_code_key`(`material_code`),
    PRIMARY KEY (`product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_lists` (
    `price_list_id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'INR',
    `valid_from` DATETIME(3) NULL,
    `valid_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `price_lists_code_key`(`code`),
    PRIMARY KEY (`price_list_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `price_list_items` (
    `price_list_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `price_list_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `rate` DECIMAL(14, 2) NOT NULL,
    `uom` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `price_list_items_product_id_idx`(`product_id`),
    UNIQUE INDEX `price_list_items_price_list_id_product_id_uom_key`(`price_list_id`, `product_id`, `uom`),
    PRIMARY KEY (`price_list_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scheme_lists` (
    `scheme_list_id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `scheme_type` VARCHAR(50) NOT NULL DEFAULT 'QTY_FREE',
    `valid_from` DATETIME(3) NULL,
    `valid_to` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `scheme_lists_code_key`(`code`),
    PRIMARY KEY (`scheme_list_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scheme_list_items` (
    `scheme_list_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `scheme_list_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `min_qty` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `free_qty` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `discount_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    `discount_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `scheme_list_items_scheme_list_id_idx`(`scheme_list_id`),
    INDEX `scheme_list_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`scheme_list_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `freight_rates` (
    `freight_rate_id` INTEGER NOT NULL AUTO_INCREMENT,
    `route_code` VARCHAR(50) NULL,
    `from_location` VARCHAR(100) NOT NULL,
    `to_location` VARCHAR(100) NOT NULL,
    `rate_per_unit` DECIMAL(14, 2) NOT NULL,
    `uom` VARCHAR(20) NOT NULL,
    `effective_date` DATETIME(3) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `freight_rates_route_code_idx`(`route_code`),
    PRIMARY KEY (`freight_rate_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_issues` (
    `goods_issue_id` INTEGER NOT NULL AUTO_INCREMENT,
    `document_id` VARCHAR(50) NOT NULL,
    `depot_id` INTEGER NOT NULL,
    `line_sale_id` INTEGER NOT NULL,
    `vehicle_number` VARCHAR(30) NOT NULL,
    `driver_name` VARCHAR(100) NOT NULL,
    `starting_meter_reading` DECIMAL(10, 2) NULL,
    `closing_meter_reading` DECIMAL(10, 2) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'ISSUED',
    `remarks` TEXT NULL,
    `created_by_id` INTEGER NOT NULL,
    `issue_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sap_document_id` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `goods_issues_document_id_key`(`document_id`),
    INDEX `goods_issues_depot_id_idx`(`depot_id`),
    INDEX `goods_issues_line_sale_id_idx`(`line_sale_id`),
    INDEX `goods_issues_created_by_id_idx`(`created_by_id`),
    INDEX `goods_issues_status_idx`(`status`),
    PRIMARY KEY (`goods_issue_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_issue_items` (
    `goods_issue_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `goods_issue_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `uom` VARCHAR(20) NOT NULL,
    `rate` DECIMAL(14, 2) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `goods_issue_items_goods_issue_id_idx`(`goods_issue_id`),
    INDEX `goods_issue_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`goods_issue_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sales` (
    `sale_id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(50) NOT NULL,
    `line_sale_id` INTEGER NOT NULL,
    `sales_officer_id` INTEGER NOT NULL,
    `customer_name` VARCHAR(150) NOT NULL,
    `customer_phone` VARCHAR(20) NULL,
    `customer_address` TEXT NULL,
    `gross_amount` DECIMAL(14, 2) NOT NULL,
    `discount_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `tax_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(14, 2) NOT NULL,
    `payment_status` VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    `status` VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    `sale_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sap_invoice_id` VARCHAR(50) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `sales_invoice_number_key`(`invoice_number`),
    INDEX `sales_line_sale_id_idx`(`line_sale_id`),
    INDEX `sales_sales_officer_id_idx`(`sales_officer_id`),
    INDEX `sales_sale_date_idx`(`sale_date`),
    PRIMARY KEY (`sale_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sale_items` (
    `sale_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sale_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `free_quantity` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `uom` VARCHAR(20) NOT NULL,
    `rate` DECIMAL(14, 2) NOT NULL,
    `gross_amount` DECIMAL(14, 2) NOT NULL,
    `discount_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `net_amount` DECIMAL(14, 2) NOT NULL,
    `applicable_scheme` VARCHAR(100) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `sale_items_sale_id_idx`(`sale_id`),
    INDEX `sale_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`sale_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `sale_id` INTEGER NOT NULL,
    `payment_reference` VARCHAR(50) NOT NULL,
    `payment_method` VARCHAR(30) NOT NULL,
    `amount` DECIMAL(14, 2) NOT NULL,
    `upi_reference` VARCHAR(100) NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    `payment_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `payments_payment_reference_key`(`payment_reference`),
    INDEX `payments_sale_id_idx`(`sale_id`),
    INDEX `payments_payment_method_idx`(`payment_method`),
    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_returns` (
    `goods_return_id` INTEGER NOT NULL AUTO_INCREMENT,
    `return_document_id` VARCHAR(50) NOT NULL,
    `goods_issue_id` INTEGER NOT NULL,
    `status` VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
    `closing_meter_reading` DECIMAL(10, 2) NULL,
    `total_sold_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `total_collection_cash` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `total_collection_upi` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `shortage_amount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
    `remarks` TEXT NULL,
    `reconciliation_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `goods_returns_return_document_id_key`(`return_document_id`),
    INDEX `goods_returns_goods_issue_id_idx`(`goods_issue_id`),
    PRIMARY KEY (`goods_return_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_return_items` (
    `goods_return_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `goods_return_id` INTEGER NOT NULL,
    `goods_issue_item_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `issued_qty` DECIMAL(14, 3) NOT NULL,
    `sold_qty` DECIMAL(14, 3) NOT NULL,
    `return_qty` DECIMAL(14, 3) NOT NULL,
    `damaged_qty` DECIMAL(14, 3) NOT NULL DEFAULT 0.000,
    `uom` VARCHAR(20) NOT NULL,
    `rate` DECIMAL(14, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `goods_return_items_goods_return_id_idx`(`goods_return_id`),
    INDEX `goods_return_items_goods_issue_item_id_idx`(`goods_issue_item_id`),
    INDEX `goods_return_items_product_id_idx`(`product_id`),
    PRIMARY KEY (`goods_return_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `audit_log_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NULL,
    `action` VARCHAR(50) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(50) NULL,
    `old_values` TEXT NULL,
    `new_values` TEXT NULL,
    `ip_address` VARCHAR(50) NULL,
    `user_agent` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_user_id_idx`(`user_id`),
    INDEX `audit_logs_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `audit_logs_created_at_idx`(`created_at`),
    PRIMARY KEY (`audit_log_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`depot_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `line_sale_accounts` ADD CONSTRAINT `line_sale_accounts_sales_officer_id_fkey` FOREIGN KEY (`sales_officer_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `line_sale_accounts` ADD CONSTRAINT `line_sale_accounts_price_list_id_fkey` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists`(`price_list_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `depot_line_sales` ADD CONSTRAINT `depot_line_sales_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`depot_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `depot_line_sales` ADD CONSTRAINT `depot_line_sales_line_sale_id_fkey` FOREIGN KEY (`line_sale_id`) REFERENCES `line_sale_accounts`(`line_sale_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `line_sale_schemes` ADD CONSTRAINT `line_sale_schemes_line_sale_id_fkey` FOREIGN KEY (`line_sale_id`) REFERENCES `line_sale_accounts`(`line_sale_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `line_sale_schemes` ADD CONSTRAINT `line_sale_schemes_scheme_list_id_fkey` FOREIGN KEY (`scheme_list_id`) REFERENCES `scheme_lists`(`scheme_list_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_list_items` ADD CONSTRAINT `price_list_items_price_list_id_fkey` FOREIGN KEY (`price_list_id`) REFERENCES `price_lists`(`price_list_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `price_list_items` ADD CONSTRAINT `price_list_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheme_list_items` ADD CONSTRAINT `scheme_list_items_scheme_list_id_fkey` FOREIGN KEY (`scheme_list_id`) REFERENCES `scheme_lists`(`scheme_list_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheme_list_items` ADD CONSTRAINT `scheme_list_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_issues` ADD CONSTRAINT `goods_issues_depot_id_fkey` FOREIGN KEY (`depot_id`) REFERENCES `depots`(`depot_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_issues` ADD CONSTRAINT `goods_issues_line_sale_id_fkey` FOREIGN KEY (`line_sale_id`) REFERENCES `line_sale_accounts`(`line_sale_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_issues` ADD CONSTRAINT `goods_issues_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_issue_items` ADD CONSTRAINT `goods_issue_items_goods_issue_id_fkey` FOREIGN KEY (`goods_issue_id`) REFERENCES `goods_issues`(`goods_issue_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_issue_items` ADD CONSTRAINT `goods_issue_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_line_sale_id_fkey` FOREIGN KEY (`line_sale_id`) REFERENCES `line_sale_accounts`(`line_sale_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_sales_officer_id_fkey` FOREIGN KEY (`sales_officer_id`) REFERENCES `users`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sale_items` ADD CONSTRAINT `sale_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_sale_id_fkey` FOREIGN KEY (`sale_id`) REFERENCES `sales`(`sale_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_returns` ADD CONSTRAINT `goods_returns_goods_issue_id_fkey` FOREIGN KEY (`goods_issue_id`) REFERENCES `goods_issues`(`goods_issue_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_return_items` ADD CONSTRAINT `goods_return_items_goods_return_id_fkey` FOREIGN KEY (`goods_return_id`) REFERENCES `goods_returns`(`goods_return_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_return_items` ADD CONSTRAINT `goods_return_items_goods_issue_item_id_fkey` FOREIGN KEY (`goods_issue_item_id`) REFERENCES `goods_issue_items`(`goods_issue_item_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_return_items` ADD CONSTRAINT `goods_return_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE SET NULL ON UPDATE CASCADE;

