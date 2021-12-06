let config = {
    app_code: "cover-compared",
    cache_time: 300,
    api_url: "http://localhost:3006/api/",
    db: `${process.env.MONGODB_URL}${process.env.DATABASE_NAME}`,
    dbName: process.env.DATABASE_NAME,
    noreplay: `"Cover Compared" no-reply@polkacover.com`,
    subscribe_mail: "contact@polkacover.com",
    p4l_secret: process.env.P4L_SECRET,
    JWT_TOKEN_EXPIRY: 86400 // 24h
}

if (process.env.NODE_ENV && process.env.NODE_ENV == 'staging') {
    config.api_url = "https://staging-covercompared.polkacover.com/api/";
} else if (process.env.NODE_ENV && process.env.NODE_ENV == 'production') {
    config.api_url = "https://covercompared.polkacover.com/api/";
}

config.insurace = {
    base_url: "https://insurace-sl-microservice.azurewebsites.net/",
    access_code: "VXS3K8XdLj1Gzr1xX2JtiQSi5fBphwBraEEMCmYbO26o2Ebv7lQUJQ=="
}

if (process.env.NODE_ENV && process.env.NODE_ENV == 'production') {
    config.insurace.base_url = "https://api.insurace.io/ops/v1/";
    config.insurace.access_code = "BIJtkcwZVbqksdkGQphamIi6yXfUpd2cwIxeDs6jmT4uXYaWJwONIA==";
}

module.exports = config;