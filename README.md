# looker-migration

Node.js implementation of the open source gzr tool https://github.com/looker-open-source/gzr written in ruby.

Usage:

```
npm run build && \
node dist/sample/index.js \
<pathToIdRsa> \
<awsAccessKey> \
<awsAccessSecret> \
<s3Bucket> \
<awsRegion> \
<fromRepository> \
<fromClientId> \
<fromClientSecret> \
<fromHost> \
<toRepository> \
<toClientId> \
<toClientSecret> \
<toHost> \
```

where

```
pathToIdRsa = path to rsa file containing key for repository access
awsAccessKey = aws environment access key
awsAccessSecret = aws access secret
s3Bucket = aws s3 to back up json dashboard priort to migration
awsRegion = aws region s3 belongs
fromRepository = name of git repository ie moshtix/name-of-repo
fromClientId = looker client id for interacting with the looker API
fromClientSecret = looker client secret for interacting with the looker API
fromHost = the looker host migrating from
toRepository = the git repository migrating code to
toClientId = the client id for interacting with the looker API for the environment migrating to
toClientSecret = the client secret for interacting with the looker APU for the environment migrating to
toHost = the looker host migrating to
```

Dashboard migration by following the Import method in gzr.

https://github.com/looker-open-source/gzr/blob/c0a4e8758203e8c22a36857b69d5d2d5867bc2c1/lib/gzr/commands/dashboard/import.rb#L202

### known issues

- fails if attempting to sync outside of root shared folder. Needs matching folder id in destination. need to create folder during sync see https://moshtixdev.au.looker.com:19999/api-docs/index.html#!/3.1/Folder
- some dashboards being updated when no changes.
