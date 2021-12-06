# Base URL
- Staging - https://staging-covercompared.polkacover.com/api/
- Production - https://covercompared.polkacover.com/api/ 

# Txn Hash Format 
Mso policy - MSO-XXX
Device insurance - DEVICE-XXX
Smart contract - SC-XXX
Crypto exchange - CE-XXX

# MongoDb Collection Structure
## User 
```
{
    "Users": [
        {
            "_id": "",
            "first_name": "",
            "last_name": "",
            "email": "",
            "email_verified_at": "",
            "created_at": "",
            "updated_at": ""
        }
    ]
}
```

## WalletAddresses
```
user_id         - Users._id
```
```
{
    "WalletAddresses": [
        {
            "user_id": "",
            "wallet_address": ""
        }
    ]
}
```

## Policies
```
user_id         - Users._id
payment_id      - Payments._id
product_type    - mso-policy, device-insurance
status          - pending, active, cancelled
payment_status  - unpaid, paid, cancelled

MSOPolicy.plan_type       - BASIC_PLAN, SILVER_PLAN, GOLD_PLAN, PLATINUM_PLAN
MSOPolicy.amount          - policy_price + mso_addon_service
MSOPolicy.user_type       - Main Member, Spouse, Dependent, Main Member Parent, Spouse Parent
MSOPolicy.identity_type   - passport, adhar

DeviceInsurance.plan_type   - monthly, yearly

```
```
{
    "Policies": [
        {
            "_id": "",
            "user_id": "",
            "txn_hash": "",
            "product_type": "",
            "reference_id": "",
            "status": "",
            "StatusHistory": [
                {
                    "status": "",
                    "updated_at": "",
                    "updated_by": ""
                }
            ],
            "payment_status: "",
            "PaymentStatusHistory": [
                {
                    "status": "",
                    "updated_at": ""
                }
            ],
            "payment_id": "",
            "blockchain": "",
            "wallet_address": "",
            "block_timestamp": "",
            "txn_type": "",
            "payment_hash": "",
            "currency": "",
            "amount": "",
            "discount_amount": "",
            "tax": "",
            "total_amount": "",
            "crypto_currency": "",
            "crypto_amount": "",
            "MSOPolicy": {
                "plan_type": "",
                "name": "",
                "quote": "",
                "country": "",
                "mso_cover_user": "",
                "currency": "",
                "policy_price": "",
                "mso_addon_service": "",
                "amount": "",
                "MSOMembers": [
                    {
                        "_id": "",
                        "user_type": "",
                        "first_name": "",
                        "last_name": "",
                        "country": "",
                        "dob": "",
                        "identity_type" : "passport",
                        "identity": "xxx-xxx-xxx"
                    }
                ]
            },
            "DeviceInsurance": {
                "device_type": "",
                "brand": "",
                "value": "",
                "purchase_month": "",
                "model": "",
                "model_name": "",
                "plan_type": "",
                "first_name": "",
                "last_name": "",
                "email": "",
                "phone": ""
            },
            "SmartContract": {
                "network": "",
                "company_code": "",
                "product_id": "",
                "unique_id": "",
                "address": "",
                "name": "",
                "type": "",
                "period": "",
                "chain": "",
                "crypto_currency": "",
                "crypto_amount": ""
            },
            "created_at": "",
            "updated_at": ""
        }
    ]
}
```

## Payments
```
{
    "Payments": [
        {
            "_id": "",
            "user_id": "",
            "policy_id": "",
            "blockchain": "",
            "wallet_address": "",
            "block_timestamp": "",
            "txn_type": "",
            "payment_hash": "",
            "currency": "",
            "paid_amount": "",
            "payment_status": ""
        }
    ]
}
```

## Reviews
```
user_id     - Users._id
policy_id   - Policies._id
```
```
{
    "Reviews":[
        {
            "_id": "",
            "policy_id": "",
            "user_id": "",
            "rating": "",
            "review": "",
            "timestamp": "",
        }
    ]
}
```

## PolicyRequests
```
{
    "PolicyRequests": [
        {
            "_id": "",
            "user_id": "",
            "product_type": "",
            "country": "",
            "email": ""
            "createdAt": "",
            "updatedAt": ""
        }
    ]
}
```

## ContactUsRequests
```
user_type   : Customer, Partner, Other
```
```
{
    "ContactUsRequests": [
        {
            "_id": "",
            "name": "",
            "email": "",
            "user_type": "",
            "message": "",
            "createdAt": ""
        }
    ]
}
```