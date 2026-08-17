import { expect, test, type Page } from '@playwright/test';

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

async function createXiDachRoom(page: Page) {
  await page.getByRole('button', { name: 'Tạo phòng mới' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tạo phòng mới' });
  await dialog.getByRole('combobox').click();
  await page.getByRole('option', { name: 'Xì Dách' }).click();
  await dialog.getByRole('button', { name: 'Tạo phòng' }).click();
  await expect(page.getByRole('heading', { name: 'Sòng Phẳng' })).toBeVisible({ timeout: 15_000 });
  const roomId = new URL(page.url()).searchParams.get('room');
  expect(roomId).toMatch(/^[A-HJ-NP-Z2-9]{5}$/);
  return roomId;
}

test('two independent clients deep-link, recover, score, undo, and close in realtime', async ({ browser, baseURL }) => {
  const hostContext = await browser.newContext();
  const memberContext = await browser.newContext();
  const host = await hostContext.newPage();
  const member = await memberContext.newPage();
  const hostErrors = captureConsoleErrors(host);
  const memberErrors = captureConsoleErrors(member);

  await host.goto('/');
  await expect(host.getByText('Sẵn sàng')).toBeVisible();
  await completeProfile(host, 'Host Test', '100001');
  const roomId = await createXiDachRoom(host);

  await member.goto(`${baseURL}/?room=${roomId.toLowerCase()}`);
  await expect(member.getByText('Sẵn sàng')).toBeVisible();
  await completeProfile(member, 'Member Test', '100002');
  const joinDialog = member.getByRole('dialog', { name: 'Vào phòng' });
  await expect(joinDialog.getByLabel('Mã phòng')).toHaveValue(roomId);
  await joinDialog.getByRole('button', { name: 'Vào phòng' }).click();

  await expect(host.getByText('Member Test', { exact: true })).toBeVisible();
  await expect(member.getByText('Host Test', { exact: true })).toBeVisible();
  await expect(member.getByRole('button', { name: 'Ghi ván mới' })).toHaveCount(0);

  await host.reload();
  await member.reload();
  await expect(host.getByText('Member Test', { exact: true })).toBeVisible();
  await expect(member.getByText('Host Test', { exact: true })).toBeVisible();
  await expect(host).toHaveURL(new RegExp(`room=${roomId}`));
  await expect(member).toHaveURL(new RegExp(`room=${roomId}`));

  await host.getByRole('button', { name: 'Ghi ván mới' }).click();
  const scoreDialog = host.getByRole('dialog', { name: 'Ghi kết quả ván' });
  await scoreDialog.locator('label').filter({ hasText: 'Member Test' }).getByRole('spinbutton').fill('25');
  await scoreDialog.getByRole('button', { name: 'Lưu kết quả' }).click();
  await expect(host.getByText('Ván 1', { exact: true })).toBeVisible();
  await expect(member.getByText('Ván 1', { exact: true })).toBeVisible();

  await host.getByRole('button', { name: 'Hoàn tác ván 1' }).click();
  await expect(host.getByText('0 ván', { exact: true })).toBeVisible();
  await expect(member.getByText('0 ván', { exact: true })).toBeVisible();

  await host.getByRole('button', { name: 'Ghi ván mới' }).click();
  const secondScoreDialog = host.getByRole('dialog', { name: 'Ghi kết quả ván' });
  await secondScoreDialog.locator('label').filter({ hasText: 'Member Test' }).getByRole('spinbutton').fill('40');
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

test('malformed room URL stays on a usable mobile welcome screen', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/?room=bad');
  await expect(page.getByRole('heading', { name: 'Sòng Phẳng' })).toBeVisible();
  await expect(page.getByText('Mã phòng trên đường dẫn không hợp lệ.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tạo phòng mới' })).toBeVisible();
  await context.close();
});
