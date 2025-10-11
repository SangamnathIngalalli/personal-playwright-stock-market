import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test('Extract company names, remove duplicates, backup, and prepend new data', async ({ page }) => {
  console.log('🚀 Navigating to Economic Times 52-week high page...');
  
  await page.goto('https://economictimes.indiatimes.com/stocks/marketstats/52-week-high');
  await page.waitForLoadState('domcontentloaded');
  
  const title = await page.title();
  const url = page.url();
  
  expect(title).toMatch(/52 Week High/i);
  expect(url).toContain('52-week-high');

  // Extract company names
  const companyElements = await page.$$('xpath=//td[@class="MarketTable_fixedTD__JmGP7"]//a[@class="MarketTable_ellipses__M8PxM"]');
  const companyNames = [];
  for (const element of companyElements) {
    const name = await element.innerText();
    companyNames.push(name.trim());
  }

  console.log('🏢 Extracted Company Names:', companyNames);

  // Prepare folder and file paths
  const folderPath = path.join(
    'C:',
    'Users',
    'Administrator',
    'OneDrive',
    'Swing Trading'
  );
  const backupFolderPath = path.join(folderPath, 'backup');

  if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
  if (!fs.existsSync(backupFolderPath)) fs.mkdirSync(backupFolderPath, { recursive: true });

  const filePath = path.join(folderPath, 'companies.txt');

  // Get current date in DD-MM-YYYY format
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const formattedDate = `${dd}-${mm}-${yyyy}`;

  // Backup existing file if it exists
  if (fs.existsSync(filePath)) {
    const backupFilePath = path.join(backupFolderPath, `company_names_backup_${formattedDate}.txt`);
    fs.copyFileSync(filePath, backupFilePath);
    console.log(`📦 Backup created: ${backupFilePath}`);
  }

  // Read existing content
  let existingContent = '';
  if (fs.existsSync(filePath)) {
    existingContent = fs.readFileSync(filePath, 'utf-8');

    // Remove any previously existing companies that are in today's list
    for (const company of companyNames) {
      const regex = new RegExp(`^${company}$`, 'gm'); // matches line with exact company name
      existingContent = existingContent.replace(regex, '');
    }

    // Also remove any leftover blank lines caused by removal
    existingContent = existingContent.replace(/\n{2,}/g, '\n\n').trim();
  }

  // Prepend new content with date header
  const dateHeader = `------- ${formattedDate} -------\n`;
  const newContent = dateHeader + companyNames.join('\n') + '\n\n';

  fs.writeFileSync(filePath, newContent + existingContent + '\n', 'utf-8');
  console.log(`💾 Company names updated in ${filePath}`);
});
