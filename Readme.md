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