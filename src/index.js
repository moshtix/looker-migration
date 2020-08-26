/* eslint-disable camelcase */
import logger from './helpers/logger';
import { get } from 'object-path';
import { runCommand } from './helpers/command-runner';
import { upload, getS3Object } from './helpers/helper-content-s3';

const fs = require('fs');
const { execSync } = require('child_process');

const https = require('https');
const crypto = require('crypto');
const querystring = require('querystring');

const port = 19999;

const genericRequest = ({ path, token, method, data, host }) => new Promise((resolve, reject) => {
    const options = {
        path,
        host,
        port,
        headers: token ? {
            Authorization: `token ${token}`,
        } : undefined,
        method,
    };

    logger.logDebug({ message: `options ${JSON.stringify(options)}` });

    const req = https.request(options, (res) => {
        res.setEncoding('utf8');
        let dataResult = '';
        res.on('data', (chunk) => {
            dataResult += chunk;
        });
        res.on('end', async () => {
            try {
                const resultObject = dataResult && dataResult.length > 0 ? JSON.parse(dataResult) : '';
                resolve(resultObject);
            } catch (exception) {
                await logger.logDebug({ message: `ERROR: ${JSON.stringify({ result: dataResult, exception, path, method, data: JSON.stringify(data) })}` });
                throw Error(exception);
            }
        });
    });

    req.on('error', (e) => {
        reject(e);
    });
    if (data) {
        // Write data to request body
        req.write(data);
    }
    req.end();
});

const getRequest = (params) => genericRequest({ ...params, method: 'GET' });
const postRequest = (params) => genericRequest({ ...params, method: 'POST' });
const patchRequest = (params) => genericRequest({ ...params, method: 'PATCH' });
const deleteRequest = (params) => genericRequest({ ...params, method: 'DELETE' });

export const getLoginToken = async ({ clientId, clientSecret, host }) => {
    const data = `client_id=${clientId}&client_secret=${clientSecret}`;
    const path = '/api/3.1/login';
    const result = await postRequest({ data, path, host });
    return result.access_token;
};

export const getUser = ({ token }) => {
    const path = '/api/3.0/user';
    return getRequest({ path, token });
};

export const getDashboards = ({ token, host }) => {
    const path = '/api/3.1/dashboards';
    return getRequest({ path, token, host });
};

export const addDashboard = ({ token, host, data }) => {
    const path = '/api/3.1/dashboards';
    return postRequest({ path, token, host, data: JSON.stringify(data) });
};

export const addQuery = ({ token, host, query }) => {
    const path = '/api/3.1/queries';
    return postRequest({ path, token, host, data: JSON.stringify(query) });
};

export const addMergeQuery = ({ token, host, mergeQuery }) => {
    const path = '/api/3.1/merge_queries';
    return postRequest({ path, token, host, data: JSON.stringify(mergeQuery) });
};

export const addLook = ({ token, host, look }) => {
    const path = '/api/3.1/looks';
    return postRequest({ path, token, host, data: JSON.stringify(look) });
};

export const getDashboard = ({ token, host, id }) => {
    const path = `/api/3.1/dashboards/${id}`;
    return getRequest({ path, token, host });
};

export const getDashboardFilters = ({ token, host, dashboardId }) => {
    const path = `/api/3.1/dashboards/${dashboardId}/dashboard_filters`;
    return getRequest({ path, token, host });
};

export const deleteFilter = ({ token, host, id }) => {
    const path = `/api/3.1/dashboard_filters/${id}`;
    return deleteRequest({ path, token, host });
};

export const addFilter = ({ token, host, data }) => {
    const path = '/api/3.1/dashboard_filters';
    return postRequest({ path, token, host, data: JSON.stringify(data) });
};

export const getDashboardElements = ({ token, host, dashboardId }) => {
    const path = `/api/3.1/dashboards/${dashboardId}/dashboard_elements`;
    return getRequest({ path, token, host });
};

export const deleteElement = ({ token, host, id }) => {
    const path = `/api/3.1/dashboard_elements/${id}`;
    return deleteRequest({ path, token, host });
};

export const addElement = ({ token, host, data }) => {
    const path = '/api/3.1/dashboard_elements';
    return postRequest({ path, token, host, data: JSON.stringify(data) });
};

export const getDashboardLayouts = ({ token, host, dashboardId }) => {
    const path = `/api/3.1/dashboards/${dashboardId}/dashboard_layouts`;
    return getRequest({ path, token, host });
};

export const deleteLayout = ({ token, host, id }) => {
    const path = `/api/3.1/dashboard_layouts/${id}`;
    return deleteRequest({ path, token, host });
};

export const addLayout = ({ token, host, data }) => {
    const path = '/api/3.1/dashboard_elements';
    return postRequest({ path, token, host, data: JSON.stringify(data) });
};

export const updateDashboard = ({ token, host, id, data }) => {
    const path = `/api/3.1/dashboards/${id}`;
    return patchRequest({ path, token, host, data: JSON.stringify(data) });
};

export const getDashboardLookML = ({ token, host, id }) => {
    const path = `/api/3.1/dashboards/lookml/${id}`;
    return getRequest({ path, token, host });
};

export const createUser = ({ token, user }) => {
    const path = '/api/3.1/users';
    return postRequest({ path, token, data: JSON.stringify(user) });
};

const logDashboards = async ({ dashboards }) => {
    await logger.logDebug({
        message: `contentMappings simple ${JSON.stringify(dashboards.map((item) => ({
            ...item,
            from: {
                id: item.from.id,
                slug: item.from.slug,
                title: item.from.title,
            },
            to:
            {
                id: item.to.id,
                slug: item.to.slug,
                title: item.to.title,
            },
        })), null, 2)}`,
    });
};

export const createDashboard = async ({ fromDashboardId, toDashBoardId, fromToken, fromHost, toToken, toHost }) => {
    const destinationDashboardId = toDashBoardId;
    const sourceDashboardId = fromDashboardId;


    await logger.logDebug({ message: `destinationDashboardId ${JSON.stringify(destinationDashboardId)}` });
    // add filters
    let sourceDashboardFilters = await getDashboardFilters({ token: fromToken, host: fromHost, dashboardId: sourceDashboardId });
    await logger.logDebug({ message: `adding ${sourceDashboardFilters.length} filters to dashboard ${destinationDashboardId}` });
    if (sourceDashboardFilters.length > 0) {
        sourceDashboardFilters = await Promise.all(sourceDashboardFilters.map(async (dashboardFilter) => {
            const newDashboardFilter = {...dashboardFilter};
            await logger.logDebug({ message: `adding dashboardFilter.id ${dashboardFilter.id} from dashboard ${sourceDashboardId} to dashboard ${destinationDashboardId}` });
            newDashboardFilter.dashboard_id = destinationDashboardId;
            await addFilter({ token: toToken, host: toHost, data: newDashboardFilter });
            return newDashboardFilter;
        }));
    }
    // add elements
    let sourceDashboardElements = await getDashboardElements({ token: fromToken, host: fromHost, dashboardId: sourceDashboardId });
    await logger.logDebug({ message: `adding ${sourceDashboardElements.length} elements to dashboard ${destinationDashboardId}` });
    if (sourceDashboardElements.length > 0) {
        // reversed engineered from here
        // https://github.com/looker-open-source/gzr/blob/c0a4e8758203e8c22a36857b69d5d2d5867bc2c1/lib/gzr/commands/dashboard/import.rb#L202
        sourceDashboardElements = await Promise.all(sourceDashboardElements.map(async (dashboardElement) => {
            // looks
            const newDashboardElement = {...dashboardElement};
            const sourceLook = dashboardElement.look;
            if (sourceLook) {
                await logger.logDebug({ message: `adding sourceLook ${JSON.stringify(sourceLook)}` });
                const sourceLookQuery = { ...sourceLook.query, client_id: undefined };
                const newDestinationLookQuery = await addQuery({ token: toToken, host: toHost, query: sourceLookQuery });
                const newDestinationLook = { ...sourceLook, id: undefined, client_id: undefined, query_id: newDestinationLookQuery.id, space_id: undefined, folder_id: undefined, user_id: null };
                const newDestinationLookResult = await addLook({ token: toToken, host: toHost, look: newDestinationLook });
                newDashboardElement.look_id = newDestinationLookResult.id;
                newDashboardElement.query_id = null;
                newDashboardElement.merge_result_id = null;
                newDashboardElement.query = undefined;
                newDashboardElement.merge_result = undefined;
            } else {
                // queries
                const sourceQuery = get(dashboardElement, 'result_maker.query', null) || get(dashboardElement, 'query');
                if (sourceQuery) {
                    const newDestinationQuery = { ...sourceQuery, id: undefined, client_id: undefined };
                    const newDestinationQueryResult = await addQuery({ token: toToken, host: toHost, query: newDestinationQuery });
                    newDashboardElement.look_id = null;
                    newDashboardElement.query_id = newDestinationQueryResult.id;
                    newDashboardElement.merge_result_id = null;
                    newDashboardElement.look = undefined;
                    newDashboardElement.merge_result = undefined;
                } else {
                    // merge results
                    const sourceMergeResult = get(dashboardElement, 'result_maker.merge_result', null) || get(dashboardElement, 'merge_result');
                    if (sourceMergeResult) {
                        const sourceQueries = await Promise.all(sourceMergeResult.source_queries.map(async (sourceQueryItem) => {
                            const newSourceQuery = { ...sourceQueryItem.query, client_id: undefined };
                            const newSourceQueryResult = await addQuery({ token: toToken, host: toHost, query: newSourceQuery });
                            return {
                                query_id: newSourceQueryResult.id,
                                name: sourceQueryItem.name,
                                merge_fields: sourceQueryItem.merge_fields,
                            };
                        }));
                        const newDestinationMergeQuery = { ...sourceMergeResult, id: undefined, client_id: undefined, source_queries: sourceQueries };
                        const newDestinationMergeQueryResult = await addMergeQuery({ token: toToken, host: toToken, mergeQuery: newDestinationMergeQuery });
                        newDashboardElement.look_id = null;
                        newDashboardElement.query_id = null;
                        newDashboardElement.merge_result_id = newDestinationMergeQueryResult.id;
                        newDashboardElement.query = undefined;
                        newDashboardElement.look = undefined;
                    }
                }
            }

            // TODO update colours as well? queries + merged results
            //     find_vis_config_reference(new_merge_result) do | vis_config |
            //       find_color_palette_reference(vis_config) do | o, default_colors |
            //         update_color_palette!(o, default_colors)
            //   end
            // end

            // result makers
            const sourceResultMaker = get(dashboardElement, 'result_maker', null);
            newDashboardElement.result_maker_id = null;
            if (sourceResultMaker) {
                newDashboardElement.result_maker = { filterables: sourceResultMaker.filterables };
            }

            await logger.logDebug({ message: `adding dashboardElement.id ${dashboardElement.id} from dashboard ${sourceDashboardId} to dashboard ${destinationDashboardId}` });
            newDashboardElement.id = undefined;
            newDashboardElement.query = undefined;
            newDashboardElement.look = undefined;
            newDashboardElement.dashboard_id = destinationDashboardId;
            await addElement({ token: toToken, host: toHost, data: newDashboardElement });
            return newDashboardElement;
        }));
    }
    // add layouts
    const sourceDashboardLayouts = await getDashboardLayouts({ token: fromToken, host: fromHost, dashboardId: sourceDashboardId });
    await logger.logDebug({ message: `adding ${sourceDashboardLayouts.length} layouts to dashboard ${destinationDashboardId}` });
    if (sourceDashboardLayouts.length > 0) {
        await Promise.all(sourceDashboardLayouts.map(async (dashboardLayout) => {
            const newDashboardLayout = {...dashboardLayout};
            await logger.logDebug({ message: `adding dashboardLayout.id ${dashboardLayout.id} from dashboard ${sourceDashboardId} to dashboard ${destinationDashboardId}` });
            newDashboardLayout.dashboard_id = destinationDashboardId;
            await addLayout({ token: toToken, host: toHost, data: newDashboardLayout });
        }));
    }
};

const backupDashboardToS3IfChanged = async ({ dashboard, id, slug, environment, awsAccessKey, awsAccessSecret, s3Bucket, awsRegion}) => {
    const accessKeyId = awsAccessKey;
    const secretAccessKey = awsAccessSecret;
    const { region } = awsRegion;

    const fileName = `${environment}/${id}-${slug}.json`;

    const existingJsonFile = await getS3Object({ bucket: s3Bucket, region, accessKeyId, secretAccessKey, key: fileName });
    let changed;

    if (existingJsonFile === null) {
        changed = true;
        await logger.logDebug({ message: `Dashboard ${JSON.stringify({ id })} does NOT exist in ${environment}` });
    } else {
        const jsonParsed = JSON.parse(Buffer.from(existingJsonFile.Body).toString('utf8'));
        if (jsonParsed === dashboard) {
            await logger.logDebug({ message: `Dashboard ${JSON.stringify({ id })} NOT changed in ${environment}` });
            changed = false;
        } else {
            await logger.logDebug({ message: `Dashboard ${JSON.stringify({ id })} changed in ${environment}` });
            changed = true;
            await upload({
                key: fileName,
                bucket: s3Bucket,
                data: Buffer.from(JSON.stringify(dashboard)),
                contentType: 'application/json; charset=utf-8',
                region,
                accessKeyId,
                secretAccessKey,
            });
        }
    }
    return changed;
};

const promoteLookContent = async ({ fromToken, fromHost, toToken, toHost, awsAccessKey, awsAccessSecret, s3Bucket, awsRegion }) => {
    await logger.logDebug({ message: `{ fromToken, fromHost, toToken, toHost } ${JSON.stringify({ fromToken, fromHost, toToken, toHost })}` });
    const fromDashboards = await getDashboards({ token: fromToken, host: fromHost });
    const fromDashboardsWithExtraInformation = await Promise.all(fromDashboards.map(async (item) => ({
        ...(await getDashboard({ host: fromHost, token: fromToken, id: item.id })),
        lookml: (await getDashboardLookML({ host: fromHost, token: fromToken, id: item.id })).lookml,
    })));

    const toDashboards = await getDashboards({ token: toToken, host: toHost });
    const toDashboardsWithExtraInformation = await Promise.all(
        toDashboards.map(async (item) => ({
            ...(await getDashboard({ host: toHost, token: toToken, id: item.id })),
            lookml: (await getDashboardLookML({ host: toHost, token: toToken, id: item.id })).lookml,
        })));

    const contentMappings = fromDashboardsWithExtraInformation.map((item) => {
        const userDefined = Number.isInteger(item.id);
        const toDashboard = userDefined ?
            toDashboardsWithExtraInformation.find((toDashboardItem) => toDashboardItem.slug === item.slug) :
            toDashboardsWithExtraInformation.find((toDashboardItem) => toDashboardItem.id === item.id);

        const toDashboardExists = toDashboard !== undefined;

        return {
            existsInDestination: toDashboardExists,
            deletedInSource: item.deleted,
            userDefined,
            fullMatch: toDashboardExists ? toDashboard.slug === item.slug && toDashboard.title === item.title : false,
            slugMatch: toDashboardExists ? toDashboard.slug === item.slug : false,
            from: item,
            to: toDashboardExists ? toDashboard : null,
        };
    });

    await logDashboards({ dashboards: contentMappings });

    await Promise.all(
        contentMappings
            .filter((contentMapping) => contentMapping.userDefined) // only upload user defined
            .map(async (item) => {
                const sourceDashboardId = item.from.id;
                let destinationDashboardId;
                const data = fromDashboardsWithExtraInformation.find((devDash) => devDash.id === sourceDashboardId);
                // back up source look ml
                let dashboardData = JSON.stringify(fromDashboardsWithExtraInformation.find((sourceDashboardItem) => item.from.id === sourceDashboardItem.id));
                const dashboardChanged = await backupDashboardToS3IfChanged({ dashboard: dashboardData, id: sourceDashboardId, slug: item.from.slug, environment: fromHost });
                if (dashboardChanged) {
                    if (item.existsInDestination) {
                        // back up destination look ml
                        dashboardData = JSON.stringify(toDashboardsWithExtraInformation.find((destinationDashboardItem) => item.to.id === destinationDashboardItem.id));
                        await logger.logDebug({ message: `Uploading destination dashboard to s3 for dashboard id ${JSON.stringify(item.to.id)}` });
                        await backupDashboardToS3IfChanged({ dashboard: dashboardData, id: item.to.id, slug: item.to.slug, environment: toHost, awsAccessKey, awsAccessSecret, s3Bucket, awsRegion  });
                        await logger.logDebug({ message: `Uploaded destination dashboard to s3 for dashboard id ${JSON.stringify(item.to.id)}` });
                    }

                    if (item.existsInDestination) {
                        destinationDashboardId = item.to.id;
                        // update board
                        await logger.logDebug({ message: `updating board ${JSON.stringify({ from: sourceDashboardId, to: destinationDashboardId })}` });
                        const result = await updateDashboard({ token: toToken, host: toHost, id: destinationDashboardId, data });
                        if (result.id === destinationDashboardId) {
                            // delete filters
                            const destinationDashboardFilters = await getDashboardFilters({ token: toToken, host: toHost, dashboardId: destinationDashboardId });
                            await logger.logDebug({ message: `deleting ${destinationDashboardFilters.length} filters from dashboard ${destinationDashboardId}` });
                            if (destinationDashboardFilters.length > 0) {
                                await Promise.all(destinationDashboardFilters.map((dashboardFilter) => deleteFilter({ token: toToken, host: toHost, id: dashboardFilter.id })));
                            }
                            // delete elements
                            const destinationDashboardElements = await getDashboardElements({ token: toToken, host: toHost, dashboardId: destinationDashboardId });
                            await logger.logDebug({ message: `deleting ${destinationDashboardElements.length} elements from dashboard ${destinationDashboardId}` });
                            if (destinationDashboardElements.length > 0) {
                                await Promise.all(destinationDashboardElements.map((dashboardElements) => deleteElement({ token: toToken, host: toHost, id: dashboardElements.id })));
                            }
                            // delete layouts
                            const destinationDashboardLayouts = await getDashboardLayouts({ token: toToken, host: toHost, dashboardId: destinationDashboardId });
                            await logger.logDebug({ message: `deleting ${destinationDashboardLayouts.length} layouts from dashboard ${destinationDashboardId}` });
                            if (destinationDashboardLayouts.length > 0) {
                                await Promise.all(destinationDashboardLayouts.map((dashboardLayout) => deleteLayout({ token: toToken, host: toHost, id: dashboardLayout.id })));
                            }
                        } else {
                            await logger.logDebug({ message: `update failed ${JSON.stringify({ item, result })}` });
                        }
                    } else {
                        // create board
                        await logger.logDebug({ message: `creating board ${JSON.stringify(item)}` });
                        // add dashboard
                        const newDashboard = await addDashboard({ token: toToken, host: toHost, data });
                        await logger.logDebug({ message: `newDashboard ${JSON.stringify(newDashboard)}` });
                        destinationDashboardId = newDashboard.id;
                    }
                    // create dashboard elements/layout/filters
                    await createDashboard({ fromDashboardId: sourceDashboardId, toDashBoardId: destinationDashboardId, fromHost, toHost, fromToken, toToken });
                }
            }));
};

const nonce = (len) => {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < len; i++) { text += possible.charAt(Math.floor(Math.random() * possible.length)); }
    return text;
};

const forceUnicodeEncoding = (string) => decodeURIComponent(encodeURIComponent(string));

export const createSSOUrl = async (options) => {
    const { secret } = options;

    // user options
    const json_external_user_id = JSON.stringify(options.external_user_id);
    const json_first_name = JSON.stringify(options.first_name);
    const json_last_name = JSON.stringify(options.last_name);
    const json_permissions = JSON.stringify(options.permissions);
    const json_models = JSON.stringify(options.models);
    const json_group_ids = JSON.stringify(options.group_ids);
    const json_external_group_id = JSON.stringify(options.external_group_id || '');
    const json_user_attributes = JSON.stringify(options.user_attributes || {});
    const json_access_filters = JSON.stringify(options.access_filters);

    // url/session specific options
    const embed_path = `/login/embed/${encodeURIComponent(options.embed_url)}`;
    const json_session_length = JSON.stringify(options.session_length);
    const json_force_logout_login = JSON.stringify(options.force_logout_login);

    // computed options
    const json_time = JSON.stringify(Math.floor((new Date()).getTime() / 1000));
    const json_nonce = JSON.stringify(nonce(16));

    // compute signature
    let string_to_sign = '';
    string_to_sign += `${options.host}\n`;
    string_to_sign += `${embed_path}\n`;
    string_to_sign += `${json_nonce}\n`;
    string_to_sign += `${json_time}\n`;
    string_to_sign += `${json_session_length}\n`;
    string_to_sign += `${json_external_user_id}\n`;
    string_to_sign += `${json_permissions}\n`;
    string_to_sign += `${json_models}\n`;
    string_to_sign += `${json_group_ids}\n`;
    string_to_sign += `${json_external_group_id}\n`;
    string_to_sign += `${json_user_attributes}\n`;
    string_to_sign += json_access_filters;

    const signature = crypto.createHmac('sha1', secret).update(forceUnicodeEncoding(string_to_sign)).digest('base64').trim();

    // construct query string
    const query_params = {
        nonce: json_nonce,
        time: json_time,
        session_length: json_session_length,
        external_user_id: json_external_user_id,
        permissions: json_permissions,
        models: json_models,
        access_filters: json_access_filters,
        first_name: json_first_name,
        last_name: json_last_name,
        group_ids: json_group_ids,
        external_group_id: json_external_group_id,
        user_attributes: json_user_attributes,
        force_logout_login: json_force_logout_login,
        signature,
    };

    const query_string = querystring.stringify(query_params);

    return `https://${options.host + embed_path}?${query_string}`;
};


const addRequiredFiles = async ({ repositoryKey }) => {
    fs.writeFileSync('/tmp/known_hosts', 'github.com,192.30.252.*,192.30.253.*,192.30.254.*,192.30.255.* ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAq2A7hRGmdnm9tUDbO9IDSwBK6TbQa+PXYPCPy6rbTrTtw7PHkccKrpp0yVhp5HdEIcKr6pLlVDBfOLX9QUsyCOV0wzfjIJNlGEYsdlLJizHhbn2mUjvSAHQqZETYP81eFzLQNnPHt4EVVUh7VfDESU84KezmD5QlWpXLmvU31/yMf+Se8xhHTvKSCZIFImWwoG6mbUoWf9nzpIoaSjB+weqqUUmpaaasXVal72J+UX2B+2RPW3RcT0eOzQgqlJL3RKrTJvdsjE3JEAvGq3lGHSZXy28G3skua2SmVi/w4yCE6gbODqnTWlg7+wC604ydGXA8VJiS5ap43JXiUFFAaQ==');
    fs.writeFileSync('/tmp/id_rsa', repositoryKey);
    execSync('chmod 400 /tmp/id_rsa', { encoding: 'utf8', stdio: 'inherit' });
};

const promoteLookml = async ({ repositoryKey, fromRepository, toRepository }) => {
    await runCommand('rm -rf /tmp/*');
    await addRequiredFiles({ repositoryKey });

    process.env.GIT_SSH_COMMAND = 'ssh -i /tmp/id_rsa -o StrictHostKeyChecking=no -o UserKnownHostsFile=/tmp/known_hosts';
    const workingGitDirectory = `/tmp/${fromRepository}`;

    // promote code in git
    await runCommand(`git clone git@github.com:moshtix/${fromRepository}.git`, { cwd: '/tmp' });
    await runCommand(`ls ${workingGitDirectory}`, { cwd: workingGitDirectory });
    await runCommand('git pull', { cwd: workingGitDirectory });
    await runCommand('git status', { cwd: workingGitDirectory });
    await runCommand(`git remote add stage git@github.com:moshtix/${toRepository}.git`, { cwd: workingGitDirectory });
    await runCommand('git remote -v', { cwd: workingGitDirectory });
    await runCommand('git pull stage master --ff-only --allow-unrelated-histories', { cwd: workingGitDirectory });
    await runCommand('git merge stage/master --allow-unrelated-histories', { cwd: workingGitDirectory });
    await runCommand('git push stage master', { cwd: workingGitDirectory });

    // promote dashboard content with looker deploy
};

export const promoteEnvironment = async ({ fromClientId, fromClientSecret, toClientId, toClientSecret, fromHost, toHost, repositoryKey, fromRepository, toRepository, awsAccessKey, awsAccessSecret, s3Bucket, awsRegion }) => {
    const toToken = await getLoginToken({ clientId: toClientId, clientSecret: toClientSecret, host: toHost });
    const fromToken = await getLoginToken({ clientId: fromClientId, clientSecret: fromClientSecret, host: fromHost });
    await promoteLookContent({ fromToken, fromHost, toToken, toHost, awsAccessKey, awsAccessSecret, s3Bucket, awsRegion });
    await promoteLookml({ repositoryKey, fromRepository, toRepository });
};
