module.exports = {
    apps: [
        {
            name: "modian-service",
            script: "./build/bin/www.js",
            watch: false,
            env: {
                "SERVER_PORT": 8090,
                "NODE_ENV": "development"
            },
            env_production: {
                "SERVER_PORT": 8090,
                "NODE_ENV": "production",
                "MONGODB_HOST": 'localhost',
                "MONGODB_DATABASE":'modianwiki',
                "MONGODB_PORT":'27017',
                "MONGODB_USER":'',
                "MONGODB_PWD":'',
                "SERVER_HOST":'',
                "QINIU_DOUPLOAD":'',
                "QINIU_PUBLIC_BUCKET_DOMAIN":'',
                "QINIU_ACCESS_KEY":'',
                "QINIU_SECRET_KEY":'',
                "QINIU_BUCKET":'',
                "EMAIL_HOST":'',
                "EMAIL_PORT":'',
                "EMAIL_USER":'',
                "EMAIL_PASS":'',
                "REGISTOR":''
            }
        }
    ]
};