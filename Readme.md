# Requirements
    Node = 12

# Installation Steps
    > cp .env.example .env
    > set NODE_ENV in .env file [local|staging|production]
    > set MAIL_SERVICE=aws
    
# Seeder
    > npm run seed

# Other Configuration
    > Update config as per NODE_ENV if required
    > config/index.js


# Cover type details
    custodian - CryptoExchange
    protocol - SmartContract


# Enable Mail sending functionality in local environment
    .env
    SEND_MAIL=1

# Allow CORS is used to allow request cross origin
    ALLOW_CORS=1

# Other Options to stop sync process : 
All this options are not working for staging & production
```
- Set 1 to off transaction sync
P4L_SYNC_TRANSACTIONS_OFF=1
MSO_SYNC_TRANSACTIONS_OFF=
INSURACE_SYNC_TRANSACTIONS_OFF=
NEXUS_SYNC_TRANSACTIONS_OFF=
```
```
- Set interval time to sync transactions
WEB_SYNC_TIME=5m
```
```
- Set 1 to off update from blog in setting
UPDATE_P4L_FROM_BLOCK_OFF=1
UPDATE_MSO_FROM_BLOCK_OFF=
UPDATE_INSURACE_FROM_BLOCK_OFF=
UPDATE_NEXUS_FROM_BLOCK_OFF=
```
```
DEBUG_MSO_TRANSACTION_HASH=<transaction-hash>
```

