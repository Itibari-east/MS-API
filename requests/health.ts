import { APIRequestContext } from '@playwright/test';
import _config from '../config/config';
import { endpoints } from '../constants/endpoints';

export class _HealthRequests {
  constructor(private request: APIRequestContext) {}

  async getHealth() {
    return this.request.get(`${_config.baseEndpoint}${endpoints.health}`);
  }
}
