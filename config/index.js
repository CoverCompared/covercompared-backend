let config = {
    app_code: "cover-compared",
    cache_time: 300,
    api_url: "http://localhost:3006/"
}

if (process.env.NODE_ENV && process.env.NODE_ENV == 'staging') {
    config.api_url = "";
}else if (process.env.NODE_ENV && process.env.NODE_ENV == 'production') {
    config.api_url = "";
}

module.exports = config;