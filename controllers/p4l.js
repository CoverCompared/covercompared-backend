var axios = require('axios');

const mongoose = require('mongoose');
const P4LToken = mongoose.model('P4LToken');

exports.forward = async (req, res, next) => {

    let allowdEnpoints = [
        "device-details"
    ]

    let endpoint = req.body.endpoint
    delete req.body.endpoint;
    
    let config = {
        method: 'post',
        url: `https://dev.protect4less.com/app-api/${endpoint}/`,
        headers: {
            'Authorization': await P4LToken.getToken(),
            'Content-Type': 'application/json'
        },
        data: req.body
    };


    axios(config)
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
