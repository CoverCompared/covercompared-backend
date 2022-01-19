var axios = require('axios');

const mongoose = require('mongoose');
const config = require('../config');
const P4LToken = mongoose.model('P4LToken');

exports.forward = async (req, res, next) => {

    let allowdEnpoints = [
        "device-details"
    ]

    let endpoint = req.body.endpoint
    delete req.body.endpoint;
    
    let apiConfig = {
        method: 'post',
        url: `${config.p4l_api_baseurl}${endpoint}/`,
        headers: {
            'Authorization': await P4LToken.getToken(),
            'Content-Type': 'application/json'
        },
        data: req.body
    };


    axios(apiConfig)
        .then(function (response) {
            res
                .header("Content-Type", response.headers['content-type'])
                .status(response.status)
                .send(response.data)
        })
        .catch(function (error) {
            console.log("Error", error);
            res.status(error.response.status).send(error.response.data)
        });
}
