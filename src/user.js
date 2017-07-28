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

const { generatePassword, getContainer } = require('./util');
const { poolConnect } = require('./db');

/**
 * This function create a user for the specified slack ID.
 */
function createUser(slackId) {
  return getContainer().auth.signupWithUsername(slackId, generatePassword())
    .then((profile) => {
      console.info(`Created user "${profile.id}" for "${slackId}".`);
      return {
        id: profile.id,
        slackId: slackId
      };
    }, (err) => {
      console.error(`Unable to create user for "${slackId}"`, err);
      return err;
    });
}

/**
 * This function find the user for the specified slack ID. If
 * the user does not exist, this function will resolve a promise with
 * `null`.
 */
function findSlackUser(slackId) {
  return new Promise((resolve, reject) => {
    poolConnect(function (err, client, done) {
      if (err !== undefined && err !== null) {
        reject(new Error(err));
        return;
      }

      client.query(
        'SELECT _auth.id FROM _auth LEFT JOIN "user" ON "user"._id = _auth.id WHERE "user".username = $1;',
        [slackId],
        function (queryErr, result) {
          done();

          if (queryErr !== undefined && queryErr !== null) {
            console.error('Unable to execute query for finding user', queryErr);
            reject(queryErr);
            return;
          }

          if (result.rows.length === 0) {
            resolve(null);
            return;
          }

          resolve({
            id: result.rows[0].id,
            slackId: slackId
          });
        }
      );
    });
  });
}

module.exports = {
  findSlackUser,
  createUser
};
