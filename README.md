# looker-migration

Node.js implementation of the open source gzr tool https://github.com/looker-open-source/gzr written in ruby.

Usage:

```
npm run build && \
node dist/sample/index.js \
<pathToIdRsa> \
<fromRepository> \
<toRepository> \
```

where

```
pathToIdRsa = path to rsa file containing key for repository access
fromRepository = name of git repository ie moshtix/name-of-repo
toRepository = the git repository migrating code to
```

Dashboard migration by following the Import method in gzr.

https://github.com/looker-open-source/gzr/blob/c0a4e8758203e8c22a36857b69d5d2d5867bc2c1/lib/gzr/commands/dashboard/import.rb#L202

### known issues

- fails if attempting to sync outside of root shared folder. Needs matching folder id in destination. need to create folder during sync see https://moshtixdev.au.looker.com:19999/api-docs/index.html#!/3.1/Folder
- some dashboards being updated when no changes.
