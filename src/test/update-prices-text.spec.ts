import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

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

// Function to create name mapping for common variations
function createNameMapping(): Map<string, string> {
  const mapping = new Map<string, string>();
  
  // Add common name variations
  mapping.set('Nippon Life AMC', 'NIPPON L I A M LTD');
  mapping.set('Ibull Housing Fin', 'IBULLS HOUSING FINANCE LTD');
  mapping.set('Au Small Fin Bank', 'AU SMALL FINANCE BANK LTD');
  mapping.set('Bajaj Finserv', 'BAJAJ FINSERV LTD.');
  mapping.set('Bajaj Finance', 'BAJAJ FINANCE LIMITED');
  mapping.set('Ceat', 'CEAT LIMITED');
  mapping.set('Radico Khaitan', 'RADICO KHAITAN LTD');
  mapping.set('Cipla', 'CIPLA LTD');
  mapping.set('Karur Vysya Bank', 'KARUR VYSYA BANK LTD');
  mapping.set('Aster DM Health', 'ASTER DM HEALTHCARE LTD.');
  mapping.set('JK Tyre', 'JK TYRE & INDUSTRIES LTD');
  mapping.set('Bank of India', 'BANK OF INDIA');
  mapping.set('Hindalco', 'HINDALCO INDUSTRIES LTD');
  mapping.set('Indian Bank', 'INDIAN BANK');
  mapping.set('Bharti Airtel', 'BHARTI AIRTEL LIMITED');
  mapping.set('PayTM', 'ONE 97 COMMUNICATIONS LTD');
  mapping.set('SBI', 'STATE BANK OF INDIA'); // or could map to SBI Life Insurance
  mapping.set('L&T', 'LARSEN & TOUBRO LTD'); // or could map to L&T Finance
  mapping.set('HDFC Bank', 'HDFC BANK LTD');
  mapping.set('Axis Bank', 'AXIS BANK LIMITED');
  mapping.set('ICICI Bank', 'ICICI BANK LTD');
  mapping.set('Reliance', 'RELIANCE INDUSTRIES LTD');
  mapping.set('TCS', 'TATA CONSULTANCY SERV LTD');
  mapping.set('Infosys', 'INFOSYS LIMITED');
  mapping.set('Wipro', 'WIPRO LIMITED');
  mapping.set('HCL Tech', 'HCL TECHNOLOGIES LTD');
  mapping.set('Titan Company', 'TITAN COMPANY LIMITED');
  mapping.set('Maruti Suzuki', 'MARUTI SUZUKI INDIA LTD.');
  mapping.set('Hero MotoCorp', 'HERO MOTOCORP LIMITED');
  mapping.set('Tata Consumer', 'TATA CONSUMER PRODUCT LTD');
  mapping.set('TVS Motor', 'TVS MOTOR COMPANY LTD');
  mapping.set('Apollo Hospital', 'APOLLO HOSPITALS ENTER. L');
  mapping.set('Federal Bank', 'FEDERAL BANK LTD');
  mapping.set('City Union Bank', 'CITY UNION BANK LTD');
  mapping.set('IDFC First Bank', 'IDFC FIRST BANK LIMITED');
  mapping.set('PNB', 'PUNJAB NATIONAL BANK');
  mapping.set('Shriram Finance', 'SHRIRAM FINANCE LIMITED');
  mapping.set('Ibull Housing Fin','SAMMAAN CAPITAL LIMITED');
  mapping.set('Hindalco','HINDALCO  INDUSTRIES  LTD');
  mapping.set('Aditya Birla Cap.','ADITYA BIRLA CAPITAL LTD.');
  mapping.set('L&T','LARSEN & TOUBRO LTD.');
  mapping.set('Grasim Inds.','GRASIM INDUSTRIES LTD');
  mapping.set('TVS Motor','TVS MOTOR COMPANY  LTD');
  mapping.set('SCI','SHIPPING CORP OF INDIA LT');
  //  mapping.set('from the track file','from today_price.csv');
  //mapping.set('','');

  return mapping;
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
  const mapping = createNameMapping();
  
  // First, check if there's a direct mapping
  if (mapping.has(stockName)) {
    return mapping.get(stockName) || null;
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
  console.log('🚀 Updating tracking file with today\'s prices...');
  
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
  
  // Check if today_price.csv exists
  if (!fs.existsSync(todayPriceFilePath)) {
    console.log('❌ today_price.csv not found. Please ensure the file exists in the main Swing Trading folder.');
    return;
  }
  
  // Check if track.txt exists
  if (!fs.existsSync(trackFilePath)) {
    console.log('❌ track.txt not found. Please run the stock tracking test first to create this file.');
    return;
  }

  // Read today_price.csv
  let todayPriceData: TodayPriceRecord[] = [];
  try {
    // Read and parse CSV manually
    const csvContent = fs.readFileSync(todayPriceFilePath, 'utf-8');
    const lines = csvContent.split('\n');
    
    if (lines.length < 2) {
      console.log('❌ today_price.csv is empty or has no data');
      return;
    }
    
    // Get header row
    const headers = lines[0].split(',').map(h => h.trim());
    
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
    
    console.log(`📊 Found ${todayPriceData.length} records in today_price.csv`);
  } catch (error) {
    console.log('Error reading today_price.csv:', error);
    return;
  }

  // Create a map of security names to their close prices for faster lookup
  const priceMap = new Map<string, number>();
  for (const row of todayPriceData) {
    const security = row.SECURITY.trim();
    const closePrice = parseFloat(row.CLOSE_PRIC);
    
    if (security && !isNaN(closePrice)) {
      priceMap.set(security, closePrice);
    }
  }

  // Read existing track.txt data
  let trackRecords: TrackRecord[] = [];
  try {
    const fileContent = fs.readFileSync(trackFilePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim() !== '');
    
    // Skip header and separator line if they exist
    let dataLines = lines;
    if (lines.length > 0 && lines[0].includes('Stock Name')) {
      dataLines = lines.slice(2); // Skip header and separator
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
    
    console.log(`📊 Found ${trackRecords.length} records in track.txt`);
  } catch (error) {
    console.log('Error reading track.txt:', error);
    return;
  }

  console.log(`📊 Created price map with ${priceMap.size} unique securities`);
  
  // Show some examples from each file to help debug
  console.log('🔍 First few securities in today_price.csv:', Array.from(priceMap.keys()).slice(0, 5));
  console.log('🔍 First few stocks in track.txt:', trackRecords.slice(0, 5).map(r => r.stockName));

  // Track which stocks were updated and which weren't
  const updatedStocks: string[] = [];
  const notUpdatedStocks: string[] = [];

  // Update track records with today's prices
  let updatedCount = 0;
  for (let i = 0; i < trackRecords.length; i++) {
    const record = trackRecords[i];
    
    // Find the best match for this stock name
    const matchedSecurity = findBestMatch(record.stockName, Array.from(priceMap.keys()));
    
    if (matchedSecurity && priceMap.has(matchedSecurity)) {
      const todayPrice = priceMap.get(matchedSecurity)!;
      
      // Update current price
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
      record.lastDate = `${dd}-${mm}-${yyyy}`;
      
      updatedCount++;
      console.log(`📈 Updated ${record.stockName} (matched with: ${matchedSecurity}): Current Price: ${todayPrice}, % Diff: ${record.percentageDiff}%`);
      updatedStocks.push(record.stockName);
    } else {
      notUpdatedStocks.push(record.stockName);
      console.log(`❌ No match found for: ${record.stockName}`);
    }
  }

  // Show which stocks were not updated
  if (notUpdatedStocks.length > 0) {
    console.log(`⚠️  Stocks that were NOT updated (${notUpdatedStocks.length}):`, notUpdatedStocks);
  } else {
    console.log('✅ All stocks were successfully updated!');
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
    
    console.log(`💾 Successfully updated ${updatedCount} records in ${trackFilePath}`);
    console.log(`📊 Total tracked stocks: ${trackRecords.length}`);
  } catch (error) {
    console.log('Error writing to track.txt:', error);
  }
});