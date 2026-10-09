import { expect } from '@playwright/test';
import test from '../../helpers/baseTests';
import { getTokenOrSkip, unique } from '../../helpers/testHelpers';
import { CreateSalesAgentRequest, SalesAgentRecord } from '../../types/orderService';

const invalidId = '00000000-0000-0000-0000-000000000000';

function listItems(body: unknown): SalesAgentRecord[] {
  if (Array.isArray(body)) return body as SalesAgentRecord[];
  if (body && typeof body === 'object' && Array.isArray((body as { content?: unknown }).content)) {
    return (body as { content: SalesAgentRecord[] }).content;
  }
  return [];
}

function lifecycleSeeds(): { managerPublicId: string; regionPublicId: string; geofencePublicId: string } {
  const managerPublicId = process.env.MS_SALES_AGENT_MANAGER_PUBLIC_ID?.trim() ?? '';
  const regionPublicId = process.env.MS_SALES_AGENT_REGION_PUBLIC_ID?.trim() ?? '';
  const geofencePublicId = process.env.MS_SALES_AGENT_GEOFENCE_PUBLIC_ID?.trim() ?? '';

  test.skip(
    !managerPublicId || !regionPublicId || !geofencePublicId,
    'requires MS_SALES_AGENT_MANAGER_PUBLIC_ID, MS_SALES_AGENT_REGION_PUBLIC_ID, and MS_SALES_AGENT_GEOFENCE_PUBLIC_ID',
  );
  return { managerPublicId, regionPublicId, geofencePublicId };
}

function buildSalesAgentPayload(): CreateSalesAgentRequest {
  const seeds = lifecycleSeeds();
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1_000)}`;
  return {
    firstName: unique('Sales Agent First'),
    lastName: unique('Sales Agent Last'),
    managerPublicId: seeds.managerPublicId,
    phoneNumber: `+2557${suffix.slice(-8)}`,
    email: `sales-agent-${suffix}@itibari.test`,
    regionPublicId: seeds.regionPublicId,
    address: 'API Automation Address',
    street: 'Automation Street',
    identificationType: 'NATIONAL_ID',
    identificationNumber: `SA-${suffix}`,
    geofencePublicIds: [seeds.geofencePublicId],
    sendOneTimePassword: false,
  };
}

test.describe.serial('@order-service Sales Agent Management', () => {
  test('lists sales agents with SRS table filters and pagination', async ({ orderService }) => {
    const token = getTokenOrSkip();
    const response = await orderService.listSalesAgents(token, {
      searchParam: '',
      status: 'ACTIVE',
      page: 0,
      size: 20,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toHaveProperty('content');
    expect(body).toHaveProperty('totalElements');
  });

  test('creates, retrieves, suspends, reactivates, and deletes a sales agent', async ({ orderService }) => {
    const token = getTokenOrSkip();
    const payload = buildSalesAgentPayload();
    const createResponse = await orderService.createSalesAgent(token, payload);
    expect([200, 201]).toContain(createResponse.status());

    const createdBody = await createResponse.json();
    let publicId = String(createdBody?.publicId ?? '');

    if (!publicId) {
      const listResponse = await orderService.listSalesAgents(token, { searchParam: payload.phoneNumber, page: 0, size: 20 });
      expect(listResponse.status()).toBe(200);
      publicId = String(listItems(await listResponse.json()).find((item) => item.phoneNumber === payload.phoneNumber)?.publicId ?? '');
    }
    expect(publicId, `creation should return or list a publicId for ${payload.phoneNumber}`).toBeTruthy();

    try {
      const detailResponse = await orderService.getSalesAgent(token, publicId);
      expect(detailResponse.status()).toBe(200);
      const detail = await detailResponse.json();
      expect(String(detail.publicId ?? '')).toBe(publicId);
      expect(String(detail.phoneNumber ?? '')).toBe(payload.phoneNumber);
      expect(String(detail.managerPublicId ?? '')).toBe(payload.managerPublicId);
      expect(String(detail.regionPublicId ?? '')).toBe(payload.regionPublicId);

      const suspendResponse = await orderService.changeSalesAgentStatus(token, publicId, { action: 'DEACTIVATE' });
      expect(suspendResponse.status()).toBe(200);

      const reactivateResponse = await orderService.changeSalesAgentStatus(token, publicId, { action: 'ACTIVATE' });
      expect(reactivateResponse.status()).toBe(200);
    } finally {
      const deleteResponse = await orderService.deleteSalesAgent(token, publicId);
      expect([200, 204]).toContain(deleteResponse.status());
    }
  });

  test('provides sales-agent visit history, KPI, and report endpoints', async ({ orderService }) => {
    const token = getTokenOrSkip();
    const listResponse = await orderService.listSalesAgents(token, { page: 0, size: 1 });
    expect(listResponse.status()).toBe(200);
    const publicId = String(listItems(await listResponse.json())[0]?.publicId ?? '');
    test.skip(!publicId, 'requires an existing sales agent to validate visit reporting');

    const [visits, kpis, summaries] = await Promise.all([
      orderService.listVisits(token, publicId, { page: 0, size: 20 }),
      orderService.getVisitKpis(token, publicId),
      orderService.listVisitSummaries(token, { page: 0, size: 20 }),
    ]);

    expect(visits.status()).toBe(200);
    expect(kpis.status()).toBe(200);
    expect(summaries.status()).toBe(200);
  });

  test('rejects unauthenticated sales-agent access', async ({ orderService }) => {
    const response = await orderService.listSalesAgents('', { page: 0, size: 1 });
    expect([401, 403]).toContain(response.status());
  });

  test('returns not found for an unknown sales agent', async ({ orderService }) => {
    const token = getTokenOrSkip();
    const response = await orderService.getSalesAgent(token, invalidId);
    expect(response.status()).toBe(404);
  });

  test.skip('validates required fields and duplicate phone or identification number', async () => {
    // SRS requirement. The OpenAPI document has no required-field constraints or error contract yet.
  });

  test.skip('enforces role permissions and prevents a sales agent from suspending their own account', async () => {
    // SRS requirement. Requires role-specific credentials and an authorization contract.
  });

  test.skip('covers profile edits, attendance, live location, QR badges, and visit scheduling/execution', async () => {
    // SRS requirement. No corresponding Order Service endpoints are published in the current OpenAPI document.
  });
});
