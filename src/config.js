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

const botConfig = {
  slackSlashCommandToken: process.env.SLACK_SLASH_COMMAND_TOKEN,
  slackIncomingWebhook: process.env.SLACK_INCOMING_WEBHOOK,
  debugMode: process.env.LUNCHBOT_DEBUG === 'true',
  appName: process.env.APP_NAME || '_',
  channelOverride: process.env.CHANNEL_OVERRIDE || '',
  defaultUser: process.env.DEFAULT_USER || 'admin',
  lunchSchedule: process.env.LUNCH_SCHEDULE || '0 0 12 * * 1,2,3,4,5'
};

module.exports = {
  botConfig
};

