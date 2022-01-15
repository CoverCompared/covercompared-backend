# Cover list
- POST - /cover-list
## Other Details
```
It will call 6 apis in background
company - insurace, nexus, nsur, unore
type - protocol | custodian
```

## Code Logic
Currently we have 4 company to list covers, it will call all necessary apis to list covers of all companies
1. nexus
    - Get Cover list - (call api)
        - URL : https://api.nexusmutual.io/coverables/contracts.json

    - Currency limit (Static)
    ```
    {
        "ETH": { min: 1, max: undefined },
        "DAI": { min: 1, max: undefined }
    }
    ```
    
    - Map all covers

        address is key of all cover
    ```
    unique_id           - address + "nexus"
    product_id          - null
    address             - address
    logo                - "https://app.nexusmutual.io/logos/" + cover.logo
    name                - cover.name
    type                - cover.type
    company             - "Nexus Mutual"
    company_icon        - "https://staging-covercompared.polkacover.com/api/images/company-icons/nexus-mutual-icon.png"    
    company_code        - "nexus"
    min_eth             - 1
    supportedChains     - cover.supportedChains
    currency            - "ETH"                         // default is ETH else requested in filter
    currency_limit      - { min: 1, max: undefined }    // get limits of currency from above currency limit
    duration_days_min   - 30
    duration_days_max   - 365
    ```

2. nsure 
    - Get Cover list - (call api)
        - URL : https://napi.nsure.network/v1/cover/list
    
    - Map all covers

    ```
    unique_id           - cover.uid + cover.address + "nsure"
    product_id          - cover.uid
    address             - cover.address
    logo                - ??
    name                - cover.name
    type                - cover.type                    // default : protocol
    website             - cover.website
    company             - "Nsure Network"
    company_icon        - "https://staging-covercompared.polkacover.com/api/images/company-icons/Nsure Network.png"    
    company_code        - "nsure"
    min_eth             - 0.1
    capacity            - cover.coverAvailableAmount / (10 ** 18)
    supportedChains     - ["Ethereum"]
    currency            - "ETH"                         // Always ETH because it only support
    currency_limit      - { min: 0.1, max: cover.coverAvailableAmount / (10 ** 18) } 
    duration_days_min   - cover.minDuration             // default : 30
    duration_days_max   - cover.maxDuration             // default : 365
    ```
3. insurace
    - Get Cover list - (call api)
        - URL : https://api.insurace.io/ops/v1/getProductList

    - Get Currency limit (call 3 apis)
        1. Call for **Ethereum**
            ````
            - POST - https://api.insurace.io/ops/v1/getCurrencyList : date ({"chain": "Ethereum"})
            Ethereum : {
                min: response.amount_min / (10 ** response.decimals),
                max: response.amount_max / (10 ** response.decimals)
            }
            ````
        2. Call for **BSC**
            ````
            - POST - https://api.insurace.io/ops/v1/getCurrencyList : date ({"chain": "BSC"})
            Ethereum : {
                min: response.amount_min / (10 ** response.decimals),
                max: response.amount_max / (10 ** response.decimals)
            }
            ````
        3. Call for **Polygon**
            ````
            - POST - https://api.insurace.io/ops/v1/getCurrencyList : date ({"chain": "Polygon"})
            Ethereum : {
                min: response.amount_min / (10 ** response.decimals),
                max: response.amount_max / (10 ** response.decimals)
            }
            ````

    - Map all covers
    ```
    Risk Types
    {
        "Smart Contract Vulnerability": "protocol",
        "Custodian Risk": "custodian",
        "IDO Event Risk": "Decentralized Exchanges",
    }
    ```

    ```
    unique_id           - cover.product_id + cover.capacity_currency + "insurace"
    product_id          - cover.product_id
    address             - cover.capacity_currencys
    logo                - "https://app.insurace.io/asset/product/" + cover.name + ".jpg"
    name                - cover.name
    type                - cover.risk_type               // cover.risk_type
    company             - "InsurAce"
    company_icon        - "https://staging-covercompared.polkacover.com/api/images/company-icons/insurace-icon.png"    
    company_code        - "insurace"
    min_eth             - 0.5
    capacity            - cover.capacity_remaining / (10 ** 18)
    supportedChains     - [cover.chain_type]
    currency            -                           // Get Currency limit
    currency_limit      -                           // Get Currency limit
    duration_days_min   - cover.duration_days_min             // default : 15
    duration_days_max   - cover.duration_days_max             // default : 365
    ```
4. unore
    - Get Cover List (Static)
    ```
    {
        unique_id : "Umbrella Network" + "" + "unore"
        product_id: "",
        address: "",
        name: "Umbrella Network",
        type: "protocol",
        company: "Uno Re",
        company_code: "unore",
        company_icon: "https://staging-covercompared.polkacover.com/api/images/company-icons/UNORE.png" 
        min_eth: 0.1,
        capacity: "",
        logo: "https://staging-covercompared.polkacover.com/api/images/unore/UmbrellaNetwork.jpg",
        supportedChains: ["Ethereum"],
        currency: ["ETH"], 
        currency_limit : { "ETH": {
            "min": 0.1,
            "max": 3.3946
        }},
        duration_days_min: 15,
        duration_days_max: 365,
        is_coming_soon: true
    },
    {
        unique_id : "Rocket Vault Finance" + "" + "unore"
        product_id: "",
        address: "",
        name: "Rocket Vault Finance",
        type: "custodian",
        company: "Uno Re",
        company_code: "unore",
        company_icon: "https://staging-covercompared.polkacover.com/api/images/company-icons/UNORE.png" 
        min_eth: 0.1,
        capacity: "",
        logo: "https://staging-covercompared.polkacover.com/api/images/unore/RocketVaultFinance.png",
        supportedChains: ["Ethereum"],
        currency: ["ETH"], currency_limit : { "ETH": {
            "min": 0.1,
            "max": 3.3946
        }},
        duration_days_min: 15,
        duration_days_max: 365,
        is_coming_soon: true
    }
    ```

## Request
```
?search=0x0000000000000000000000000000000000000009
&company=insurace
&type=protocol
&supported_chain=Polygon
&page=5
&duration_min_day=365
&currency=DAI
&duration_max_day=600
&amount_min=0.1
&amount_max=100
```

## Response of unore
```
{
    "success": true,
    "message": "",
    "data": {
        "total": 2,
        "total_page": 1,
        "current_page": 1,
        "list": [
            {
                "unique_id": "Rocket Vault Finance..unore",
                "product_id": "",
                "address": "",
                "name": "Rocket Vault Finance",
                "type": "custodian",
                "company": "Uno Re",
                "company_code": "unore",
                "company_icon": "https://staging-covercompared.polkacover.com/api/images/company-icons/UNORE.png",
                "min_eth": 0.1,
                "capacity": "",
                "logo": "https://staging-covercompared.polkacover.com/api/images/unore/RocketVaultFinance.png",
                "supportedChains": [
                    "Ethereum"
                ],
                "currency": [
                    "ETH"
                ],
                "currency_limit": {
                    "ETH": {
                        "min": 0.1,
                        "max": 3.3946
                    }
                },
                "duration_days_min": 15,
                "duration_days_max": 365,
                "is_coming_soon": true
            }
        ]
    },
    "errors": {}
}
```

## Response of insurace
```
{
    "success": true,
    "message": "",
    "data": {
        "total": 63,
        "total_page": 7,
        "current_page": 1,
        "list": [
            {
                "unique_id": "20.0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE.insurace",
                "product_id": "20",
                "address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                "name": "1inch ",
                "type": "protocol",
                "logo": "https://app.insurace.io/asset/product/1inch.png",
                "company": "InsurAce",
                "company_icon": "https://staging-covercompared.polkacover.com/api/images/company-icons/insurace-icon.png",
                "company_code": "insurace",
                "min_eth": 0.5,
                "capacity": 642.3610087184597,
                "supportedChains": [
                    "Ethereum"
                ],
                "currency": [
                    "ETH",
                    "DAI",
                    "USDC",
                    "USDT"
                ],
                "currency_limit": {
                    "ETH": {
                        "min": 0.5,
                        "max": 10000
                    },
                    "DAI": {
                        "min": 1000,
                        "max": 20000000
                    },
                    "USDC": {
                        "min": 1000,
                        "max": 20000000
                    },
                    "USDT": {
                        "min": 1000,
                        "max": 20000000
                    }
                },
                "duration_days_min": "15",
                "duration_days_max": "365"
            }
        ]
    },
    "errors": {}
}
```

## Response of nexus
```
{
    "success": true,
    "message": "",
    "data": {
        "total": 106,
        "total_page": 11,
        "current_page": 1,
        "list": [
            {
                "unique_id": "null.0xB27F1DB0a7e473304A5a06E54bdf035F671400C0.nexus",
                "product_id": null,
                "address": "0xB27F1DB0a7e473304A5a06E54bdf035F671400C0",
                "logo": "https://app.nexusmutual.io/logos/0x.png",
                "name": "0x V3",
                "type": "protocol",
                "company": "Nexus Mutual",
                "company_icon": "https://staging-covercompared.polkacover.com/api/images/company-icons/nexus-mutual-icon.png",
                "company_code": "nexus",
                "min_eth": 1,
                "supportedChains": [
                    "Ethereum",
                    "BSC"
                ],
                "currency": [
                    "ETH",
                    "DAI"
                ],
                "currency_limit": {
                    "ETH": {
                        "min": 1
                    },
                    "DAI": {
                        "min": 1
                    }
                },
                "duration_days_min": 30,
                "duration_days_max": 365
            }
        ]
    },
    "errors": {}
}
```

## Response of nsure
```
{
    "success": true,
    "message": "",
    "data": {
        "total": 26,
        "total_page": 3,
        "current_page": 1,
        "list": [
            {
                "unique_id": "13.0x111111111117dc0aa78b770fa6a738034120c302.nsure",
                "product_id": 13,
                "uid": 13,
                "address": "0x111111111117dc0aa78b770fa6a738034120c302",
                "name": "1inch",
                "type": "protocol",
                "website": "https://app.1inch.io/",
                "company": "Nsure Network",
                "company_icon": "https://staging-covercompared.polkacover.com/api/images/company-icons/Nsure Network.png",
                "company_code": "nsure",
                "min_eth": 0.1,
                "capacity": 6.94704,
                "supportedChains": [
                    "Ethereum"
                ],
                "currency": [
                    "ETH"
                ],
                "currency_limit": {
                    "ETH": {
                        "min": 0.1,
                        "max": 2.8946
                    }
                },
                "duration_days_min": 30,
                "duration_days_max": 365
            }
        ]
    },
    "errors": {}
}
```
