import logger from 'logger';

const { exec } = require('child_process');

export const runCommand = async (command, options) => {
    await logger.logDebug({ message: `command ${JSON.stringify(command)}` });
    return new Promise((resolve, reject) => {
        exec(command, options, (err, stdout, stderr) => {
            if (err != null) {
                logger.logDebug({ message: `err ${JSON.stringify(err)}` });
                reject(new Error(err));
            } else if (typeof (stderr) !== 'string') {
                logger.logDebug({ message: `stderr ${JSON.stringify(stderr)}` });
                reject(Error(stderr));
            } else {
                logger.logDebug({ message: `stdout ${JSON.stringify(stdout)}` });
                resolve(stdout);
            }
        });
    });
};
