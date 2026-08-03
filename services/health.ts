import { APIRequestContext, expect } from '@playwright/test';
import { _HealthRequests } from '../requests/health';

export class _HealthService {
  private healthRequests: _HealthRequests;

  constructor(request: APIRequestContext) {
    this.healthRequests = new _HealthRequests(request);
  }

  async validateHealthIsAvailable() {
    const response = await this.healthRequests.getHealth();
    expect(response.ok()).toBeTruthy();
    return response;
  }
}
