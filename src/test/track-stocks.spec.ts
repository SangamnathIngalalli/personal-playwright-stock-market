import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

interface StockRecord {
  stockName: string;
  firstDate: string;
  initialPrice: number;
  lastDate: string;
  currentPrice: number;
}

test('Track 52-week high stocks with price tracking', async ({ page }) => {
  console.log('🚀 Tracking 52-week high stocks...');
  
  await page.goto('https://economictimes.indiatimes.com/stocks/marketstats/52-week-high');
  await page.waitForLoadState('domcontentloaded');
  
  // Wait a bit more for dynamic content to load
  await page.waitForTimeout(2000);
  
  const title = await page.title();
  const url = page.url();
  
  expect(title).toMatch(/52 Week High/i);
  expect(url).toContain('52-week-high');

  // Extract all rows from the table
  const rows = await page.$$('.MarketTable_fixedTr__vq74z');
  
  const stockData: Array<{stockName: string, currentPrice: number}> = [];
  
  for (const row of rows) {
    try {
      // Extract stock name
      const nameElement = await row.$('.MarketTable_ellipses__M8PxM');
      if (nameElement) {
        const stockName = await nameElement.innerText();
        
        // Extract current price from the span with class MarketTable_ltp__lOZdv
        const priceElement = await row.$('.MarketTable_ltp__lOZdv');
        let currentPrice = 0;
        
        if (priceElement) {
          const priceText = await priceElement.innerText();
          currentPrice = parseFloat(priceText.replace(/,/g, '')); // Remove commas and convert to number
        }
        
        if (stockName.trim() && currentPrice > 0) {
          stockData.push({
            stockName: stockName.trim(),
            currentPrice: currentPrice
          });
        } else if (stockName.trim()) {
          // If we couldn't get price, add with a default price of 0 (will be updated later)
          stockData.push({
            stockName: stockName.trim(),
            currentPrice: 0 // Will be updated when we get actual price
          });
        }
      }
    } catch (error) {
      console.log('Error processing row:', error);
      continue;
    }
  }

  console.log('📊 Stock Data:', stockData);

  // Prepare folder and file paths
  const mainFolder = path.join(
    'C:',
    'Users',
    'Administrator',
    'OneDrive',
    'Swing Trading',
    'tracking'
  );
  
  const backupFolder = path.join(mainFolder, 'backup');

  if (!fs.existsSync(mainFolder)) {
    fs.mkdirSync(mainFolder, { recursive: true });
  }
  
  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  const filePath = path.join(mainFolder, 'track.txt');

  // Get current date in DD-MM-YYYY format for backup filename
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, '0');
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();
  const formattedDate = `${dd}-${mm}-${yyyy}`;
  const formattedDateTime = `${dd}-${mm}-${yyyy}_${String(today.getHours()).padStart(2, '0')}-${String(today.getMinutes()).padStart(2, '0')}`;

  // Create backup of existing track file if it exists
  if (fs.existsSync(filePath)) {
    const backupFilePath = path.join(backupFolder, `track_backup_${formattedDateTime}.txt`);
    fs.copyFileSync(filePath, backupFilePath);
    console.log(`📦 Backup created: ${backupFilePath}`);
  }

  // Read existing tracking data
  const trackingRecords: StockRecord[] = [];
  const existingStocks = new Map<string, StockRecord>();
  
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    for (const line of lines) {
      const parts = line.split('\t').map(part => part.trim());
      if (parts.length >= 5) {
        const record: StockRecord = {
          stockName: parts[0],
          firstDate: parts[1],
          initialPrice: parseFloat(parts[2]),
          lastDate: parts[3],
          currentPrice: parseFloat(parts[4])
        };
        trackingRecords.push(record);
        existingStocks.set(record.stockName, record);
      }
    }
  }

  // Process each stock from today's 52-week high list
  for (const stock of stockData) {
    const existingRecord = existingStocks.get(stock.stockName);
    
    if (existingRecord) {
      // Stock already exists in tracking file - update with current data
      // Only update if we have a valid current price
      if (stock.currentPrice > 0) {
        const percentageDiff = ((stock.currentPrice - existingRecord.initialPrice) / existingRecord.initialPrice) * 100;
        existingRecord.lastDate = formattedDate;
        existingRecord.currentPrice = stock.currentPrice;
        
        // Find and update the record in the array
        const index = trackingRecords.findIndex(r => r.stockName === stock.stockName);
        if (index !== -1) {
          trackingRecords[index] = existingRecord;
        }
        
        console.log(`📈 Updated ${stock.stockName}: Current Price: ${stock.currentPrice}, % Diff: ${percentageDiff.toFixed(2)}%`);
      } else {
        // Update only the date if price wasn't extracted
        existingRecord.lastDate = formattedDate;
        const index = trackingRecords.findIndex(r => r.stockName === stock.stockName);
        if (index !== -1) {
          trackingRecords[index] = existingRecord;
        }
        console.log(`📅 Updated date for ${stock.stockName} (price not available)`);
      }
    } else {
      // New stock entering 52-week high - add new record
      const newRecord: StockRecord = {
        stockName: stock.stockName,
        firstDate: formattedDate,
        initialPrice: stock.currentPrice > 0 ? stock.currentPrice : 0,
        lastDate: formattedDate,
        currentPrice: stock.currentPrice > 0 ? stock.currentPrice : 0
      };
      trackingRecords.push(newRecord);
      
      if (stock.currentPrice > 0) {
        console.log(`🆕 New tracking entry: ${stock.stockName} at ${stock.currentPrice}`);
      } else {
        console.log(`🆕 New tracking entry: ${stock.stockName} (price not available yet)`);
      }
    }
  }

  // Create header with proper formatting
  const header = `Stock Name                \tFirst Date  \tInit Price\tLast Date   \tCurr Price\t% Diff\n`;
  const separator = '='.repeat(105) + '\n';

  // Write updated tracking data back to file with headers and better formatting
  const fileContent = header + separator + trackingRecords.map(record => {
    const percentageDiff = record.initialPrice > 0 ? 
      ((record.currentPrice - record.initialPrice) / record.initialPrice) * 100 : 0;
    
    // Format with fixed-width columns for better readability
    const formattedStockName = record.stockName.padEnd(25);
    const formattedFirstDate = record.firstDate.padEnd(10);
    const formattedInitialPrice = record.initialPrice.toFixed(2).padStart(9);
    const formattedLastDate = record.lastDate.padEnd(10);
    const formattedCurrentPrice = record.currentPrice.toFixed(2).padStart(9);
    const formattedPercentage = percentageDiff.toFixed(2).padStart(7) + '%';
    
    return `${formattedStockName}\t${formattedFirstDate}\t${formattedInitialPrice}\t${formattedLastDate}\t${formattedCurrentPrice}\t${formattedPercentage}`;
  }).join('\n');

  fs.writeFileSync(filePath, fileContent, 'utf-8');
  console.log(`💾 Tracking data updated in ${filePath}`);
  console.log(`📊 Total tracked stocks: ${trackingRecords.length}`);
});