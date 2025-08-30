// Request logging middleware
const requestLogger = (req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
};

// Error handling middleware
const errorHandler = (error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
};

// 404 handler for API routes
const apiNotFound = (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
};

module.exports = {
    requestLogger,
    errorHandler,
    apiNotFound
};