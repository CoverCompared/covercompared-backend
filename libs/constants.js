const constant = {
    ProductTypes: {
        mso_policy: "mso_policy",
        device_insurance: "device_insurance",
        smart_contract: "smart_contract",
        crypto_exchange: "crypto_exchange",
    },
    PolicyStatus: {
        pending: "pending", 
        active: "active", 
        cancelled: "cancelled"
    },
    PolicyPaymentStatus: {
        unpaid: "unpaid", 
        paid: "paid", 
        cancelled: "cancelled"
    }
}

module.exports = constant;