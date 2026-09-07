import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { cmsMedia } from "./cms-media";
import { users } from "./users";

export const ECOMMERCE_PRODUCT_STATUSES = ["draft", "published"] as const;
export const ECOMMERCE_VARIANT_STATUSES = ["active", "inactive", "archived"] as const;
export const ECOMMERCE_INVENTORY_ADJUSTMENT_REASONS = [
  "manual",
  "order_paid",
  "restock",
  "correction",
  "return",
] as const;
export const ECOMMERCE_ORDER_STATUSES = [
  "pending",
  "paid",
  "shipped",
  "delivered",
  "cancelled",
] as const;
export const ECOMMERCE_PAYMENT_STATUSES = [
  "unpaid",
  "pending_payment",
  "paid",
  "refund_pending",
  "partially_refunded",
  "refunded",
  "refund_failed",
] as const;
export const ECOMMERCE_PAYMENT_REQUEST_STATUSES = [
  "draft",
  "open",
  "paid",
  "expired",
  "cancelled",
] as const;
export const ECOMMERCE_FRAUD_RISK_LEVELS = ["low", "medium", "high"] as const;
export const ECOMMERCE_FRAUD_DECISIONS = [
  "allow",
  "allow_with_alert",
  "manual_review",
  "block",
] as const;
export const ECOMMERCE_FRAUD_REVIEW_STATUSES = [
  "not_required",
  "pending",
  "approved",
  "rejected",
] as const;
export const ECOMMERCE_FRAUD_EVENT_TYPES = [
  "checkout_screened",
  "checkout_blocked",
  "checkout_review",
  "checkout_allowed",
  "stripe_risk_update",
  "admin_review",
] as const;
export const ECOMMERCE_FRAUD_BLOCK_TYPES = ["ip", "email", "address"] as const;
export const ECOMMERCE_COUPON_TYPES = ["percentage", "fixed", "freeShipping"] as const;
export const ECOMMERCE_COUPON_STATUSES = [
  "active",
  "inactive",
  "scheduled",
  "expired",
  "exhausted",
  "archived",
] as const;
export const ECOMMERCE_REFUND_STATUSES = ["pending", "processed", "rejected", "failed"] as const;
export const ECOMMERCE_REFUND_TYPES = ["full", "partial"] as const;
export const ECOMMERCE_NOTIFICATION_JOB_TYPES = ["order_confirmation"] as const;
export const ECOMMERCE_NOTIFICATION_JOB_STATUSES = [
  "queued",
  "processing",
  "sent",
  "failed",
] as const;
export const ECOMMERCE_SHIPPING_PROVIDER_TYPES = [
  "direct_carrier",
  "aggregator",
  "workflow",
  "marketplace",
] as const;
export const ECOMMERCE_FULFILLMENT_LOCATION_TYPES = [
  "merchant",
  "warehouse",
  "store",
  "third_party_logistics",
] as const;
export const ECOMMERCE_FULFILLMENT_STATUSES = [
  "pending",
  "ready",
  "in_progress",
  "fulfilled",
  "partially_fulfilled",
  "cancelled",
] as const;

export const ecommerceProducts = pgTable(
  "ecommerce_products",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    tagline: text("tagline"),
    description: text("description"),
    shortDescription: text("short_description"),
    productType: text("product_type"),
    vendor: text("vendor"),
    price: integer("price").notNull(),
    compareAtPrice: integer("compare_at_price"),
    costPerItem: integer("cost_per_item"),
    taxable: boolean("taxable").notNull().default(true),
    taxCategory: text("tax_category"),
    featured: boolean("featured").notNull().default(false),
    visibility: text("visibility").notNull().default("online"),
    publishedAt: timestamp("published_at"),
    archivedAt: timestamp("archived_at"),
    primaryImage: text("primary_image"),
    secondaryImages: text("secondary_images")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    features: text("features")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    included: text("included")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    active: boolean("active").notNull().default(true),
    status: text("status").notNull().default("draft"),
    sku: text("sku"),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    salePrice: integer("sale_price"),
    discountType: text("discount_type").notNull().default("NONE"),
    discountValue: integer("discount_value"),
    saleStartAt: timestamp("sale_start_at"),
    saleEndAt: timestamp("sale_end_at"),
    metaTitle: text("meta_title"),
    metaDescription: text("meta_description"),
    metaKeywords: text("meta_keywords"),
    urlSlug: text("url_slug").notNull(),
    canonicalUrl: text("canonical_url"),
    robotsIndex: boolean("robots_index").notNull().default(true),
    robotsFollow: boolean("robots_follow").notNull().default(true),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImage: text("og_image"),
    physicalProduct: boolean("physical_product").notNull().default(true),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    weight: integer("weight"),
    weightUnit: text("weight_unit").notNull().default("oz"),
    length: integer("length"),
    width: integer("width"),
    height: integer("height"),
    dimensionUnit: text("dimension_unit").notNull().default("in"),
    shippingProfile: text("shipping_profile"),
    fulfillmentType: text("fulfillment_type").notNull().default("merchant"),
    relatedProductIds: text("related_product_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    upsellProductIds: text("upsell_product_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    badgeText: text("badge_text"),
    mediaId: varchar("media_id").references(() => cmsMedia.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_products_url_slug").on(table.urlSlug),
    index("idx_ecommerce_products_status_active").on(table.status, table.active),
    index("idx_ecommerce_products_featured").on(table.featured),
    index("idx_ecommerce_products_vendor").on(table.vendor),
    index("idx_ecommerce_products_storefront").on(
      table.visibility,
      table.status,
      table.active,
      table.publishedAt,
    ),
    index("idx_ecommerce_products_published_at").on(table.publishedAt),
  ],
);

export const ecommerceProductOptions = pgTable(
  "ecommerce_product_options",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: varchar("product_id")
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_product_options_product").on(table.productId),
    uniqueIndex("idx_ecommerce_product_options_unique").on(table.productId, table.name),
  ],
);

export const ecommerceProductOptionValues = pgTable(
  "ecommerce_product_option_values",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    optionId: varchar("option_id")
      .notNull()
      .references(() => ecommerceProductOptions.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_option_values_option").on(table.optionId),
    uniqueIndex("idx_ecommerce_option_values_unique").on(table.optionId, table.value),
  ],
);

export const ecommerceProductVariants = pgTable(
  "ecommerce_product_variants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: varchar("product_id")
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Default"),
    optionSignature: text("option_signature").notNull().default("default"),
    optionValues: jsonb("option_values")
      .$type<Record<string, string>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    sku: text("sku"),
    barcode: text("barcode"),
    price: integer("price"),
    salePrice: integer("sale_price"),
    compareAtPrice: integer("compare_at_price"),
    costPerItem: integer("cost_per_item"),
    inventoryQuantity: integer("inventory_quantity").notNull().default(0),
    trackInventory: boolean("track_inventory").notNull().default(false),
    lowStockThreshold: integer("low_stock_threshold"),
    allowBackorder: boolean("allow_backorder").notNull().default(false),
    weight: integer("weight"),
    weightUnit: text("weight_unit").notNull().default("oz"),
    image: text("image"),
    status: text("status").notNull().default("active"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_variants_product").on(table.productId),
    uniqueIndex("idx_ecommerce_variants_option_signature").on(
      table.productId,
      table.optionSignature,
    ),
    uniqueIndex("idx_ecommerce_variants_sku").on(table.sku),
    index("idx_ecommerce_variants_active").on(table.active, table.status),
  ],
);

export const ecommerceProductMedia = pgTable(
  "ecommerce_product_media",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: varchar("product_id")
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: "cascade" }),
    variantId: varchar("variant_id").references(() => ecommerceProductVariants.id, {
      onDelete: "set null",
    }),
    mediaId: varchar("media_id").references(() => cmsMedia.id, { onDelete: "set null" }),
    url: text("url").notNull(),
    type: text("type").notNull().default("image"),
    altText: text("alt_text"),
    sortOrder: integer("sort_order").notNull().default(0),
    primary: boolean("primary").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_product_media_product").on(table.productId),
    index("idx_ecommerce_product_media_variant").on(table.variantId),
  ],
);

export const ecommerceProductCollections = pgTable(
  "ecommerce_product_collections",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    image: text("image"),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_collections_slug").on(table.slug),
    index("idx_ecommerce_collections_active").on(table.active),
  ],
);

export const ecommerceProductCollectionAssignments = pgTable(
  "ecommerce_product_collection_assignments",
  {
    productId: varchar("product_id")
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: "cascade" }),
    collectionId: varchar("collection_id")
      .notNull()
      .references(() => ecommerceProductCollections.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_collection_assignments_unique").on(
      table.productId,
      table.collectionId,
    ),
    index("idx_ecommerce_collection_assignments_collection").on(table.collectionId),
  ],
);

export const ecommerceInventoryAdjustments = pgTable(
  "ecommerce_inventory_adjustments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    productId: varchar("product_id")
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: "cascade" }),
    variantId: varchar("variant_id")
      .notNull()
      .references(() => ecommerceProductVariants.id, { onDelete: "cascade" }),
    orderId: varchar("order_id").references(() => ecommerceOrders.id, { onDelete: "set null" }),
    delta: integer("delta").notNull(),
    quantityAfter: integer("quantity_after").notNull(),
    reason: text("reason").notNull().default("manual"),
    note: text("note"),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_inventory_adjustments_variant").on(table.variantId),
    index("idx_ecommerce_inventory_adjustments_order").on(table.orderId),
    index("idx_ecommerce_inventory_adjustments_order_variant_reason").on(
      table.orderId,
      table.variantId,
      table.reason,
    ),
    uniqueIndex("idx_ecommerce_inventory_adjustments_paid_order_effect")
      .on(table.orderId, table.variantId)
      .where(sql`${table.orderId} IS NOT NULL AND ${table.reason} = 'order_paid'`),
  ],
);

export const ecommerceCategories = pgTable(
  "ecommerce_categories",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    parentId: varchar("parent_id"),
    image: text("image"),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_categories_slug").on(table.slug),
    index("idx_ecommerce_categories_active").on(table.active),
    index("idx_ecommerce_categories_parent_sort").on(table.parentId, table.sortOrder),
  ],
);

export const ecommerceProductCategories = pgTable(
  "ecommerce_product_categories",
  {
    productId: varchar("product_id")
      .notNull()
      .references(() => ecommerceProducts.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id")
      .notNull()
      .references(() => ecommerceCategories.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_product_categories_unique").on(table.productId, table.categoryId),
    index("idx_ecommerce_product_categories_category").on(table.categoryId),
  ],
);

export const ecommerceCustomers = pgTable(
  "ecommerce_customers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    phone: text("phone"),
    address: text("address"),
    line2: text("line2"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    country: text("country").default("US"),
    avatarUrl: text("avatar_url"),
    isDisabled: boolean("is_disabled").notNull().default(false),
    marketingEmailOptIn: boolean("marketing_email_opt_in").notNull().default(false),
    orderSmsOptIn: boolean("order_sms_opt_in").notNull().default(false),
    passwordHash: text("password_hash"),
    sessionInvalidatedAt: timestamp("session_invalidated_at"),
    mergedIntoCustomerId: varchar("merged_into_customer_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_customers_email").on(table.email),
    index("idx_ecommerce_customers_user_id").on(table.userId),
  ],
);

export const ecommerceCustomerAddresses = pgTable(
  "ecommerce_customer_addresses",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    customerId: varchar("customer_id")
      .notNull()
      .references(() => ecommerceCustomers.id, { onDelete: "cascade" }),
    label: text("label").notNull().default("Home"),
    name: text("name"),
    company: text("company"),
    phone: text("phone"),
    address: text("address").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zipCode: text("zip_code").notNull(),
    country: text("country").notNull().default("US"),
    isDefault: boolean("is_default").notNull().default(false),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_customer_addresses_customer").on(table.customerId),
    index("idx_ecommerce_customer_addresses_default").on(table.customerId, table.isDefault),
  ],
);

export const ecommerceOrders = pgTable(
  "ecommerce_orders",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    customerId: varchar("customer_id")
      .notNull()
      .references(() => ecommerceCustomers.id),
    status: text("status").notNull().default("pending"),
    paymentStatus: text("payment_status").notNull().default("unpaid"),
    totalAmount: integer("total_amount").notNull(),
    subtotalAmount: integer("subtotal_amount").notNull().default(0),
    taxAmount: integer("tax_amount").notNull().default(0),
    shippingAmount: integer("shipping_amount").notNull().default(0),
    discountAmount: integer("discount_amount").notNull().default(0),
    couponSnapshot: jsonb("coupon_snapshot").$type<Record<string, unknown> | null>(),
    stripeTaxCalculationId: text("stripe_tax_calculation_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeSessionId: text("stripe_session_id"),
    couponCode: text("coupon_code"),
    isManualOrder: boolean("is_manual_order").notNull().default(false),
    manualPaymentMethod: text("manual_payment_method"),
    manualPaymentReference: text("manual_payment_reference"),
    manualPaymentMarkedBy: varchar("manual_payment_marked_by").references(() => users.id, {
      onDelete: "set null",
    }),
    manualPaymentMarkedAt: timestamp("manual_payment_marked_at"),
    fulfillmentMode: text("fulfillment_mode").notNull().default("shipping"),
    notes: text("notes"),
    customerIp: text("customer_ip"),
    shippingName: text("shipping_name"),
    shippingCompany: text("shipping_company"),
    shippingAddress: text("shipping_address"),
    shippingLine2: text("shipping_line2"),
    shippingCity: text("shipping_city"),
    shippingState: text("shipping_state"),
    shippingZip: text("shipping_zip"),
    shippingCountry: text("shipping_country").default("US"),
    billingSameAsShipping: boolean("billing_same_as_shipping").notNull().default(true),
    billingName: text("billing_name"),
    billingCompany: text("billing_company"),
    billingAddress: text("billing_address"),
    billingLine2: text("billing_line2"),
    billingCity: text("billing_city"),
    billingState: text("billing_state"),
    billingZip: text("billing_zip"),
    billingCountry: text("billing_country").default("US"),
    marketingConsentGranted: boolean("marketing_consent_granted").notNull().default(false),
    metaFbp: text("meta_fbp"),
    metaFbc: text("meta_fbc"),
    metaEventSourceUrl: text("meta_event_source_url"),
    customerUserAgent: text("customer_user_agent"),
    fraudScore: integer("fraud_score").notNull().default(0),
    fraudRiskLevel: text("fraud_risk_level").notNull().default("low"),
    fraudDecision: text("fraud_decision").notNull().default("allow"),
    fraudReviewStatus: text("fraud_review_status").notNull().default("not_required"),
    fraudSignals: jsonb("fraud_signals")
      .$type<Array<Record<string, unknown>>>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    stripeRiskLevel: text("stripe_risk_level"),
    stripeRiskScore: integer("stripe_risk_score"),
    stripeOutcomeType: text("stripe_outcome_type"),
    stripeOutcomeReason: text("stripe_outcome_reason"),
    stripeCvcCheck: text("stripe_cvc_check"),
    stripeAddressLine1Check: text("stripe_address_line1_check"),
    stripeAddressPostalCodeCheck: text("stripe_address_postal_code_check"),
    lookupToken: text("lookup_token")
      .notNull()
      .default(sql`encode(gen_random_bytes(18), 'hex')`),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_orders_customer_id").on(table.customerId),
    index("idx_ecommerce_orders_status").on(table.status),
    index("idx_ecommerce_orders_payment_status").on(table.paymentStatus),
    index("idx_ecommerce_orders_created_at").on(table.createdAt),
    index("idx_ecommerce_orders_status_created").on(table.status, table.createdAt),
    index("idx_ecommerce_orders_payment_created").on(table.paymentStatus, table.createdAt),
    index("idx_ecommerce_orders_fraud_review").on(table.fraudReviewStatus, table.createdAt),
    index("idx_ecommerce_orders_fraud_level").on(table.fraudRiskLevel, table.createdAt),
    uniqueIndex("idx_ecommerce_orders_lookup_token").on(table.lookupToken),
    uniqueIndex("idx_ecommerce_orders_payment_intent").on(table.stripePaymentIntentId),
  ],
);

export const ecommerceCheckoutRequests = pgTable(
  "ecommerce_checkout_requests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    requestKey: varchar("request_key", { length: 128 }).notNull(),
    customerEmail: text("customer_email").notNull(),
    status: text("status").notNull().default("processing"),
    orderId: varchar("order_id").references(() => ecommerceOrders.id, { onDelete: "set null" }),
    failureCode: text("failure_code"),
    completedAt: timestamp("completed_at"),
    failedAt: timestamp("failed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_checkout_requests_key").on(table.requestKey),
    uniqueIndex("idx_ecommerce_checkout_requests_order").on(table.orderId),
  ],
);

/**
 * Short-lived stock holds for checkout payment intents. A reservation is
 * released by paid/cancelled settlement. Expiry schedules payment cancellation;
 * capacity remains protected until that cancellation is confirmed.
 */
export const ecommerceInventoryReservations = pgTable(
  "ecommerce_inventory_reservations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => ecommerceOrders.id, { onDelete: "cascade" }),
    variantId: varchar("variant_id")
      .notNull()
      .references(() => ecommerceProductVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    releasedAt: timestamp("released_at"),
    releaseReason: varchar("release_reason", { length: 40 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_inventory_reservations_order_variant").on(
      table.orderId,
      table.variantId,
    ),
    index("idx_ecommerce_inventory_reservations_variant_expiry").on(
      table.variantId,
      table.expiresAt,
    ),
    index("idx_ecommerce_inventory_reservations_order").on(table.orderId),
  ],
);

/**
 * Transactional outbox for payment-adjacent notifications. Payloads carry only
 * stable internal identifiers; a worker reloads current order details at send time.
 */
export const ecommerceNotificationJobs = pgTable(
  "ecommerce_notification_jobs",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: text("type").notNull(),
    status: text("status").notNull().default("queued"),
    orderId: varchar("order_id")
      .notNull()
      .references(() => ecommerceOrders.id, { onDelete: "cascade" }),
    refundId: varchar("refund_id").references(() => ecommerceRefunds.id, {
      onDelete: "cascade",
    }),
    shipmentId: varchar("shipment_id").references(() => ecommerceShipments.id, {
      onDelete: "cascade",
    }),
    statusValue: text("status_value"),
    deduplicationKey: varchar("deduplication_key", { length: 200 }).notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    processingToken: varchar("processing_token"),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    lastErrorCode: varchar("last_error_code", { length: 120 }),
    manualRetryCount: integer("manual_retry_count").notNull().default(0),
    lastManualRetryAt: timestamp("last_manual_retry_at", { withTimezone: true }),
    lastManualRetryBy: varchar("last_manual_retry_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_notification_jobs_deduplication").on(table.deduplicationKey),
    index("idx_ecommerce_notification_jobs_ready").on(
      table.status,
      table.nextAttemptAt,
      table.createdAt,
    ),
    index("idx_ecommerce_notification_jobs_order").on(table.orderId),
    index("idx_ecommerce_notification_jobs_refund").on(table.refundId),
    index("idx_ecommerce_notification_jobs_shipment").on(table.shipmentId),
  ],
);

export const ecommerceOrderItems = pgTable(
  "ecommerce_order_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => ecommerceOrders.id, { onDelete: "cascade" }),
    productId: varchar("product_id")
      .notNull()
      .references(() => ecommerceProducts.id),
    variantId: varchar("variant_id").references(() => ecommerceProductVariants.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    variantTitle: text("variant_title"),
    sku: text("sku"),
    optionsSnapshot: jsonb("options_snapshot").$type<Record<string, string> | null>(),
    productSlug: text("product_slug"),
    image: text("image"),
    productSnapshot: jsonb("product_snapshot").$type<Record<string, unknown> | null>(),
    taxable: boolean("taxable").notNull().default(true),
    taxCategory: text("tax_category"),
    taxAmount: integer("tax_amount").notNull().default(0),
    requiresShipping: boolean("requires_shipping").notNull().default(true),
    fulfillmentType: text("fulfillment_type"),
    quantity: integer("quantity").notNull(),
    unitPrice: integer("unit_price").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (table) => [
    index("idx_ecommerce_order_items_order").on(table.orderId),
    index("idx_ecommerce_order_items_product").on(table.productId),
    index("idx_ecommerce_order_items_variant").on(table.variantId),
  ],
);

export const ecommerceOrderNotes = pgTable(
  "ecommerce_order_notes",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => ecommerceOrders.id, { onDelete: "cascade" }),
    authorId: varchar("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_order_notes_order").on(table.orderId),
    index("idx_ecommerce_order_notes_created").on(table.createdAt),
  ],
);

export const ecommerceFraudEvents = pgTable(
  "ecommerce_fraud_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id").references(() => ecommerceOrders.id, { onDelete: "set null" }),
    customerId: varchar("customer_id").references(() => ecommerceCustomers.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    decision: text("decision").notNull(),
    riskLevel: text("risk_level").notNull(),
    score: integer("score").notNull().default(0),
    email: text("email"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    amount: integer("amount"),
    currency: text("currency").notNull().default("usd"),
    matchedRules: jsonb("matched_rules")
      .$type<Array<Record<string, unknown>>>()
      .default(sql`'[]'::jsonb`)
      .notNull(),
    requestSnapshot: jsonb("request_snapshot")
      .$type<Record<string, unknown> | null>()
      .default(sql`'{}'::jsonb`),
    message: text("message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_fraud_events_order").on(table.orderId),
    index("idx_ecommerce_fraud_events_customer").on(table.customerId),
    index("idx_ecommerce_fraud_events_created").on(table.createdAt),
    index("idx_ecommerce_fraud_events_decision").on(table.decision, table.createdAt),
    index("idx_ecommerce_fraud_events_ip").on(table.ipAddress, table.createdAt),
    index("idx_ecommerce_fraud_events_email").on(table.email, table.createdAt),
  ],
);

export const ecommerceFraudBlocks = pgTable(
  "ecommerce_fraud_blocks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    type: text("type").notNull(),
    value: text("value").notNull(),
    reason: text("reason").notNull(),
    active: boolean("active").notNull().default(true),
    expiresAt: timestamp("expires_at"),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_fraud_blocks_lookup").on(table.type, table.value, table.active),
    index("idx_ecommerce_fraud_blocks_expires").on(table.expiresAt),
  ],
);

export const ecommercePaymentRequests = pgTable(
  "ecommerce_payment_requests",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id").references(() => ecommerceOrders.id, { onDelete: "set null" }),
    customerId: varchar("customer_id").references(() => ecommerceCustomers.id, {
      onDelete: "set null",
    }),
    customerEmail: text("customer_email").notNull(),
    customerName: text("customer_name"),
    title: text("title").notNull(),
    description: text("description"),
    amount: integer("amount").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: text("status").notNull().default("draft"),
    reason: text("reason").notNull(),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    paymentUrl: text("payment_url"),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at"),
    expiresAt: timestamp("expires_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_payment_requests_order").on(table.orderId),
    index("idx_ecommerce_payment_requests_customer").on(table.customerId),
    index("idx_ecommerce_payment_requests_status").on(table.status),
    uniqueIndex("idx_ecommerce_payment_requests_session").on(table.stripeSessionId),
  ],
);

export const ecommerceCoupons = pgTable(
  "ecommerce_coupons",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    code: text("code").notNull(),
    name: text("name"),
    description: text("description"),
    notes: text("notes"),
    type: text("type").notNull().default("fixed"),
    value: integer("value").notNull().default(0),
    minOrderAmount: integer("min_order_amount"),
    maxDiscountAmount: integer("max_discount_amount"),
    maxRedemptions: integer("max_redemptions"),
    perCustomerLimit: integer("per_customer_limit"),
    timesUsed: integer("times_used").notNull().default(0),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    active: boolean("active").notNull().default(true),
    customerEligibility: text("customer_eligibility").notNull().default("all"),
    eligibleCustomerEmails: text("eligible_customer_emails")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    eligibleProductIds: text("eligible_product_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    eligibleCategoryIds: text("eligible_category_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    excludedProductIds: text("excluded_product_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    excludedCategoryIds: text("excluded_category_ids")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    allowStacking: boolean("allow_stacking").notNull().default(false),
    appliesTo: text("applies_to").notNull().default("subtotal"),
    applyBeforeTax: boolean("apply_before_tax").notNull().default(true),
    archivedAt: timestamp("archived_at"),
    createdBy: varchar("created_by").references(() => users.id, { onDelete: "set null" }),
    updatedBy: varchar("updated_by").references(() => users.id, { onDelete: "set null" }),
    blockAffiliateCommission: boolean("block_affiliate_commission").notNull().default(false),
    blockVipDiscount: boolean("block_vip_discount").notNull().default(false),
    minMarginPercent: integer("min_margin_percent"),
    autoExpireAt: timestamp("auto_expire_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_coupons_code").on(table.code),
    index("idx_ecommerce_coupons_active").on(table.active),
    index("idx_ecommerce_coupons_archived").on(table.archivedAt),
    index("idx_ecommerce_coupons_dates").on(table.startDate, table.endDate),
  ],
);

export const ecommerceCouponRedemptions = pgTable(
  "ecommerce_coupon_redemptions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    couponId: varchar("coupon_id")
      .notNull()
      .references(() => ecommerceCoupons.id),
    orderId: varchar("order_id")
      .notNull()
      .references(() => ecommerceOrders.id),
    customerId: varchar("customer_id").references(() => ecommerceCustomers.id),
    couponCode: text("coupon_code"),
    customerEmail: text("customer_email"),
    discountAmount: integer("discount_amount").notNull(),
    redeemedAt: timestamp("redeemed_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_coupon_redemptions_coupon").on(table.couponId),
    index("idx_ecommerce_coupon_redemptions_order").on(table.orderId),
    index("idx_ecommerce_coupon_redemptions_customer").on(table.customerId),
  ],
);

export const ecommerceRefunds = pgTable(
  "ecommerce_refunds",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => ecommerceOrders.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason"),
    reasonCode: text("reason_code"),
    type: text("type").notNull().default("partial"),
    source: text("source").notNull().default("manual"),
    stripeRefundId: text("stripe_refund_id"),
    status: text("status").notNull().default("pending"),
    processedBy: varchar("processed_by").references(() => users.id, { onDelete: "set null" }),
    processedAt: timestamp("processed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_refunds_order").on(table.orderId),
    index("idx_ecommerce_refunds_status").on(table.status),
    uniqueIndex("idx_ecommerce_refunds_stripe_refund").on(table.stripeRefundId),
  ],
);

export const ecommerceShippingZones = pgTable(
  "ecommerce_shipping_zones",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    countries: text("countries")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    states: text("states")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("idx_ecommerce_shipping_zones_active").on(table.active)],
);

export const ecommerceShippingRates = pgTable(
  "ecommerce_shipping_rates",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    zoneId: varchar("zone_id")
      .notNull()
      .references(() => ecommerceShippingZones.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    amount: integer("amount").notNull().default(0),
    minOrderAmount: integer("min_order_amount"),
    maxOrderAmount: integer("max_order_amount"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_shipping_rates_zone").on(table.zoneId),
    index("idx_ecommerce_shipping_rates_active").on(table.active),
    index("idx_ecommerce_shipping_rates_zone_active_amount").on(
      table.zoneId,
      table.active,
      table.amount,
    ),
  ],
);

export const ecommerceShipments = pgTable(
  "ecommerce_shipments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => ecommerceOrders.id, { onDelete: "cascade" }),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    status: text("status").notNull().default("shipped"),
    shippedBy: varchar("shipped_by").references(() => users.id, { onDelete: "set null" }),
    shippedAt: timestamp("shipped_at").notNull().defaultNow(),
    emailSentAt: timestamp("email_sent_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_shipments_order").on(table.orderId),
    index("idx_ecommerce_shipments_tracking").on(table.trackingNumber),
  ],
);

export const ecommerceFulfillmentLocations = pgTable(
  "ecommerce_fulfillment_locations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    code: text("code"),
    type: text("type").notNull().default("merchant"),
    phone: text("phone"),
    email: text("email"),
    address: text("address"),
    line2: text("line2"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postal_code"),
    country: text("country").notNull().default("US"),
    timezone: text("timezone").notNull().default("America/New_York"),
    isPrimary: boolean("is_primary").notNull().default(false),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_fulfillment_locations_code").on(table.code),
    index("idx_ecommerce_fulfillment_locations_active").on(table.active),
    index("idx_ecommerce_fulfillment_locations_type").on(table.type),
  ],
);

export const ecommerceShippingProviders = pgTable(
  "ecommerce_shipping_providers",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: text("provider").notNull(),
    displayName: text("display_name").notNull(),
    type: text("type").notNull().default("aggregator"),
    capabilities: text("capabilities")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    settings: jsonb("settings")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    testMode: boolean("test_mode").notNull().default(true),
    active: boolean("active").notNull().default(false),
    connectedAt: timestamp("connected_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_shipping_providers_provider").on(table.provider),
    index("idx_ecommerce_shipping_providers_active").on(table.active),
    index("idx_ecommerce_shipping_providers_type").on(table.type),
  ],
);

export const ecommerceFulfillments = pgTable(
  "ecommerce_fulfillments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    orderId: varchar("order_id")
      .notNull()
      .references(() => ecommerceOrders.id, { onDelete: "cascade" }),
    locationId: varchar("location_id").references(() => ecommerceFulfillmentLocations.id, {
      onDelete: "set null",
    }),
    providerId: varchar("provider_id").references(() => ecommerceShippingProviders.id, {
      onDelete: "set null",
    }),
    shipmentId: varchar("shipment_id").references(() => ecommerceShipments.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"),
    method: text("method"),
    serviceLevel: text("service_level"),
    carrier: text("carrier"),
    trackingNumber: text("tracking_number"),
    trackingUrl: text("tracking_url"),
    labelUrl: text("label_url"),
    labelCost: integer("label_cost"),
    estimatedDeliveryAt: timestamp("estimated_delivery_at"),
    fulfilledAt: timestamp("fulfilled_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_ecommerce_fulfillments_order").on(table.orderId),
    index("idx_ecommerce_fulfillments_location").on(table.locationId),
    index("idx_ecommerce_fulfillments_provider").on(table.providerId),
    index("idx_ecommerce_fulfillments_status").on(table.status),
    index("idx_ecommerce_fulfillments_tracking").on(table.trackingNumber),
  ],
);

export const ecommerceFulfillmentItems = pgTable(
  "ecommerce_fulfillment_items",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    fulfillmentId: varchar("fulfillment_id")
      .notNull()
      .references(() => ecommerceFulfillments.id, { onDelete: "cascade" }),
    orderItemId: varchar("order_item_id")
      .notNull()
      .references(() => ecommerceOrderItems.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull(),
  },
  (table) => [
    index("idx_ecommerce_fulfillment_items_fulfillment").on(table.fulfillmentId),
    index("idx_ecommerce_fulfillment_items_order_item").on(table.orderItemId),
  ],
);

export const ecommerceIntegrationSettings = pgTable(
  "ecommerce_integration_settings",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: text("provider").notNull(),
    settings: jsonb("settings")
      .$type<Record<string, unknown>>()
      .default(sql`'{}'::jsonb`)
      .notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [uniqueIndex("idx_ecommerce_integration_provider").on(table.provider)],
);

export const ecommerceProcessedWebhookEvents = pgTable(
  "ecommerce_processed_webhook_events",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    provider: text("provider").notNull().default("stripe"),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: text("status").notNull().default("processing"),
    attemptCount: integer("attempt_count").notNull().default(1),
    processingToken: varchar("processing_token"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    lastError: text("last_error"),
    processedAt: timestamp("processed_at"),
  },
  (table) => [
    uniqueIndex("idx_ecommerce_webhook_events_provider_event").on(table.provider, table.eventId),
    index("idx_ecommerce_webhook_events_processed_at").on(table.processedAt),
    index("idx_ecommerce_webhook_status_started").on(table.status, table.startedAt),
  ],
);

export const ecommerceProductsRelations = relations(ecommerceProducts, ({ many }) => ({
  categories: many(ecommerceProductCategories),
  variants: many(ecommerceProductVariants),
  media: many(ecommerceProductMedia),
  items: many(ecommerceOrderItems),
}));

export const ecommerceProductVariantsRelations = relations(
  ecommerceProductVariants,
  ({ one, many }) => ({
    product: one(ecommerceProducts, {
      fields: [ecommerceProductVariants.productId],
      references: [ecommerceProducts.id],
    }),
    media: many(ecommerceProductMedia),
    inventoryAdjustments: many(ecommerceInventoryAdjustments),
  }),
);

export const ecommerceOrdersRelations = relations(ecommerceOrders, ({ one, many }) => ({
  customer: one(ecommerceCustomers, {
    fields: [ecommerceOrders.customerId],
    references: [ecommerceCustomers.id],
  }),
  items: many(ecommerceOrderItems),
  refunds: many(ecommerceRefunds),
  shipments: many(ecommerceShipments),
  fulfillments: many(ecommerceFulfillments),
  notes: many(ecommerceOrderNotes),
  fraudEvents: many(ecommerceFraudEvents),
}));

export const ecommerceFraudEventsRelations = relations(ecommerceFraudEvents, ({ one }) => ({
  order: one(ecommerceOrders, {
    fields: [ecommerceFraudEvents.orderId],
    references: [ecommerceOrders.id],
  }),
  customer: one(ecommerceCustomers, {
    fields: [ecommerceFraudEvents.customerId],
    references: [ecommerceCustomers.id],
  }),
}));

export const ecommerceOrderNotesRelations = relations(ecommerceOrderNotes, ({ one }) => ({
  order: one(ecommerceOrders, {
    fields: [ecommerceOrderNotes.orderId],
    references: [ecommerceOrders.id],
  }),
  author: one(users, {
    fields: [ecommerceOrderNotes.authorId],
    references: [users.id],
  }),
}));

export const ecommerceCustomerAddressesRelations = relations(
  ecommerceCustomerAddresses,
  ({ one }) => ({
    customer: one(ecommerceCustomers, {
      fields: [ecommerceCustomerAddresses.customerId],
      references: [ecommerceCustomers.id],
    }),
  }),
);

export const ecommerceFulfillmentsRelations = relations(ecommerceFulfillments, ({ one, many }) => ({
  order: one(ecommerceOrders, {
    fields: [ecommerceFulfillments.orderId],
    references: [ecommerceOrders.id],
  }),
  location: one(ecommerceFulfillmentLocations, {
    fields: [ecommerceFulfillments.locationId],
    references: [ecommerceFulfillmentLocations.id],
  }),
  provider: one(ecommerceShippingProviders, {
    fields: [ecommerceFulfillments.providerId],
    references: [ecommerceShippingProviders.id],
  }),
  shipment: one(ecommerceShipments, {
    fields: [ecommerceFulfillments.shipmentId],
    references: [ecommerceShipments.id],
  }),
  items: many(ecommerceFulfillmentItems),
}));

export const insertEcommerceProductSchema = createInsertSchema(ecommerceProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceProductVariantSchema = createInsertSchema(
  ecommerceProductVariants,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEcommerceProductOptionSchema = createInsertSchema(ecommerceProductOptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceProductOptionValueSchema = createInsertSchema(
  ecommerceProductOptionValues,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEcommerceProductMediaSchema = createInsertSchema(ecommerceProductMedia).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceProductCollectionSchema = createInsertSchema(
  ecommerceProductCollections,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEcommerceInventoryAdjustmentSchema = createInsertSchema(
  ecommerceInventoryAdjustments,
).omit({ id: true, createdAt: true });
export const insertEcommerceCategorySchema = createInsertSchema(ecommerceCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceCustomerSchema = createInsertSchema(ecommerceCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceCustomerAddressSchema = createInsertSchema(
  ecommerceCustomerAddresses,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEcommerceOrderSchema = createInsertSchema(ecommerceOrders).omit({
  id: true,
  lookupToken: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceOrderItemSchema = createInsertSchema(ecommerceOrderItems).omit({
  id: true,
});
export const insertEcommerceOrderNoteSchema = createInsertSchema(ecommerceOrderNotes).omit({
  id: true,
  createdAt: true,
});
export const insertEcommerceFraudEventSchema = createInsertSchema(ecommerceFraudEvents).omit({
  id: true,
  createdAt: true,
});
export const insertEcommerceFraudBlockSchema = createInsertSchema(ecommerceFraudBlocks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommercePaymentRequestSchema = createInsertSchema(
  ecommercePaymentRequests,
).omit({ id: true, paidAt: true, createdAt: true, updatedAt: true });
export const insertEcommerceCouponSchema = createInsertSchema(ecommerceCoupons).omit({
  id: true,
  timesUsed: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceRefundSchema = createInsertSchema(ecommerceRefunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceShippingZoneSchema = createInsertSchema(ecommerceShippingZones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceShippingRateSchema = createInsertSchema(ecommerceShippingRates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceShipmentSchema = createInsertSchema(ecommerceShipments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceFulfillmentLocationSchema = createInsertSchema(
  ecommerceFulfillmentLocations,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEcommerceShippingProviderSchema = createInsertSchema(
  ecommerceShippingProviders,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEcommerceFulfillmentSchema = createInsertSchema(ecommerceFulfillments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertEcommerceFulfillmentItemSchema = createInsertSchema(
  ecommerceFulfillmentItems,
).omit({ id: true });

export const ecommerceCartItemSchema = z.object({
  productId: z.string().trim().min(1).max(128),
  variantId: z.string().trim().min(1).max(128).optional(),
  quantity: z.number().int().min(1).max(99),
});

export type EcommerceProduct = typeof ecommerceProducts.$inferSelect;
export type InsertEcommerceProduct = z.infer<typeof insertEcommerceProductSchema>;
export type EcommerceProductVariant = typeof ecommerceProductVariants.$inferSelect;
export type InsertEcommerceProductVariant = z.infer<typeof insertEcommerceProductVariantSchema>;
export type EcommerceProductOption = typeof ecommerceProductOptions.$inferSelect;
export type InsertEcommerceProductOption = z.infer<typeof insertEcommerceProductOptionSchema>;
export type EcommerceProductOptionValue = typeof ecommerceProductOptionValues.$inferSelect;
export type InsertEcommerceProductOptionValue = z.infer<
  typeof insertEcommerceProductOptionValueSchema
>;
export type EcommerceProductMedia = typeof ecommerceProductMedia.$inferSelect;
export type InsertEcommerceProductMedia = z.infer<typeof insertEcommerceProductMediaSchema>;
export type EcommerceProductCollection = typeof ecommerceProductCollections.$inferSelect;
export type InsertEcommerceProductCollection = z.infer<
  typeof insertEcommerceProductCollectionSchema
>;
export type EcommerceInventoryAdjustment = typeof ecommerceInventoryAdjustments.$inferSelect;
export type InsertEcommerceInventoryAdjustment = z.infer<
  typeof insertEcommerceInventoryAdjustmentSchema
>;
export type EcommerceCategory = typeof ecommerceCategories.$inferSelect;
export type InsertEcommerceCategory = z.infer<typeof insertEcommerceCategorySchema>;
export type EcommerceCustomer = typeof ecommerceCustomers.$inferSelect;
export type InsertEcommerceCustomer = z.infer<typeof insertEcommerceCustomerSchema>;
export type EcommerceCustomerAddress = typeof ecommerceCustomerAddresses.$inferSelect;
export type InsertEcommerceCustomerAddress = z.infer<typeof insertEcommerceCustomerAddressSchema>;
export type EcommerceOrder = typeof ecommerceOrders.$inferSelect;
export type InsertEcommerceOrder = z.infer<typeof insertEcommerceOrderSchema>;
export type EcommerceCheckoutRequest = typeof ecommerceCheckoutRequests.$inferSelect;
export type EcommerceInventoryReservation = typeof ecommerceInventoryReservations.$inferSelect;
export type EcommerceNotificationJob = typeof ecommerceNotificationJobs.$inferSelect;
export type EcommerceProcessedWebhookEvent = typeof ecommerceProcessedWebhookEvents.$inferSelect;
export type EcommerceOrderItem = typeof ecommerceOrderItems.$inferSelect;
export type InsertEcommerceOrderItem = z.infer<typeof insertEcommerceOrderItemSchema>;
export type EcommerceOrderNote = typeof ecommerceOrderNotes.$inferSelect;
export type InsertEcommerceOrderNote = z.infer<typeof insertEcommerceOrderNoteSchema>;
export type EcommerceFraudEvent = typeof ecommerceFraudEvents.$inferSelect;
export type InsertEcommerceFraudEvent = z.infer<typeof insertEcommerceFraudEventSchema>;
export type EcommerceFraudBlock = typeof ecommerceFraudBlocks.$inferSelect;
export type InsertEcommerceFraudBlock = z.infer<typeof insertEcommerceFraudBlockSchema>;
export type EcommercePaymentRequest = typeof ecommercePaymentRequests.$inferSelect;
export type InsertEcommercePaymentRequest = z.infer<typeof insertEcommercePaymentRequestSchema>;
export type EcommerceCoupon = typeof ecommerceCoupons.$inferSelect;
export type InsertEcommerceCoupon = z.infer<typeof insertEcommerceCouponSchema>;
export type EcommerceRefund = typeof ecommerceRefunds.$inferSelect;
export type InsertEcommerceRefund = z.infer<typeof insertEcommerceRefundSchema>;
export type EcommerceShippingZone = typeof ecommerceShippingZones.$inferSelect;
export type InsertEcommerceShippingZone = z.infer<typeof insertEcommerceShippingZoneSchema>;
export type EcommerceShippingRate = typeof ecommerceShippingRates.$inferSelect;
export type InsertEcommerceShippingRate = z.infer<typeof insertEcommerceShippingRateSchema>;
export type EcommerceShipment = typeof ecommerceShipments.$inferSelect;
export type InsertEcommerceShipment = z.infer<typeof insertEcommerceShipmentSchema>;
export type EcommerceFulfillmentLocation = typeof ecommerceFulfillmentLocations.$inferSelect;
export type InsertEcommerceFulfillmentLocation = z.infer<
  typeof insertEcommerceFulfillmentLocationSchema
>;
export type EcommerceShippingProvider = typeof ecommerceShippingProviders.$inferSelect;
export type InsertEcommerceShippingProvider = z.infer<typeof insertEcommerceShippingProviderSchema>;
export type EcommerceFulfillment = typeof ecommerceFulfillments.$inferSelect;
export type InsertEcommerceFulfillment = z.infer<typeof insertEcommerceFulfillmentSchema>;
export type EcommerceFulfillmentItem = typeof ecommerceFulfillmentItems.$inferSelect;
export type InsertEcommerceFulfillmentItem = z.infer<typeof insertEcommerceFulfillmentItemSchema>;
export type EcommerceCartItem = z.infer<typeof ecommerceCartItemSchema>;
