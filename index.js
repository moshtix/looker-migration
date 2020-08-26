import { promoteEnvironment } from 'MoshtixShared/helper-looker';
import configuration from 'Configuration';
var fs = require('fs').promises;

export const execute = async () => {
    const pathToIdRsa = process.argv[1];
    const repositoryKey = await fs.readFile(pathToIdRsa, 'utf8');
    const awsAccessKey = process.argv[2];
    const awsAccessSecret = process.argv[3];
    const s3Bucket = process.argv[4];
    const awsRegion = process.argv[5];
    await promoteEnvironment({
        fromRepository: configuration.looker.lookerStageRepository,
        fromClientId: configuration.looker.lookerStageClientId,
        fromClientSecret: configuration.looker.lookerStageClientSecret,
        fromHost: configuration.looker.lookerStageHost,
        toRepository: configuration.looker.lookerProductionRepository,
        toClientId: configuration.looker.lookerProductionClientId,
        toClientSecret: configuration.looker.lookerProductionClientSecret,
        toHost: configuration.looker.lookerProductionHost,
        repositoryKey,
        awsAccessKey,
        awsAccessSecret,
        s3Bucket,
        awsRegion
    });
};

export default execute;
