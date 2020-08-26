import { promoteEnvironment } from '../src/looker';
var fs = require('fs').promises;

export const run = async () => {
    const pathToIdRsa = process.argv[1];
    const repositoryKey = await fs.readFile(pathToIdRsa, 'utf8');
    const awsAccessKey = process.argv[2];
    const awsAccessSecret = process.argv[3];
    const s3Bucket = process.argv[4];
    const awsRegion = process.argv[5];
    const fromRepository = process.argv[6];
    const fromClientId = process.argv[7];
    const fromClientSecret = process.argv[8];
    const fromHost = process.argv[9];
    const toRepository = process.argv[10];
    const toClientId = process.argv[11];
    const toClientSecret = process.argv[12];
    const toHost = process.argv[13];
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
        awsRegion
    });
};

run();
