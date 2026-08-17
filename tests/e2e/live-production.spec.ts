import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

function readFirebaseSetting(name: string) {
  const match = readFileSync('.env.local', 'utf8').match(new RegExp(`^${name}=["']?([^"'\\r\\n]+)`, 'm'));
  if (!match) throw new Error(`Missing ${name} in the local production configuration.`);
  return match[1];
}

function captureConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function completeProfile(page: Page, name: string, account: string) {
  const profileDialog = page.getByRole('dialog', { name: 'Hồ sơ của bạn' });
  if (!(await profileDialog.isVisible())) {
    await page.getByRole('button', { name: /Thiết lập hồ sơ|Chỉnh sửa/ }).click();
  }
  await page.getByLabel('Tên hiển thị').fill(name);
  await profileDialog.getByRole('combobox').click();
  await page.getByRole('option', { name: /MB Bank/ }).click();
  await page.getByLabel('Số tài khoản').fill(account);
  await page.getByLabel('Tên chủ tài khoản').fill(name);
  await profileDialog.getByRole('button', { name: 'Lưu hồ sơ' }).click();
  await expect(profileDialog).toBeHidden();
}

async function assertOutsiderCannotCloseRoom(roomId: string) {
  const apiKey = readFirebaseSetting('VITE_FIREBASE_API_KEY');
  const projectId = readFirebaseSetting('VITE_FIREBASE_PROJECT_ID');
  expect(projectId).toBe('song-phang-production');

  const authResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' },
  );
  expect(authResponse.status).toBe(200);
  const auth = (await authResponse.json()) as { idToken?: string };
  expect(auth.idToken).toBeTruthy();

  const mutationResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/rooms/${roomId}?updateMask.fieldPaths=status`,
    {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${auth.idToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ fields: { status: { stringValue: 'closed' } } }),
    },
  );
  expect(mutationResponse.status).toBe(403);
}

test('production: authorize, deep-link, recover, score, undo, and close one synthetic room', async ({ browser, baseURL }) => {
  const hostContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const host = await hostContext.newPage();
  const member = await memberContext.newPage();
  const hostErrors = captureConsoleErrors(host);
  const memberErrors = captureConsoleErrors(member);

  await host.goto('/');
  await expect(host.getByText('Sẵn sàng')).toBeVisible();
  await completeProfile(host, 'TECTON Host 20260817', '99000001');
  await host.getByRole('button', { name: 'Tạo phòng mới' }).click();
  const createDialog = host.getByRole('dialog', { name: 'Tạo phòng mới' });
  await createDialog.getByRole('combobox').click();
  await host.getByRole('option', { name: 'Xì Dách' }).click();
  await createDialog.getByRole('button', { name: 'Tạo phòng' }).click();
  await expect(host.getByRole('heading', { name: 'Sòng Phẳng' })).toBeVisible({ timeout: 20_000 });
  const roomId = new URL(host.url()).searchParams.get('room');
  expect(roomId).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);

  // RED stop condition: do not continue distributed mutations unless deployed Rules reject this outsider write.
  await assertOutsiderCannotCloseRoom(roomId!);

  await member.goto(`${baseURL}/?room=${roomId!.toLowerCase()}`);
  await expect(member.getByText('Sẵn sàng')).toBeVisible();
  await completeProfile(member, 'TECTON Member 20260817', '99000002');
  const joinDialog = member.getByRole('dialog', { name: 'Vào phòng' });
  await expect(joinDialog.getByLabel('Mã phòng')).toHaveValue(roomId!);
  await joinDialog.getByRole('button', { name: 'Vào phòng' }).click();

  await expect(host.getByText('TECTON Member 20260817', { exact: true })).toBeVisible();
  await expect(member.getByText('TECTON Host 20260817', { exact: true })).toBeVisible();
  await expect(member.getByRole('button', { name: 'Ghi ván mới' })).toHaveCount(0);

  await host.reload();
  await member.reload();
  await expect(host.getByText('TECTON Member 20260817', { exact: true })).toBeVisible();
  await expect(member.getByText('TECTON Host 20260817', { exact: true })).toBeVisible();

  await host.getByRole('button', { name: 'Ghi ván mới' }).click();
  const scoreDialog = host.getByRole('dialog', { name: 'Ghi kết quả ván' });
  await scoreDialog.locator('label').filter({ hasText: 'TECTON Member 20260817' }).getByRole('spinbutton').fill('25');
  await scoreDialog.getByRole('button', { name: 'Lưu kết quả' }).click();
  await expect(member.getByText('Ván 1', { exact: true })).toBeVisible();

  await host.getByRole('button', { name: 'Hoàn tác ván 1' }).click();
  await expect(member.getByText('0 ván', { exact: true })).toBeVisible();

  await host.getByRole('button', { name: 'Ghi ván mới' }).click();
  const secondScoreDialog = host.getByRole('dialog', { name: 'Ghi kết quả ván' });
  await secondScoreDialog.locator('label').filter({ hasText: 'TECTON Member 20260817' }).getByRole('spinbutton').fill('40');
  await secondScoreDialog.getByRole('button', { name: 'Lưu kết quả' }).click();
  await expect(member.getByText('Ván 1', { exact: true })).toBeVisible();

  await host.getByRole('button', { name: 'Chốt sổ' }).click();
  await expect(member.getByRole('heading', { name: 'Chốt sổ' })).toBeVisible();
  await host.getByRole('button', { name: 'Đóng sổ' }).click();
  await host.getByRole('alertdialog').getByRole('button', { name: 'Đóng sổ' }).click();
  await expect(host.getByRole('heading', { name: 'Sổ đã đóng' })).toBeVisible();
  await expect(member.getByRole('heading', { name: 'Sổ đã đóng' })).toBeVisible();

  await host.reload();
  await member.reload();
  await expect(host.getByRole('heading', { name: 'Sổ đã đóng' })).toBeVisible();
  await expect(member.getByRole('heading', { name: 'Sổ đã đóng' })).toBeVisible();
  expect(hostErrors).toEqual([]);
  expect(memberErrors).toEqual([]);

  await hostContext.close();
  await memberContext.close();
});
