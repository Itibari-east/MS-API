import { APIRequestContext } from '@playwright/test';
import _config from '../config/config';
import { endpoints } from '../constants/endpoints';
import { joinUrl } from '../utils/url';

export class _HealthRequests {
  constructor(private request: APIRequestContext) {}

  async getHealth() {
    return this.request.get(joinUrl(_config.baseEndpoint, endpoints.health));
  }
}
