let config = {
    app_code: "cover-compared",
    cache_time: 300, // seconds
    api_url: "http://localhost:3006/api/",
    web_url: "http://localhost:3000/",
    db: `${process.env.MONGODB_URL}${process.env.DATABASE_NAME}`,
    dbName: process.env.DATABASE_NAME,
    noreplay: `"Cover Compared" no-reply@polkacover.com`,
    subscribe_mail: "contact@polkacover.com",
    p4l_secret: process.env.P4L_SECRET,
    JWT_TOKEN_EXPIRY: 86400, // 24h
    is_mainnet: false,
    SupportedChainId: {
        MAINNET: 1,
        RINKEBY: 4,
        KOVAN: 42,
    },
    email_images: {
        logo: "images/cover-compared.png"
    },
    social_links : {
        twitter: "https://twitter.com/PolkaCover",
        linkedin: "https://www.linkedin.com/company/PolkaCover",
        telegram: "https://t.me/PolkaCover",
        gitbook: "https://polkacover.gitbook.io"
    },
}

const INFURA_KEY = "92a35c94033b48c6a8d248ac76e7650e";
config.NETWORK_URLS = {
    [config.SupportedChainId.MAINNET]: `wss://mainnet.infura.io/ws/v3/${INFURA_KEY}`,
    [config.SupportedChainId.RINKEBY]: `wss://rinkeby.infura.io/ws/v3/${INFURA_KEY}`,
    [config.SupportedChainId.KOVAN]: `wss://kovan.infura.io/ws/v3/${INFURA_KEY}`,
}

if (process.env.NODE_ENV && process.env.NODE_ENV == 'staging') {
    config.api_url = "https://staging-covercompared.polkacover.com/api/";
    config.web_url = "https://staging-covercompared.polkacover.com/";
} else if (process.env.NODE_ENV && process.env.NODE_ENV == 'production') {
    config.api_url = "https://covercompared.polkacover.com/api/";
    config.web_url = "https://covercompared.polkacover.com/";
    config.is_mainnet = true;
}

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