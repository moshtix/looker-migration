import logger from '../src/helpers/logger';
import { promoteEnvironment } from '../src';
var fs = require('fs').promises;

export const run = async () => {
    const pathToIdRsa = process.argv[2];
    const fromRepository = process.argv[3];
    const toRepository = process.argv[4];

    await logger.logDebug({
        message: 'object ' + JSON.stringify({
            fromRepository,
            toRepository,
            pathToIdRsa,
        }, null, 2)
    });
    const repositoryKey = await fs.readFile(pathToIdRsa, 'utf8');

    await promoteEnvironment({
        fromRepository,
        toRepository,
        repositoryKey,
    });
};

run();
