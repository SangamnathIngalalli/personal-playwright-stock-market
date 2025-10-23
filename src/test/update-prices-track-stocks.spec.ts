import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { nameMappings } from './stock_mappings';

interface TrackRecord {
  stockName: string;
  firstDate: string;
  initialPrice: number;
  lastDate: string;
  currentPrice: number;
  percentageDiff: number;
}

interface TodayPriceRecord {
  GAIN_LOSS: string;
  SECURITY: string;
  CLOSE_PRIC: string;
  PREV_CL_PR: string;
  PERCENT_CG: string;
}

// Function to normalize names for better matching
function normalizeName(name: string): string {
  return name
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\s*[-_]\s*/g, ' ') // Replace hyphens/underscores with space
    .replace(/\bLTD\b/gi, 'LIMITED') // Standardize Ltd to Limited
    .replace(/\b&\b/gi, 'AND') // Standardize & to AND
    .replace(/\bCO\b/gi, 'COMPANY') // Standardize Co to Company
    .replace(/\bSERV\b/gi, 'SERVICES') // Standardize Serv to Services
    .replace(/\bIND\b/gi, 'INDUSTRIES') // Standardize Ind to Industries
    .replace(/\bAMC\b/gi, 'ASSET MANAGEMENT') // Standardize AMC to Asset Management
    .trim();
}

// Function to find best match for a given name
function findBestMatch(stockName: string, availableSecurities: string[]): string | null {
  // First, check if there's a direct mapping
  if (nameMappings[stockName]) {
    return nameMappings[stockName] || null;
  }
  
  // Normalize the stock name
  const normalizedStockName = normalizeName(stockName);
  
  // Try exact match after normalization
  for (const security of availableSecurities) {
    if (normalizeName(security) === normalizedStockName) {
      return security;
    }
  }
  
  // Try case-insensitive match
  for (const security of availableSecurities) {
    if (normalizeName(security).toLowerCase() === normalizedStockName.toLowerCase()) {
      return security;
    }
  }
  
  // Try partial match (contains)
  for (const security of availableSecurities) {
    const normalizedSecurity = normalizeName(security);
    if (normalizedSecurity.toLowerCase().includes(normalizedStockName.toLowerCase()) || 
        normalizedStockName.toLowerCase().includes(normalizedSecurity.toLowerCase())) {
      return security;
    }
  }
  
  // Try reverse partial match with common abbreviations
  const abbreviations: [string, string][] = [
    ['LIMITED', 'LTD'],
    ['COMPANY', 'CO'],
    ['SERVICES', 'SERV'],
    ['INDUSTRIES', 'IND'],
    ['ASSET MANAGEMENT', 'AMC']
  ];
  
  for (const [full, abbr] of abbreviations) {
    const modifiedStockName = normalizedStockName.replace(new RegExp(full, 'gi'), abbr);
    for (const security of availableSecurities) {
      const normalizedSecurity = normalizeName(security);
      if (normalizedSecurity.toLowerCase().includes(modifiedStockName.toLowerCase()) || 
          modifiedStockName.toLowerCase().includes(normalizedSecurity.toLowerCase())) {
        return security;
      }
    }
  }
  
  return null;
}

test('Update tracking file with today\'s prices from today_price.csv', async ({ page }) => {
  console.log('🚀 Starting stock price update process...');
  console.log('📅 Current Date:', new Date().toLocaleString());
  
  // Define paths
  const mainFolder = path.join(
    'C:',
    'Users',
    'Administrator',
    'OneDrive',
    'Swing Trading',
    'tracking'
  );
  
  const todayPriceFilePath = path.join(
    'C:',
    'Users',
    'Administrator',
    'OneDrive',
    'Swing Trading',
    'today_price.csv'
  );
  
  const trackFilePath = path.join(mainFolder, 'track.txt');
  
  console.log(`📁 Main folder: ${mainFolder}`);
  console.log(`📁 Today's price file: ${todayPriceFilePath}`);
  console.log(`📁 Track file: ${trackFilePath}`);
  
  // Check if today_price.csv exists
  if (!fs.existsSync(todayPriceFilePath)) {
    console.log('❌ ERROR: today_price.csv not found. Please ensure the file exists in the main Swing Trading folder.');
    console.log(`❌ Path checked: ${todayPriceFilePath}`);
    return;
  } else {
    console.log('✅ today_price.csv found');
  }
  
  // Check if track.txt exists
  if (!fs.existsSync(trackFilePath)) {
    console.log('❌ ERROR: track.txt not found. Please run the stock tracking test first to create this file.');
    console.log(`❌ Path checked: ${trackFilePath}`);
    return;
  } else {
    console.log('✅ track.txt found');
  }

  // Read today_price.csv
  let todayPriceData: TodayPriceRecord[] = [];
  try {
    // Read and parse CSV manually
    const csvContent = fs.readFileSync(todayPriceFilePath, 'utf-8');
    const lines = csvContent.split('\n');
    
    if (lines.length < 2) {
      console.log('❌ ERROR: today_price.csv is empty or has no data');
      return;
    }
    
    // Get header row
    const headers = lines[0].split(',').map(h => h.trim());
    console.log(`📊 CSV Headers: [${headers.join(', ')}]`);
    
    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      const values = line.split(',').map(v => v.trim());
      
      // Create record object based on headers
      const record: any = {};
      for (let j = 0; j < headers.length; j++) {
        record[headers[j]] = values[j] || '';
      }
      
      todayPriceData.push({
        GAIN_LOSS: record['GAIN_LOSS'] || '',
        SECURITY: record['SECURITY'] || '',
        CLOSE_PRIC: record['CLOSE_PRIC'] || '',
        PREV_CL_PR: record['PREV_CL_PR'] || '',
        PERCENT_CG: record['PERCENT_CG'] || ''
      });
    }
    
    console.log(`📊 Successfully loaded ${todayPriceData.length} records from today_price.csv`);
    console.log(`📊 First 3 securities in CSV:`, todayPriceData.slice(0, 3).map(r => r.SECURITY));
  } catch (error) {
    console.log('❌ ERROR reading today_price.csv:', error);
    return;
  }

  // Create a map of security names to their close prices for faster lookup
  const priceMap = new Map<string, number>();
  let validPriceRecords = 0;
  let invalidPriceRecords = 0;
  
  for (const row of todayPriceData) {
    const security = row.SECURITY.trim();
    const closePrice = parseFloat(row.CLOSE_PRIC);
    
    if (security && !isNaN(closePrice)) {
      priceMap.set(security, closePrice);
      validPriceRecords++;
    } else {
      invalidPriceRecords++;
    }
  }

  console.log(`📊 Price map created with ${priceMap.size} unique securities (${validPriceRecords} valid, ${invalidPriceRecords} invalid records)`);
  
  // Read existing track.txt data
  let trackRecords: TrackRecord[] = [];
  try {
    const fileContent = fs.readFileSync(trackFilePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // Skip header and separator line if they exist
    let dataLines = lines;
    if (lines.length > 0 && lines[0].includes('Stock Name')) {
      dataLines = lines.slice(2); // Skip header and separator
      console.log('📊 Detected header and separator in track.txt, skipping first 2 lines');
    }
    
    for (const line of dataLines) {
      const parts = line.split('\t').map(part => part.trim());
      if (parts.length >= 6) {
        const record: TrackRecord = {
          stockName: parts[0],
          firstDate: parts[1],
          initialPrice: parseFloat(parts[2]),
          lastDate: parts[3],
          currentPrice: parseFloat(parts[4]),
          percentageDiff: parseFloat(parts[5].replace('%', ''))
        };
        trackRecords.push(record);
      }
    }
    
    console.log(`📊 Successfully loaded ${trackRecords.length} records from track.txt`);
    console.log(`📊 First 3 stocks in track.txt:`, trackRecords.slice(0, 3).map(r => r.stockName));
  } catch (error) {
    console.log('❌ ERROR reading track.txt:', error);
    return;
  }

  // Show some examples from each file to help debug
  console.log('\n🔍 Sample data comparison:');
  console.log('  CSV Securities (first 5):', Array.from(priceMap.keys()).slice(0, 5));
  console.log('  Track Stocks (first 5):', trackRecords.slice(0, 5).map(r => r.stockName));

  // Track which stocks were updated and which weren't
  const updatedStocks: string[] = [];
  const notUpdatedStocks: string[] = [];
  const matchTypes: { [key: string]: string } = {}; // Track how each match was found

  // Update track records with today's prices
  let updatedCount = 0;
  let noMatchCount = 0;
  
  console.log('\n🔄 Starting update process...');
  
  for (let i = 0; i < trackRecords.length; i++) {
    const record = trackRecords[i];
    console.log(`  Processing: ${record.stockName} (Record ${i + 1}/${trackRecords.length})`);
    
    // Find the best match for this stock name
    const matchedSecurity = findBestMatch(record.stockName, Array.from(priceMap.keys()));
    
    if (matchedSecurity && priceMap.has(matchedSecurity)) {
      const todayPrice = priceMap.get(matchedSecurity)!;
      
      // Update current price
      const oldPrice = record.currentPrice;
      record.currentPrice = todayPrice;
      
      // Calculate percentage difference
      if (record.initialPrice > 0) {
        const percentageDiff = ((todayPrice - record.initialPrice) / record.initialPrice) * 100;
        record.percentageDiff = parseFloat(percentageDiff.toFixed(2));
      } else {
        record.percentageDiff = 0;
      }
      
      // Update last date to today's date
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      const oldDate = record.lastDate;
      record.lastDate = `${dd}-${mm}-${yyyy}`;
      
      updatedCount++;
      
      // Determine match type
      let matchType = 'partial';
      if (nameMappings[record.stockName] === matchedSecurity) {
        matchType = 'mapping';
      } else if (normalizeName(matchedSecurity) === normalizeName(record.stockName)) {
        matchType = 'normalized';
      } else if (normalizeName(matchedSecurity).toLowerCase() === normalizeName(record.stockName).toLowerCase()) {
        matchType = 'case-insensitive';
      }
      
      matchTypes[record.stockName] = matchType;
      
      console.log(`    📈 Updated: ${record.stockName}`);
      console.log(`    🎯 Matched with: ${matchedSecurity} (${matchType} match)`);
      console.log(`    💰 Price: ${oldPrice.toFixed(2)} → ${todayPrice.toFixed(2)} (${(todayPrice - oldPrice).toFixed(2)})`);
      console.log(`    📊 % Change: ${record.percentageDiff.toFixed(2)}%`);
      console.log(`    📅 Date: ${oldDate} → ${record.lastDate}`);
      
      updatedStocks.push(record.stockName);
    } else {
      noMatchCount++;
      notUpdatedStocks.push(record.stockName);
      console.log(`    ❌ No match found: ${record.stockName}`);
    }
  }

  // Show detailed summary
  console.log('\n📊 DETAILED SUMMARY:');
  console.log(`  Total records processed: ${trackRecords.length}`);
  console.log(`  Successfully updated: ${updatedCount}`);
  console.log(`  No match found: ${noMatchCount}`);
  console.log(`  Success rate: ${((updatedCount / trackRecords.length) * 100).toFixed(2)}%`);
  
  if (updatedStocks.length > 0) {
    console.log('\n📈 UPDATED STOCKS:');
    const matchTypeCounts: { [key: string]: number } = {};
    for (const [stock, type] of Object.entries(matchTypes)) {
      matchTypeCounts[type] = (matchTypeCounts[type] || 0) + 1;
      console.log(`  • ${stock} (${type} match)`);
    }
    
    console.log('\n🎯 MATCH TYPE BREAKDOWN:');
    for (const [type, count] of Object.entries(matchTypeCounts)) {
      console.log(`  ${type}: ${count} stocks`);
    }
  }

  if (notUpdatedStocks.length > 0) {
    console.log(`\n⚠️  STOCKS NOT UPDATED (${notUpdatedStocks.length}):`);
    notUpdatedStocks.forEach(stock => console.log(`  • ${stock}`));
  } else {
    console.log('\n✅ All stocks were successfully updated!');
  }

  // Write updated data back to track.txt with proper formatting
  try {
    // Create header with proper formatting
    const header = `Stock Name                \tFirst Date  \tInit Price\tLast Date   \tCurr Price\t% Diff\n`;
    const separator = '='.repeat(105) + '\n';

    // Write updated tracking data back to file with headers and better formatting
    const fileContent = header + separator + trackRecords.map(record => {
      // Format with fixed-width columns for better readability
      const formattedStockName = record.stockName.padEnd(25);
      const formattedFirstDate = record.firstDate.padEnd(10);
      const formattedInitialPrice = record.initialPrice.toFixed(2).padStart(9);
      const formattedLastDate = record.lastDate.padEnd(10);
      const formattedCurrentPrice = record.currentPrice.toFixed(2).padStart(9);
      const formattedPercentage = record.percentageDiff.toFixed(2).padStart(7) + '%';
      
      return `${formattedStockName}\t${formattedFirstDate}\t${formattedInitialPrice}\t${formattedLastDate}\t${formattedCurrentPrice}\t${formattedPercentage}`;
    }).join('\n');

    fs.writeFileSync(trackFilePath, fileContent, 'utf-8');
    
    console.log(`\n💾 File updated successfully: ${trackFilePath}`);
    console.log(`📊 Total tracked stocks: ${trackRecords.length}`);
    console.log(`📈 Stocks updated: ${updatedCount}`);
    console.log(`📅 Last updated: ${new Date().toLocaleString()}`);
    
  } catch (error) {
    console.log('❌ ERROR writing to track.txt:', error);
  }
  
  console.log('\n✅ Process completed successfully!');
});