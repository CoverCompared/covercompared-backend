let config = {
    app_code: "cover-compared",
    cache_time: 300,
    api_url: "http://localhost:3006/api/"
}

if (process.env.NODE_ENV && process.env.NODE_ENV == 'staging') {
    config.api_url = "https://staging-covercompared.polkacover.com/api/";
}else if (process.env.NODE_ENV && process.env.NODE_ENV == 'production') {
    config.api_url = "https://covercompared.polkacover.com/api/";
}

module.exports = config;