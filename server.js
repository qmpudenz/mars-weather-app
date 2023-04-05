const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = 3000;

// Use the cors middleware
app.use(cors());

app.get('/mars_weather', (req, res) => {
    const filePath = __dirname + '/mars_weather.json';

    fs.stat(filePath, (err, stats) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.status(404).send('Mars weather data not found. Make sure to run the scraper first.');
            } else {
                res.status(500).send('An error occurred while reading the file.');
            }
        } else {
            res.sendFile(filePath);
        }
    });
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
