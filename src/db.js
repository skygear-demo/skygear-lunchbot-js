/**
 * Copyright 2015 Oursky Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const { botConfig } = require('./config');
const skygearCloud = require('skygear/cloud');

/**
 * Connect to a pg connection provied by skygear-node pg pool.
 * The pg connection is automatically set to use the application's database
 * schema.
 */
function poolConnect(callback) {
  if (botConfig.debugMode) {
    console.log('in poolConnect');
  }

  skygearCloud.pool.connect(function (err, client, done) {
    if (err !== null && err !== undefined) {
      console.error('Unable to connect to pg pool', err);
      callback(err, client, done);
      return;
    }

    const schemaName = `app_${botConfig.appName}`;
    const stmt = `SET search_path TO ${schemaName},public;`;
    client.query(stmt, function (queryErr) {
      if (queryErr !== null && queryErr !== undefined) {
        console.error(`Unable to select "${schemaName}" schema`, queryErr);
        callback(queryErr, client, done);
        return;
      }

      if (botConfig.debugMode) {
        console.log('poolConnect created a pg connection');
      }
      callback(null, client, done);
    });
  });
}

module.exports = {
  poolConnect
};
