const constant = {
    ProductTypesName : {
        mso_policy: "MSO Policy",
        device_insurance: "Device Insurance",
        smart_contract: "Smart Contract",
        crypto_exchange: "Crypto Exchange",
    },
    ProductTypes: {
        mso_policy: "mso_policy",
        device_insurance: "device_insurance",
        smart_contract: "smart_contract",
        crypto_exchange: "crypto_exchange",
    },
    PolicyStatus: {
        pending: "pending", 
        active: "active", 
        cancelled: "cancelled",
        complete: "complete"
    },
    PolicyPaymentStatus: {
        unpaid: "unpaid", 
        paid: "paid", 
        cancelled: "cancelled"
    },
    p4lPurchaseMonth: {
        1: "Less than 12 months",
        2: "12 to 24 Months"
    },
    MSO_PLAN_TYPE : {
        BASIC_PLAN: 1,
        SILVER_PLAN: 2,
        GOLD_PLAN: 3,
        PLATINUM_PLAN: 4,
    }
}

module.exports = constant;