
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = {
    port: 3000,
    server: {
        baseDir: "./frontend",
        middleware: {
            1: createProxyMiddleware({
                target: 'http://localhost:8000',
                changeOrigin: true,
                pathFilter: '/api'
            })
        }
    },
    files: ["frontend/**/*.{html,htm,css,js}"]
};
