# Add MSO
- POST - /user/policies-mso
- Call before user pay for mso plan after filling all details
- In response you will get txn_hash and policy_id, later used to call confirm-payment api
## Other Details
```
plan_type       - BASIC_PLAN, SILVER_PLAN, GOLD_PLAN, PLATINUM_PLAN
amount          - quote + mso_addon_service
MSOMembers
.identity_type  - passport, adhar
.user_type      - Main Member, Spouse, Dependent, Main Member Parent, Spouse Parent
.dob            - format - DD-MM-YYYY
```
## Request
```
{
    "plan_type": "BASIC_PLAN",
    "country": "UAE",
    "quote": "50",
    "name": "Romik Makavana",
    "mso_cover_user": "1",
    "currency": "USD",
    "mso_addon_service": "15",
    "amount": "65",
    "discount_amount": "16.25",
    "tax": "5",
    "total_amount": "53.75",
    "MSOMembers": [
        {
            "user_type": "Main Member",
            "first_name": "Romik",
            "last_name": "Makavana",
            "country": "IND",
            "dob": "14-12-1998",
            "identity_type": "passport",
            "identity": "123456"
        }
    ]
}
```

## Response
```
{
    "success": true,
    "message": "Policy added successfully.",
    "data": {
        "_id": "617175aeb4ce73768634ecc7",
        "txn_hash": "MSO-006"
    },
    "errors": {}
}
```

# MSO Confirm Payment
- POST - user/policies-mso/{{policy_id}}/confirm-payment

- call after payment success or fail, need to call every time when you generate new payment_hash from provider, with whatever response success or fail

## Other Details
```
payment_status  - paid, cancelled
```

## Request
```
{
    "payment_status": "paid",
    "blockchain": "ethereum",
    "wallet_address": "123",
    "block_timestamp": "1634829441",
    "txn_type": "onchain",
    "payment_hash": "ASFAS654321ASDF",
    "currency": "USD",
    "paid_amount": 53.75
}
```

## Response
```
{
    "success": true,
    "message": "Payment detail updated successfully.",
    "data": {
        "policy_id": "61717de5442ae2458e462a45",
        "txn_hash": "MSO-00701",
        "payment_status": "paid",
        "status": "active"
    },
    "errors": {}
}
```