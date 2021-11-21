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

## MSOPolicies
```
plan_type       - BASIC_PLAN, SILVER_PLAN, GOLD_PLAN, PLATINUM_PLAN
user_id         - Users._id
policy_id       - Policies._id
amount          - policy_price + mso_addon_service
user_type       - Main Member, Spouse, Dependent, Main Member Parent, Spouse Parent
identity_type   - passport, adhar
```
```
{
    "MSOPolicies": [
        {
            "_id": "",
            "user_id": "",
            "txn_hash": "",
            "policy_id": "",
            "plan_type": "",
            "quote": "",
            "name": "",
            "email": "",
            "country": "",
            "logo": "",
            "logo_aws_key": "",
            "mso_cover_user": "",
            "currency": "",
            "policy_price": "",
            "mso_addon_service": "",
            "amount": "",
            "discount_amount": "",
            "tax": "",
            "total_amount": "",
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
            ],
            "status": "",
            "created_at": "",
            "updated_at": "",
        }
    ]
}
```

## DeviceInsurances
```
user_id     - Users._id
policy_id   - Policies._id
plan_type   - monthly, yearly
```
```
{
    "DeviceInsurances": [
        {
            "_id": "",
            "user_id": "",
            "txn_hash": "",
            "policy_id": "",
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
            "phone": "",
            "currency": "",
            "amount": "",
            "discount_amount": "",
            "tax": "",
            "total_amount": "",
            "payment_hash": "",
            "status": "",
            "created_at": "",
            "updated_at": ""
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