const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000; // Running on port 5000 so it doesn't conflict with React

// Middleware
app.use(cors()); // Allows your React app to fetch data
app.use(express.json()); // Allows your server to parse incoming JSON data

// Sample Route (Your API endpoint)
app.get('/api/content', (req, res) => {
    res.json({
        title: "Anything in your city, delivered in minutes",
        subtitle: "From your favorite local restaurants to grocery stores and pharmacies."
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running smoothly on http://localhost:${PORT}`);
});