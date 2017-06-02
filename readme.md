# Nimiq Blockchain [![Build Status](https://travis-ci.com/nimiq-network/core.svg?token=euFrib9MJMN33MCBswws&branch=master)](https://travis-ci.com/nimiq-network/core)

## Getting started 

### Installation
- Install latest NodeJs version (7.9.0)
- Install gulp: `npm install gulp -g`
- Install jasmine test framework: `npm install jasmine -g`
- Install dependencies: `npm install`
- Install NodeJs dependencies:
```
cd src/main/platform/nodejs/
npm install
cd <project root>
cd clients/nodejs/
npm install
```

### Run Testsuite
- `gulp test` runs the testsuite in your browser.
- `jasmine` runs the testsuite in NodeJs.

### Run ESLint
`gulp eslint` runs the ESLint javascript linter.

### Build
`gulp build` concatenates all sources into `dist/{web,web-babel,web-crypto,node}.js`

### Run Browser client
Open `clients/browser/index.html` in your browser.

### Run NodeJS client
```
cd clients/nodejs/
node index.js --host <hostname> --port <port> --key <privkey> --cert <certificate>
```

### Build your own Browser client
Just include `<script src="dist/nimiq.js"></script>` in your project.

### API Docs 
The [API Documentation is here](dist/api-documentation.md).
