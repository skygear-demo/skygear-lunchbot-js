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

const skygear = require('skygear');
const skygearCloud = require('skygear/cloud');
const _ = require('lodash');
const { IncomingWebhook } = require('@slack/client');

const { findSlackUser, createUser } = require('./user');
const { getContainer } = require('./util');
const { botConfig } = require('./config');
const { LunchProposal, LunchPlace } = require('./models');

/**
 * Returns a slack IncomingWebhook. Return null if the slack URL is not valid.
 */
function webhookOrNull(slackUrl) {
  if (slackUrl === undefined || slackUrl === null || slackUrl === '') {
    return null;
  }
  return new IncomingWebhook(slackUrl);
}

/**
 * Show help.
 */
function showHelp() {
  if (botConfig.debugMode) {
    console.log('in showHelp');
  }
  const commands = [
    'help - for this help',
    'add <lunch place> - to add a new place to eat',
    'list - to list places to eat',
    'suggest - to pick place to eat'
  ];
  return {
    text: commands.join('\n')
  };
}

/**
 * Add a user suggested lunch place to the database.
 */
function addLunchPlace(user, placeName) {
  if (botConfig.debugMode) {
    console.log('in addLunchPlace', user, placeName);
  }

  // Check if lunch place already exists before creating.
  const container = getContainer(user.id);
  const query = new skygear.Query(LunchPlace);
  query.equalTo('name', placeName);
  return container.publicDB.query(query).then((places) => {
    if (places.length === 0) {
      console.info(`Lunch place "${placeName}" does not exist. Creating...`);
      const place = new LunchPlace({
        name: placeName
      });

      return container.publicDB.save(place).then(() => {
        return {text: 'New lunch place! Thank you for your suggestion.'};
      });
    }
    return {text: 'This lunch place already exists.'};
  }, (err) => {
    console.error('Error creating lunch place.', err);
  });
}

/**
 * List all the lunch places saved in the database.
 */
function listLunchPlaces(user) {
  if (botConfig.debugMode) {
    console.log('in listLunchPlaces', user);
  }

  const container = getContainer(user.id);
  const query = new skygear.Query(LunchPlace);
  return container.publicDB.query(query).then((places) => {
    console.info(`Found ${places.length} lunch places.`);
    let content = '';
    _.forEach(places, (place) => {
      content = content + place.name + '\n';
    });
    return { text: content };
  }, (err) => {
    console.error('Error listing lunch places.', err);
  });
}

/**
 * Pick a lunch place and save the proposal to the database.
 */
function createRandomProposal(user, channel) {
  if (botConfig.debugMode) {
    console.log('in createRandomProposal', user, channel);
  }

  const container = getContainer(user.id);
  const query = new skygear.Query(LunchPlace);
  return container.publicDB.query(query).then((places) => {
    if (botConfig.debugMode) {
      console.log(`Found ${places.length} lunch places.`);
    }

    if (places.length === 0) {
      console.warn('No lunch places found.');
      return new Promise().reject('There are no lunch places.');
    }

    const place = places[_.random(places.length - 1)];
    console.info(`Picked ${place.name} for lunch.`);

    const proposal = new LunchProposal({
      place: new skygear.Reference(place)
    });
    if (channel !== undefined && channel !== null) {
      proposal.channel = channel;
    }

    if (botConfig.debugMode) {
      console.log('Saving lunch proposal...', proposal);
    }
    return container.publicDB.save(proposal);
  }).then(() => {
    console.log('Saved lunch proposal.');
    return {text: 'done'};
  }, (err) => {
    console.error('Error saving lunch proposal.', err);
    return err;
  });
}

/**
 * This function route the user command to the appropriate command function.
 */
function handleCommand(user, channel, text) {
  if (user.username === 'admin') {
    return new Promise().reject(new Error('you cannot be admin'));
  }

  console.log(`Received text "${text}" from "${user.username}".`);

  const args = text.split(' ', 2);
  if (args.length > 0) {
    if (args[0] === 'list') {
      return listLunchPlaces(user);
    } else if (args[0] === 'add') {
      return addLunchPlace(user, args[1]);
    } else if (args[0] === 'help') {
      return showHelp();
    } else if (args[0] === 'suggest') {
      return createRandomProposal(user, channel);
    } else {
      return createRandomProposal(user, channel);
    }
  } else {
    return new Promise().reject(new Error('don\'t understand this request'));
  }
}

/**
 * Create a lunch place proposal at a lunch schedule interval.
 */
skygearCloud.every(botConfig.lunchSchedule, function () {
  if (botConfig.debugMode) {
    console.log('in lunch schedule cronjob');
  }

  // Since this cloud code is triggered with cron job, we use
  // the default user as the user to make query and save records.
  return findSlackUser(botConfig.defaultUser).then((user) => {
    return createRandomProposal(user);
  }, (err) => {
    console.error('Error running lunch schedule cronjob.', err);
  });
});

/**
 * A cloud code handler that accepts input from slack through slash command.
 */
skygearCloud.handler('/slash-command', function (req) {
  if (botConfig.debugMode) {
    console.log('in slash-command handler');
  }

  return new Promise((resolve, reject) => {
    req.form(function (formError, fields) {
      if (formError !== undefined && formError !== null) {
        reject({error: formError});
        return;
      }

      if (botConfig.debugMode) {
        console.log('Received slash command with fields', fields);
      }

      if (fields.token !== botConfig.slackSlashCommandToken) {
        console.error('slash command token does not match expected value');
        reject({error: 'token does not match'});
        return;
      }

      let responseWebhook = webhookOrNull(fields.response_url);
      let resolveOrWebhook = resolve;
      let slackId = fields.user_id;
      return findSlackUser(slackId).then((user) => {
        if (user === null) {
          console.log(`User for slack ID "${slackId}" does not exist.` +
            ' Creating...');

          // Since user creation could be a lengthy operation, and
          // slack has a deadline for responding to slash command, we
          // will resolve the request now. The result of the actual
          // command will be posted using a response webhook (if available).
          if (responseWebhook !== null) {
            resolve({ text: 'thinking...' });
            resolveOrWebhook = function (result) {
              responseWebhook.send(result);
            };
          }
          return createUser(slackId);
        }

        if (botConfig.debugMode) {
          console.log(`Slack ID "{$user.slackId}" has user ID "${user.id}".`);
        }
        return user;
      }).then((user) => {
        return handleCommand(user, fields.channel_id, fields.text);
      }).then((result) => {
        resolveOrWebhook(result);
      }, (err) => {
        console.error('Error handling slash-command', err);
        resolveOrWebhook({text: 'Unable to fulfil your request'});
      });
    });
  });
});

/**
 * Send lunch proposal to slack whenever a new proposal is saved to the
 * database.
 */
skygearCloud.afterSave('lunch_proposal', function postProposal(record, orig) {
  if (botConfig.debugMode) {
    console.log('in lunch_proposal afterSave', record, orig);
  }

  // Stop handling for changes to existing lunch proposal
  if (orig !== undefined && orig !== null) {
    return record;
  }

  const placeId = record.place.id.split('/')[1];

  return findSlackUser(botConfig.defaultUser).then((user) => {
    const container = getContainer(user.id);

    if (botConfig.debugMode) {
      console.log(`Finding name for lunch place "${placeId}"`);
    }
    const query = new skygear.Query(LunchPlace);
    query.equalTo('_id', placeId);
    return container.publicDB.query(query);
  }).then((places) => {
    if (places.length === 0) {
      console.error(`Unable to find the lunch place "${placeId}" referenced` +
        ' in the proposal.');
      return new Promise().reject('cannot find lunch place');
    }

    const place = places[0];
    const msg = {
      text: `Let's go have lunch at ${place.name}.`
    };

    // Select channel to send to. If unspecified, the message will send
    // to the default channel of the IncomingWebhook.
    if (botConfig.channelOverride !== '') {
      msg.channel = botConfig.channelOverride;
    } else if (record.channel !== undefined && record.channel !== null) {
      msg.channel = record.channel;
    }

    if (botConfig.debugMode) {
      console.log('Going to post the lunch proposal to slack...', msg);
    }

    const webhook = webhookOrNull(botConfig.slackIncomingWebhook);
    webhook.send(msg, function (err, res) {
      if (err) {
        console.error('Error posting lunch proposal to slack.', err);
      } else {
        console.log('Posted lunch proposal to slack.', res);
      }
    });
  }, (err) => {
    console.error('Error handling lunch proposal after save.', err);
    return err;
  });
});
