/**
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { assert } from 'chai';
import * as sinon from 'sinon';
import { base64ToArrayBuffer } from '../src/helpers/base64-to-array-buffer';
import { TokenDetails } from '../src/interfaces/token-details';
import { ERROR_CODES } from '../src/models/errors';
import { TokenDetailsModel } from '../src/models/token-details-model';
import { makeFakeSubscription } from './make-fake-subscription';
import { deleteDatabase } from './testing-utils/db-helper';

const BAD_INPUTS: any[] = ['', [], {}, true, null, 123];

describe('Firebase Messaging > TokenDetailsModel.saveToken()', () => {
  let clock: sinon.SinonFakeTimers;
  let globalTokenModel: TokenDetailsModel;
  let exampleInput: TokenDetails;

  beforeEach(() => {
    clock = sinon.useFakeTimers();

    globalTokenModel = new TokenDetailsModel();

    const fakeSubscription = makeFakeSubscription()
    exampleInput = {
      swScope: '/example-scope',
      vapidKey: base64ToArrayBuffer(
        'BNJxw7sCGkGLOUP2cawBaBXRuWZ3lw_PmQMgreLVVvX_b' +
          '4emEWVURkCF8fUTHEFe2xrEgTt5ilh5xD94v0pFe_I'
      ),
      fcmSenderId: '1234567',
      fcmToken: 'qwerty',
      fcmPushSet: '7654321',
      endpoint: fakeSubscription.endpoint,
      auth: fakeSubscription.getKey('auth')!,
      p256dh: fakeSubscription.getKey('p256dh')!,
      createTime: Date.now()
    };
  });

  afterEach(async () => {
    await globalTokenModel.closeDatabase();
    await deleteDatabase('fcm_token_details_db');

    clock.restore();
  });

  it('should throw on bad input', () => {
    const promises = BAD_INPUTS.map(badInput => {
      globalTokenModel = new TokenDetailsModel();
      exampleInput.swScope = badInput;
      return globalTokenModel.saveTokenDetails(exampleInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_SCOPE, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad vapid key input', () => {
    const promises = BAD_INPUTS.map(badInput => {
      globalTokenModel = new TokenDetailsModel();
      exampleInput.vapidKey = badInput;
      return globalTokenModel.saveTokenDetails(exampleInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_VAPID_KEY, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad endpoint input', () => {
    const promises = BAD_INPUTS.map(badInput => {
      globalTokenModel = new TokenDetailsModel();
      exampleInput.endpoint = badInput;
      return globalTokenModel.saveTokenDetails(exampleInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_SUBSCRIPTION, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad auth input', () => {
    const promises = BAD_INPUTS.map(badInput => {
      globalTokenModel = new TokenDetailsModel();
      exampleInput.auth = badInput;
      return globalTokenModel.saveTokenDetails(exampleInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_SUBSCRIPTION, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad p256dh input', () => {
    const promises = BAD_INPUTS.map(badInput => {
      globalTokenModel = new TokenDetailsModel();
      exampleInput.p256dh = badInput;
      return globalTokenModel.saveTokenDetails(exampleInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_SUBSCRIPTION, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad send id input', () => {
    const promises = BAD_INPUTS.map(badInput => {
      globalTokenModel = new TokenDetailsModel();
      exampleInput.fcmSenderId = badInput;
      return globalTokenModel.saveTokenDetails(exampleInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_SENDER_ID, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad token input', () => {
    const promises = BAD_INPUTS.map(badInput => {
      globalTokenModel = new TokenDetailsModel();
      exampleInput.fcmToken = badInput;
      return globalTokenModel.saveTokenDetails(exampleInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_TOKEN, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should throw on bad pushSet input', () => {
    const promises = BAD_INPUTS.map(badInput => {
      globalTokenModel = new TokenDetailsModel();
      exampleInput.fcmPushSet = badInput;
      return globalTokenModel.saveTokenDetails(exampleInput).then(
        () => {
          throw new Error('Expected promise to reject');
        },
        err => {
          assert.equal('messaging/' + ERROR_CODES.BAD_PUSH_SET, err.code);
        }
      );
    });

    return Promise.all(promises);
  });

  it('should save valid details', () => {
    globalTokenModel = new TokenDetailsModel();
    return globalTokenModel.saveTokenDetails(exampleInput);
  });
});
