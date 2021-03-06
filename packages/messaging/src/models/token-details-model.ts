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

import { arrayBufferToBase64 } from '../helpers/array-buffer-to-base64';
import { TokenDetails } from '../interfaces/token-details';
import { cleanV1 } from './clean-v1-undefined';
import { DBInterface } from './db-interface';
import { ERROR_CODES } from './errors';

export class TokenDetailsModel extends DBInterface {
  protected readonly dbName: string = 'fcm_token_details_db';
  protected readonly dbVersion: number = 2;
  protected readonly objectStoreName: string = 'fcm_token_object_Store';

  protected onDbUpgrade(db: IDBDatabase, evt: IDBVersionChangeEvent): void {
    if (evt.oldVersion < 1) {
      // New IDB instance
      const objectStore = db.createObjectStore(this.objectStoreName, {
        keyPath: 'swScope'
      });

      // Make sure the sender ID can be searched
      objectStore.createIndex('fcmSenderId', 'fcmSenderId', {
        unique: false
      });

      objectStore.createIndex('fcmToken', 'fcmToken', {
        unique: true
      });
    }

    if (evt.oldVersion < 2) {
      // Prior to version 2, we were using either 'fcm_token_details_db'
      // or 'undefined' as the database name due to bug in the SDK
      // So remove the old tokens and databases.
      cleanV1();
    }
  }

  /**
   * This method takes an object and will check for known arguments and
   * validate the input.
   * @return Promise that resolves if input is valid, rejects otherwise.
   */
  private validateInputs(input: Partial<TokenDetails>): void {
    if (input.fcmToken) {
      if (typeof input.fcmToken !== 'string' || input.fcmToken.length === 0) {
        throw this.errorFactory.create(ERROR_CODES.BAD_TOKEN);
      }
    }

    if (input.swScope) {
      if (typeof input.swScope !== 'string' || input.swScope.length === 0) {
        throw this.errorFactory.create(ERROR_CODES.BAD_SCOPE);
      }
    }

    if (input.vapidKey) {
      if (
        !(input.vapidKey instanceof Uint8Array) ||
        input.vapidKey.length !== 65
      ) {
        throw this.errorFactory.create(ERROR_CODES.BAD_VAPID_KEY);
      }
    }

    if (input.subscription) {
      if (!(input.subscription instanceof PushSubscription)) {
        throw this.errorFactory.create(ERROR_CODES.BAD_SUBSCRIPTION);
      }
    }

    if (input.fcmSenderId) {
      if (
        typeof input.fcmSenderId !== 'string' ||
        input.fcmSenderId.length === 0
      ) {
        throw this.errorFactory.create(ERROR_CODES.BAD_SENDER_ID);
      }
    }

    if (input.fcmPushSet) {
      if (
        typeof input.fcmPushSet !== 'string' ||
        input.fcmPushSet.length === 0
      ) {
        throw this.errorFactory.create(ERROR_CODES.BAD_PUSH_SET);
      }
    }
  }

  /**
   * Given a token, this method will look up the details in indexedDB.
   * @param {string} fcmToken
   * @return {Promise<TokenDetails>} The details associated with that token.
   */
  async getTokenDetailsFromToken(
    fcmToken: string
  ): Promise<TokenDetails | undefined> {
    if (!fcmToken) {
      throw this.errorFactory.create(ERROR_CODES.BAD_TOKEN);
    }

    this.validateInputs({ fcmToken });

    return this.getIndex<TokenDetails>('fcmToken', fcmToken);
  }

  /**
   * Given a service worker scope, this method will look up the details in
   * indexedDB.
   * @return The details associated with that token.
   */
  async getTokenDetailsFromSWScope(
    swScope: string
  ): Promise<TokenDetails | undefined> {
    if (!swScope) {
      throw this.errorFactory.create(ERROR_CODES.BAD_SCOPE);
    }

    this.validateInputs({ swScope });

    return this.get<TokenDetails>(swScope);
  }

  /**
   * Save the details for the fcm token for re-use at a later date.
   * @param input A plain js object containing args to save.
   */
  async saveTokenDetails(tokenDetails: TokenDetails): Promise<void> {
    if (!tokenDetails.swScope) {
      throw this.errorFactory.create(ERROR_CODES.BAD_SCOPE);
    }

    if (!tokenDetails.vapidKey) {
      throw this.errorFactory.create(ERROR_CODES.BAD_VAPID_KEY);
    }

    if (!tokenDetails.subscription) {
      throw this.errorFactory.create(ERROR_CODES.BAD_SUBSCRIPTION);
    }

    if (!tokenDetails.fcmSenderId) {
      throw this.errorFactory.create(ERROR_CODES.BAD_SENDER_ID);
    }

    if (!tokenDetails.fcmToken) {
      throw this.errorFactory.create(ERROR_CODES.BAD_TOKEN);
    }

    if (!tokenDetails.fcmPushSet) {
      throw this.errorFactory.create(ERROR_CODES.BAD_PUSH_SET);
    }

    this.validateInputs(tokenDetails);

    const details = {
      swScope: tokenDetails.swScope,
      vapidKey: arrayBufferToBase64(tokenDetails.vapidKey as Uint8Array),
      endpoint: tokenDetails.subscription.endpoint,
      auth: arrayBufferToBase64(tokenDetails.subscription.getKey('auth')!),
      p256dh: arrayBufferToBase64(tokenDetails.subscription.getKey('p256dh')!),
      fcmSenderId: tokenDetails.fcmSenderId,
      fcmToken: tokenDetails.fcmToken,
      fcmPushSet: tokenDetails.fcmPushSet,
      createTime: Date.now()
    };

    return this.put(details);
  }

  /**
   * This method deletes details of the current FCM token.
   * It's returning a promise in case we need to move to an async
   * method for deleting at a later date.
   *
   * @return Resolves once the FCM token details have been deleted and returns
   * the deleted details.
   */
  async deleteToken(token: string): Promise<TokenDetails> {
    if (typeof token !== 'string' || token.length === 0) {
      return Promise.reject(
        this.errorFactory.create(ERROR_CODES.INVALID_DELETE_TOKEN)
      );
    }

    const details = await this.getTokenDetailsFromToken(token);
    if (!details) {
      throw this.errorFactory.create(ERROR_CODES.DELETE_TOKEN_NOT_FOUND);
    }

    await this.delete(details.swScope);
    return details;
  }
}

/** Promisifies an IDBRequest. Resolves with the IDBRequest's result. */
function promisify<ReturnType>(request: IDBRequest): Promise<ReturnType> {
  return new Promise<ReturnType>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error);
    };
  });
}
