var axios = require('axios');

exports.forward = (req, res, next) => {

    let allowdEnpoints = [
        "device-details"
    ]

    let endpoint = req.body.endpoint
    delete req.body.endpoint;
    
    let config = {
        method: 'post',
        url: `https://dev.protect4less.com/app-api/${endpoint}/`,
        headers: {
            'Authorization': 'eyJhbGciOiJIUzI1NiJ9.eyJSb2xlIjoiQWRtaW4iLCJJc3N1ZXIiOiJJc3N1ZXIiLCJVc2VybmFtZSI6IkphdmFJblVzZSIsImV4cCI6MTYzMTE3NjE3NSwiaWF0IjoxNjMxMTc2MTc1fQ.y7lJdzWHIAyWLapDT_JiJUXr7N9w95PotYKYUxxD8KA',
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
            res.status(error.response.status).send(error.response.data)
        });
}
