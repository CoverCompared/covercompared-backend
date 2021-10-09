const config = require(".");

module.exports = {
    "nsure": {
        "name": "Nsure Network",
        "code": "nsure",
        "icon" : `${config.api_url}images/company-icons/Nsure Network.png`,
        "status": true,
        "min_eth": 0.1,
        "apis": {
            "cover_list": {
                "url": "https://napi.nsure.network/v1/cover/list",
                "type": "GET",
                "details": "Provides list of all products available on Nsure Network",
                "keys": [
                    { "key" : "uid", "description": "product_id" },
                    { "key" : "uid", "description": "uid" },
                    { "key" : "address", "description": "address" },
                    { "key" : "name", "description": "name" },
                    { "key" : "type", "description": "type" },
                    { "key" : "website", "description": "website" },
                ]
            },
            "cover_quote": {
                "url": `https://napi.nsure.network/v1/get_quote`,
                "type": "POST",
                "details": "Get Quote of specific product.",
                "keys": []
            }
        }
    },
    "unore": {
        "name": "Uno Re",
        "code": "unore",
        "icon" : `${config.api_url}images/company-icons/UNORE.png`,
        "status": true,
        "min_eth": 0.1,
        "logo_url": `${config.api_url}images/unore/`,
        "apis": {}
    },
    "nexus": {
        "name": "Nexus Mutual",
        "code": "nexus",
        "icon" : `${config.api_url}images/company-icons/nexus-mutual-icon.png`,
        "status": true,
        "min_eth": 1,
        "logo_url": "https://app.nexusmutual.io/logos/",
        "apis": {
            "cover_list": {
                "url": "https://api.nexusmutual.io/coverables/contracts.json"
            },
            "cover_capacity": {
                "url": (address) => `https://api.staging.nexusmutual.io/v1/contracts/${address}/capacity`
            },
            "cover_quote": {
                "url": `https://api.staging.nexusmutual.io/v1/quote`
            }
        }
    },
    "insurace": {
        "name": "InsurAce",
        "code": "insurace",
        "icon" : `${config.api_url}images/company-icons/insurace-icon.png`,
        "status": true,
        "min_eth": 0.5,
        "logo_url": "https://app.insurace.io/asset/product/",
        "access_code": "BIJtkcwZVbqksdkGQphamIi6yXfUpd2cwIxeDs6jmT4uXYaWJwONIA==",
        "owner_id": "0x48D88a5D10595338E46C82256858BaCbcD38e224",
        "apis": {
            "cover_list": {
                "url": "https://api.insurace.io/ops/v1/getProductList"
            },
            "cover_quote": {
                "url": `https://api.insurace.io/ops/v1/getCoverPremium`
            },
            "currency_list": {
                "url": `https://api.insurace.io/ops/v1/getCurrencyList`
            }
        }
    },
}