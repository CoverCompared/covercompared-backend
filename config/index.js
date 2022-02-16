const ms = require("ms");

let config = {
    env: "local",
    app_code: "cover-compared",
    cache_time: 300, // seconds
    api_url: "http://localhost:3006/api/",
    web_url: "http://localhost:3000/",
    db: `${process.env.MONGODB_URL}${process.env.DATABASE_NAME}`,
    dbName: process.env.DATABASE_NAME,
    noreplay: `"Cover Compared" no-reply@polkacover.com`,
    subscribe_mail: "contact@polkacover.com",
    p4l_api_baseurl: "https://dev.protect4less.com/app-api/",
    p4l_secret: process.env.P4L_SECRET,
    signature_private_key: process.env.SIGNATURE_PRIVATE_KEY,
    JWT_TOKEN_EXPIRY: ms("24h"), // 24h
    sync_time_web3_smart_contract: ms(process.env.WEB_SYNC_TIME ? process.env.WEB_SYNC_TIME : "5m"),
    is_mainnet: false,
    SupportedChainId: {
        MAINNET: 1,
        RINKEBY: 4,
        KOVAN: 42,
    },
    email_images: {
        logo: "images/cover-compared.png"
    },
    social_links: {
        twitter: "https://twitter.com/PolkaCover",
        linkedin: "https://www.linkedin.com/company/PolkaCover",
        telegram: "https://t.me/PolkaCover",
        gitbook: "https://polkacover.gitbook.io"
    },
    send_mail: false,
    cvr_token_addresses: [
        "0x3C03b4EC9477809072FF9CC9292C9B25d4A8e6c6",   // mainnet
        "0xd3e48facd30a73609ffa60ae84851e72d10fea52",   // rinkeby
        "0xfc9b2b2565b38511b9822887f99d036d694a11e6"    // kovan
    ],
    dai_token_addresses: [
        "0x6b175474e89094c44da98b954eedeac495271d0f",   // mainnet
        "0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea",   // rinkeby
        "0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa"    // kovan
    ],
    ether_token_addresses: [
        "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", // mainnet
        "0xc778417e063141139fce010982780140aa0cd5ab",   // rinkeby
        "0xd0a1e359811322d97991e03f863a0c30c2cf029c"    // kovan
    ],
    etherscan_key: process.env.ETHERSCAN_API_KEY ? process.env.ETHERSCAN_API_KEY : "JNBVMS9A3MSEDEIEDPC3B18HNNI2YQ6BGS",
}

const INFURA_KEY = "92a35c94033b48c6a8d248ac76e7650e";
config.NETWORK_URLS = {
    [config.SupportedChainId.MAINNET]: `wss://mainnet.infura.io/ws/v3/${INFURA_KEY}`,
    [config.SupportedChainId.RINKEBY]: `wss://rinkeby.infura.io/ws/v3/${INFURA_KEY}`,
    [config.SupportedChainId.KOVAN]: `wss://kovan.infura.io/ws/v3/${INFURA_KEY}`,
}

if (
    process.env.NODE_ENV
    && ['staging', 'production'].includes(process.env.NODE_ENV)
) {
    config.sync_time_web3_smart_contract = ms("5m");
    process.env.UPDATE_P4L_FROM_BLOCK_OFF = undefined;
    process.env.UPDATE_MSO_FROM_BLOCK_OFF = undefined;
    process.env.UPDATE_INSURACE_FROM_BLOCK_OFF = undefined;
    process.env.UPDATE_NEXUS_FROM_BLOCK_OFF = undefined;
    process.env.P4L_SYNC_TRANSACTIONS_OFF = undefined;
    process.env.MSO_SYNC_TRANSACTIONS_OFF = undefined;
    process.env.INSURACE_SYNC_TRANSACTIONS_OFF = undefined;
    process.env.NEXUS_SYNC_TRANSACTIONS_OFF = undefined;
}
config.sync_time_web3_smart_contract = ms("1s");

if (process.env.NODE_ENV && process.env.NODE_ENV == 'staging') {
    config.env = "staging";
    config.api_url = "https://staging-covercompared.polkacover.com/api/";
    config.web_url = "https://staging-covercompared.polkacover.com/";
    config.send_mail = true;
} else if (process.env.NODE_ENV && process.env.NODE_ENV == 'production') {
    config.env = "production";
    config.api_url = "https://app.covercompared.com/api/";
    config.web_url = "https://app.covercompared.com/";
    config.is_mainnet = true;
    config.send_mail = true;
    config.p4l_api_baseurl = "https://protect4less.com/app-api/";
}

if (process.env.SEND_MAIL && process.env.SEND_MAIL == 1) {
    config.send_mail = true;
}

console.log("Send Mail : ", config.send_mail);

config.insurace = {
    base_url: "https://insurace-sl-microservice.azurewebsites.net/",
    access_code: "VXS3K8XdLj1Gzr1xX2JtiQSi5fBphwBraEEMCmYbO26o2Ebv7lQUJQ=="
}
config.nexus = { base_url: "https://api.staging.nexusmutual.io/" }

if (process.env.NODE_ENV && process.env.NODE_ENV == 'production') {
    config.insurace.base_url = "https://api.insurace.io/ops/v1/";
    config.insurace.access_code = "BIJtkcwZVbqksdkGQphamIi6yXfUpd2cwIxeDs6jmT4uXYaWJwONIA==";

    config.nexus.base_url = "https://api.nexusmutual.io/";
}

module.exports = config;
