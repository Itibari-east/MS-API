import baseTest from '../../helpers/baseTests';
import { PosService } from '../services/auth';

const test = baseTest.extend<{
  posService: PosService;
}>({
  posService: async ({}, use) => {
    await use(new PosService());
  },
});

export default test;
