const DB_PREFIX = "tbl_";

// Table names
const TABLES = {
  ADMIN: `${DB_PREFIX}employee`,
  CUSTOMERS: `${DB_PREFIX}customers`,
  COMPANIES: `${DB_PREFIX}companies`,
  AGENTS: `${DB_PREFIX}agents`,
  NOMINEES: `${DB_PREFIX}nominees`,
  FIXED_DEPOSITS: `${DB_PREFIX}fixed_deposits`,
  PAYOUTS: `${DB_PREFIX}payouts`,
  ATTACHMENT_DETAILS: `${DB_PREFIX}attachmentdetails`,
  ENTITY_ATTACHMENT: `${DB_PREFIX}entityattachment`,
  REFRESH_TOKENS: `${DB_PREFIX}refresh_tokens`,
  ACTIVITY_LOG: `${DB_PREFIX}admin_activity_log`,
  INTERNAL_FUNDS: `${DB_PREFIX}internal_funds`,
  BRANCH: `${DB_PREFIX}branch`,
  FUND_ALLOCATIONS: `${DB_PREFIX}fund_allocations`,
  COUNTRY_DETAILS: `${DB_PREFIX}countrydetails`,
  CURRENCY: `${DB_PREFIX}currency`,
  STATE_DETAILS: `${DB_PREFIX}statedetails`,
  CITY_DETAILS: `${DB_PREFIX}citydetails`,
  PUNCH_DETAILS: `${DB_PREFIX}punchdetails`,
  CATEGORY: `${DB_PREFIX}category`,
  COLOUR_CATEGORY: `${DB_PREFIX}colour_category`,
  FINISH_TYPE: `${DB_PREFIX}finish_type`,
  COLOUR_GROUP: `${DB_PREFIX}colour_group`,
  MATERIAL: `${DB_PREFIX}material`,
  SIZE_TYPE: `${DB_PREFIX}size_type`,
  SIZE_GENDER: `${DB_PREFIX}size_gender`,
  SIZE_GROUP: `${DB_PREFIX}size_group`,
  BRAND: `${DB_PREFIX}brand`,
  STORE: `${DB_PREFIX}store`,
  LOCATION: `${DB_PREFIX}location`,
  IRONMAN_PACKING_PRICE: `${DB_PREFIX}ironman_packing_price`,
  PURCHASE_VENDOR: `${DB_PREFIX}purchase_vendor`,
  JOB_VENDOR: `${DB_PREFIX}job_vendor`,
  LEAD: `${DB_PREFIX}lead`,
  LEAD_VISIT: `${DB_PREFIX}lead_visit`,
  LEAD_FOLLOWUP: `${DB_PREFIX}lead_followup`,
  SCHOOLS: `${DB_PREFIX}schools`,
  SCHOOL_CLASSES: "tbl_school_classes",
  SCHOOL_STUDENTS: "tbl_school_students",
  SCHOOL_STUDENT_MEASUREMENTS: "tbl_student_measurements",
  SCHOOL_UNIFORM_CONSUMPTION: "tbl_school_uniform_consumption",
  SCHOOL_MATERIAL_PO: "tbl_school_material_po",
  SCHOOL_MATERIAL_PO_ITEMS: "tbl_school_material_po_items",
  PURCHASE_ENTRY: "tbl_purchase_entry",
  PURCHASE_ENTRY_ITEM: "tbl_purchase_entry_item",
  MATERIAL_CUMULATIVE: "tbl_material_cumulative",
  ORDER: "tbl_orders",
  ORDER_ITEM: "tbl_order_items",
  ORDER_ITEM_ASSIGNMENT: "tbl_order_item_assignments",
  ORDER_ASSIGNMENT_MATERIAL: "tbl_order_assignment_materials",
  ORDER_BALANCE_RETURN: "tbl_order_balance_returns",
  ORDER_BALANCE_RETURN_ITEM: "tbl_order_balance_return_items",
  PRODUCTION_SCAN: "tbl_production_scans",
  DELIVERY_CHALLAN: "tbl_delivery_challans",
  DC_ITEMS: "tbl_dc_items",
  DC_STUDENT_ITEMS: "tbl_dc_student_items",
  READYMADE_CONSUMPTION: "tbl_readymade_consumption",
  TRANSPORT: "tbl_transport",
  SETTINGS: "tbl_settings",
};

// Entity types for attachments
const ENTITY_TYPES = {
  CUSTOMER: "Customer",
  AGENT: "Agent",
  NOMINEE: "Nominee",
  LEAD_REFERENCE: "LeadReference",
  LEAD_SITE_CONDITION: "LeadSiteCondition",
  PROFILE_IMAGE: "ProfileImage",
  AADHAR_FRONT: "AadharFront",
  AADHAR_BACK: "AadharBack",
  PAN_CARD: "PanCard",
  PROFILE_IMAGE_AGENT: "ProfileImageAgent",
  AADHAR_FRONT_AGENT: "AadharFrontAgent",
  AADHAR_BACK_AGENT: "AadharBackAgent",
  PAN_CARD_AGENT: "PanCardAgent",
  PROFILE_IMAGE_NOMINEE: "ProfileImageNominee",
  AADHAR_FRONT_NOMINEE: "AadharFrontNominee",
  AADHAR_BACK_NOMINEE: "AadharBackNominee",
  PAN_CARD_NOMINEE: "PanCardNominee",
  COMPANY_LOGO: "CompanyLogo",
  PAYMENT_RECEIPT: "PaymentReceipt",
};

const PAYOUT_TYPES = {
  FD_INTEREST_PAYOUT: "FD Interest Payout",
  FD_INTEREST_TO_CHIT: "FD Interest to Chit Conversion",
};

const PAYMENT_STATUS = {
  FULLY_PAID: "Fully Paid",
  PARTIALLY_PAID: "Partially Paid",
  Commission: "Commission",
};

// Status constants
const STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  DELETED: "deleted",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

const FD_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
  MATURED: "matured",
  CLOSED: "closed",
  DELETED: "deleted",
};

const INTEREST_MODES = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  ANNUALLY: "Annually",
};
const PAYMENT_SOURCES = {
  Paid: "Paid",
  Received: "Received",
};

// User roles
const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  USER: "user",
};

// File upload configuration
const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ["image/jpeg", "image/jpg", "image/png", "image/gif"],
  ALLOWED_DOCUMENT_TYPES: ["application/pdf"],
  UPLOAD_PATH: process.env.UPLOAD_PATH || "./uploads",
};

// Pagination defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

module.exports = {
  TABLES,
  ENTITY_TYPES,
  STATUS,
  ROLES,
  FILE_UPLOAD,
  PAGINATION,
  DB_PREFIX,
  FD_STATUS,
  INTEREST_MODES,
  PAYOUT_TYPES,
  PAYMENT_STATUS,
  PAYMENT_SOURCES,
};