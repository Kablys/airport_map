module.exports = {
    rules: {
        valid: true,
        "elm-content": true,
        "attr-pattern": {
            "class": /^[a-z][a-z0-9\-]*$/
        }
    },
    ignore: [
        "node_modules/**",
        "dist/**",
        ".git/**",
        ".kiro/**"
    ]
}