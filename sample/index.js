import logger from '../src/helpers/logger';
import { promoteEnvironment } from '../src';
var fs = require('fs').promises;

export const run = async () => {
    const pathToIdRsa = process.argv[2];
    const awsAccessKey = process.argv[3];
    const awsAccessSecret = process.argv[4];
    const s3Bucket = process.argv[5];
    const awsRegion = process.argv[6];
    const fromRepository = process.argv[7];
    const fromClientId = process.argv[8];
    const fromClientSecret = process.argv[9];
    const fromHost = process.argv[10];
    const toRepository = process.argv[11];
    const toClientId = process.argv[12];
    const toClientSecret = process.argv[13];
    const toHost = process.argv[14];
    const promoteLookContent = process.argv[15];
    const promoteLookml = process.argv[16];

    await logger.logDebug({
        message: 'object ' + JSON.stringify({
            fromRepository,
            fromClientId,
            fromClientSecret: '*************',
            fromHost,
            toRepository,
            toClientId,
            toClientSecret: '*************',
            toHost,
            pathToIdRsa,
            awsAccessKey,
            awsAccessSecret: '************',
            s3Bucket,
            awsRegion,
            promoteLookContent,
            promoteLookml
        }, null, 2)
    });
    const repositoryKey = await fs.readFile(pathToIdRsa, 'utf8');

    await promoteEnvironment({
        fromRepository,
        fromClientId,
        fromClientSecret,
        fromHost,
        toRepository,
        toClientId,
        toClientSecret,
        toHost,
        repositoryKey,
        awsAccessKey,
        awsAccessSecret,
        s3Bucket,
        awsRegion,
        runPromoteLookContent: promoteLookContent === undefined ? true : promoteLookContent === 'yes',
        runPromoteLookml: promoteLookml === undefined ? true : promoteLookml === 'yes'
    });
};

run();
