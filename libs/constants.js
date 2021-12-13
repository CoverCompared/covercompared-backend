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
    }
}

module.exports = constant;