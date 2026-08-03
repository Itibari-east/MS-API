# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: usermanagement/users.spec.ts >> User Management >> updates users
- Location: tests/usermanagement/users.spec.ts:10:7

# Error details

```
Error: expect(received).toBeDefined()

Received: undefined
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | import { _UserManagementService } from './userManagement';
  3   | import { getTokenOrSkip, unique, json, publicIdFrom, firstContentPublicId } from '../helpers/testHelpers';
  4   | 
  5   | type CreatedEntity = {
  6   |   name: string;
  7   |   publicId: string;
  8   | };
  9   | 
  10  | type LocationChain = {
  11  |   regionPublicId: string;
  12  |   country: CreatedEntity;
  13  |   city: CreatedEntity;
  14  |   branch: CreatedEntity;
  15  |   department: CreatedEntity;
  16  | };
  17  | 
  18  | type UserChain = LocationChain & {
  19  |   role: CreatedEntity;
  20  |   user: CreatedEntity;
  21  | };
  22  | 
  23  | type PermissionChain = {
  24  |   group: CreatedEntity;
  25  |   privilege: CreatedEntity;
  26  | };
  27  | 
  28  | async function expectStatuses<T extends { status(): number }>(responsePromise: Promise<T>, allowedStatuses: number[]) {
  29  |   const response = await responsePromise;
  30  |   expect(allowedStatuses).toContain(response.status());
  31  |   return response;
  32  | }
  33  | 
  34  | async function expectOk<T extends { status(): number }>(responsePromise: Promise<T>) {
  35  |   return expectStatuses(responsePromise, [200]);
  36  | }
  37  | 
  38  | async function expectEntityWithCreatedBy<T extends { status(): number }>(responsePromise: Promise<T>, publicId?: string) {
  39  |   const response = await expectOk(responsePromise);
  40  |   const body = await json(response);
  41  |   const createdBy = body.createdBy ?? body.created_by;
  42  |   expect(createdBy).not.toBeNull();
> 43  |   expect(createdBy).toBeDefined();
      |                     ^ Error: expect(received).toBeDefined()
  44  |   if (publicId) {
  45  |     expect(body).toHaveProperty('publicId', publicId);
  46  |   }
  47  |   return body;
  48  | }
  49  | 
  50  | async function createCountry(userManagement: _UserManagementService, token: string, prefix: string): Promise<CreatedEntity> {
  51  |   const name = unique(prefix);
  52  |   const response = await expectOk(
  53  |     userManagement.createCountry(token, {
  54  |       name,
  55  |       code: `AC${Date.now()}${Math.random()}`.slice(-6).toUpperCase(),
  56  |       currency: 'TZS',
  57  |     }),
  58  |   );
  59  |   return { name, publicId: publicIdFrom(await json(response)) };
  60  | }
  61  | 
  62  | async function createCity(
  63  |   userManagement: _UserManagementService,
  64  |   token: string,
  65  |   countryPublicId: string,
  66  |   prefix: string,
  67  | ): Promise<CreatedEntity> {
  68  |   const name = unique(prefix);
  69  |   const response = await expectOk(
  70  |     userManagement.createCity(token, {
  71  |       name,
  72  |       code: `CT${Date.now()}${Math.random()}`.slice(-6).toUpperCase(),
  73  |       countryPublicId,
  74  |     }),
  75  |   );
  76  |   return { name, publicId: publicIdFrom(await json(response)) };
  77  | }
  78  | 
  79  | async function createBranch(
  80  |   userManagement: _UserManagementService,
  81  |   token: string,
  82  |   cityPublicId: string,
  83  |   regionPublicId: string,
  84  |   prefix: string,
  85  | ): Promise<CreatedEntity> {
  86  |   const name = unique(prefix);
  87  |   const response = await expectOk(
  88  |     userManagement.createBranch(token, {
  89  |       name,
  90  |       description: 'Created by API automation',
  91  |       cityPublicIds: [cityPublicId],
  92  |       regionId: regionPublicId,
  93  |     }),
  94  |   );
  95  |   return { name, publicId: publicIdFrom(await json(response)) };
  96  | }
  97  | 
  98  | async function createDepartment(userManagement: _UserManagementService, token: string, prefix: string): Promise<CreatedEntity> {
  99  |   const name = unique(prefix);
  100 |   const response = await expectOk(
  101 |     userManagement.createDepartment(token, {
  102 |       departmentName: name,
  103 |     }),
  104 |   );
  105 |   return { name, publicId: publicIdFrom(await json(response)) };
  106 | }
  107 | 
  108 | async function createRole(
  109 |   userManagement: _UserManagementService,
  110 |   token: string,
  111 |   prefix: string,
  112 |   privilegePublicIds: string[] = [],
  113 | ): Promise<CreatedEntity> {
  114 |   const name = unique(prefix);
  115 |   const response = await expectOk(
  116 |     userManagement.createRole(token, {
  117 |       name,
  118 |       privilegePublicIds,
  119 |     }),
  120 |   );
  121 |   return { name, publicId: publicIdFrom(await json(response)) };
  122 | }
  123 | 
  124 | async function createPrivilege(
  125 |   userManagement: _UserManagementService,
  126 |   token: string,
  127 |   groupPublicId: string,
  128 |   prefix: string,
  129 | ): Promise<CreatedEntity> {
  130 |   const name = unique(prefix).toUpperCase().replace(/-/g, '_');
  131 |   const response = await expectOk(
  132 |     userManagement.createPrivilege(token, {
  133 |       names: [name],
  134 |       privilegeGroupPublicId: groupPublicId,
  135 |     }),
  136 |   );
  137 |   return { name, publicId: publicIdFrom(await json(response)) };
  138 | }
  139 | 
  140 | async function createPermissionGroup(
  141 |   userManagement: _UserManagementService,
  142 |   token: string,
  143 |   prefix: string,
```