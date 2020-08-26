import AWS from 'aws-sdk';

export const getS3Object = async ({ bucket, region, accessKeyId, secretAccessKey, key }) => {
    AWS.config.update({
        region,
        accessKeyId,
        secretAccessKey,
    });

    const s3Params = {
        Key: key,
    };

    const s3 = new AWS.S3({ params: { Bucket: `${bucket}` } });

    return new Promise((resolve, reject) => {
        s3.getObject(s3Params, (error, data) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    });
};

export const upload = (params) => {
    const { region, accessKeyId, secretAccessKey, bucket, data, key, contentType } = params;

    return new Promise((resolve, reject) => {
        AWS.config.update({
            region,
            accessKeyId,
            secretAccessKey,
        });

        const s3Data = {
            Key: key,
            Body: data,
            ContentType: contentType,
        };

        const s3 = new AWS.S3({ params: { Bucket: bucket } });
        s3.upload(s3Data, (err, uploadData) => {
            if (err) {
                reject(err);
            } else {
                resolve({
                    url: uploadData.Location,
                    name: uploadData.Key,
                });
            }
        });
    });
};

export const moveFile = async (params) => {
    const {
        sourceKey,
        destinationKey,
        destinationFolder,
        sourceBucket,
        destinationBucket,
        accessKeyId,
        secretAccessKey,
        region,
    } = params;

    const acl = params.acl || 'private';

    AWS.config.update({
        region,
        accessKeyId,
        secretAccessKey,
    });

    const s3Params = {
        CopySource: `${sourceBucket}/${sourceKey}`,
        Key: `${destinationFolder}${destinationKey}`,
        ACL: acl,
    };

    const s3 = new AWS.S3({ params: { Bucket: `${destinationBucket}` } });

    return new Promise((resolve, reject) => {
        s3.copyObject(s3Params, (error) => {
            if (error) {
                reject(error);
            } else {
                resolve({
                    destinationBucket,
                    key: destinationKey,
                });
            }
        });
    });
};

export const getS3Link = (params) =>
    new Promise((resolve, reject) => {
        const { key, contentType } = params;
        const { expires } = params.expires;
        const { awsFileUploadTemporaryBucketName } = params.awsConfig.s3;

        AWS.config.update({
            region: params.awsConfig.region,
            accessKeyId: params.awsConfig.awsAccessKey,
            secretAccessKey: params.awsConfig.awsAccessSecret,
        });

        const s3Params = {
            Bucket: awsFileUploadTemporaryBucketName,
            Key: `${key}`,
            Expires: expires,
            ACL: 'private',
            ContentType: contentType,
        };

        const s3 = new AWS.S3();
        s3.getSignedUrl('putObject', s3Params, (err, url) => {
            if (err) {
                reject(err);
            } else {
                resolve(url);
            }
        });
    });

const root = {
    getS3Link,
    getS3Object,
    moveFile,
    upload,
};

export default root;
