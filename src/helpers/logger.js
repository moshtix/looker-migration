/* eslint no-console: 0 */

const root = {
    logError: (params) => root.log({ message: `Error: ${params.error.stack}` }),
    logWarning: (params) => root.log({ message: `Warning: ${params.message}` }),
    logDebug: (params) => root.log({ message: `Debug: ${params.message}` }),
    logInfo: (params) => root.log({ message: `Info: ${params.message}` }),
    log: (params) =>
        new Promise((resolve) => {
            console.log(params.message);
            resolve();
        }),
};

export default root;
