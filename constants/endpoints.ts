export const endpoints = {
  auth: {
    login: '/login',
    forgotPassword: (username: string) =>
      `/login/forgetPassword?username=${encodeURIComponent(username)}`,
    mfa: {
      setup: '/auth/mfa/setup',
      setupConfirm: '/auth/mfa/setup/confirm',
      verify: '/auth/mfa/verify',
    },
  },
  health: '/health',
};
